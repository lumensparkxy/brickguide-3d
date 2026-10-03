"""Durable, single-flight batch queue with fenced leases and resumable checkpoints."""
from __future__ import annotations
import hashlib
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

PIPELINE = "codex-source-context-v3"
TERMINAL = {"blocked", "failed", "cancelled", "awaiting_approval"}


class LeaseLost(RuntimeError):
    pass


class EngineStore:
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir).resolve()
        self.root = self.data_dir / "engine"
        self.root.mkdir(parents=True, exist_ok=True)
        self.db = self.root / "jobs.sqlite3"
        with self.connect() as con:
            con.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS engine_jobs (
                id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE,
                set_number TEXT NOT NULL, guide_id TEXT NOT NULL, config TEXT NOT NULL,
                state TEXT NOT NULL, checkpoint TEXT NOT NULL DEFAULT '{}',
                owner TEXT, lease_until REAL, cancel INTEGER NOT NULL DEFAULT 0,
                error TEXT, created REAL NOT NULL, updated REAL NOT NULL);
            CREATE INDEX IF NOT EXISTS engine_queue ON engine_jobs(state, created);
            CREATE TABLE IF NOT EXISTS engine_events (
                seq INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL,
                created REAL NOT NULL, event TEXT NOT NULL, detail TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS engine_control (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """)

    @contextmanager
    def connect(self):
        con = sqlite3.connect(self.db, timeout=10)
        con.row_factory = sqlite3.Row
        try:
            yield con
            con.commit()
        except BaseException:
            con.rollback()
            raise
        finally:
            con.close()

    @staticmethod
    def decode(row):
        value = dict(row)
        for key in ("config", "checkpoint", "error"):
            value[key] = json.loads(value[key]) if value[key] else None
        return value

    def event(self, con, job_id, event, detail):
        con.execute("INSERT INTO engine_events(job_id,created,event,detail) VALUES(?,?,?,?)",
                    (job_id, time.time(), event, json.dumps(detail)))

    def enqueue(self, set_number, guide_id, config):
        from ..catalog import find_guide
        guide = find_guide(set_number, guide_id)
        identity = {"set": set_number, "guide": guide_id, "url": guide["pdf_url"],
                    "pipeline": PIPELINE, "config": config}
        fingerprint = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            old = con.execute("SELECT * FROM engine_jobs WHERE fingerprint=?", (fingerprint,)).fetchone()
            if old:
                return self.decode(old)
            job_id = uuid.uuid4().hex
            now = time.time()
            con.execute("""INSERT INTO engine_jobs
                (id,fingerprint,set_number,guide_id,config,state,created,updated) VALUES(?,?,?,?,?,'queued',?,?)""",
                (job_id, fingerprint, set_number, guide_id, json.dumps(config), now, now))
            self.event(con, job_id, "queued", identity)
        return self.get(job_id)

    def get(self, job_id):
        with self.connect() as con:
            row = con.execute("SELECT * FROM engine_jobs WHERE id=?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(job_id)
        return self.decode(row)

    def list(self):
        with self.connect() as con:
            return [self.decode(row) for row in con.execute("SELECT * FROM engine_jobs ORDER BY created")]

    def claim(self, owner, seconds=120):
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            if con.execute("SELECT 1 FROM engine_control WHERE key='provider_pause'").fetchone():
                return None
            now = time.time()
            if con.execute("SELECT 1 FROM engine_jobs WHERE owner IS NOT NULL AND lease_until>?", (now,)).fetchone():
                return None  # one inference process globally, even across CLI workers
            rows = con.execute("""SELECT * FROM engine_jobs WHERE state='queued' OR
                (owner IS NOT NULL AND lease_until<=?) ORDER BY created""", (now,)).fetchall()
            gated = con.execute("SELECT 1 FROM engine_control WHERE key='pilot_gate'").fetchone()
            passed = con.execute("""SELECT 1 FROM engine_jobs WHERE set_number='30669' AND guide_id='alt-02'
                AND state='awaiting_approval'""").fetchone()
            row = next((row for row in rows if not gated or passed or
                        (row["set_number"] == "30669" and row["guide_id"] == "alt-02")), None)
            if not row:
                return None
            state = "cancelled" if row["cancel"] else "constructing"
            con.execute("UPDATE engine_jobs SET owner=?,lease_until=?,state=?,updated=? WHERE id=?",
                        (owner, now + seconds, state, now, row["id"]))
            self.event(con, row["id"], "claimed", {"owner": owner})
            job_id = row["id"]
        return self.get(job_id)

    def checkpoint(self, job_id, owner, checkpoint, state="constructing", error=None):
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT * FROM engine_jobs WHERE id=?", (job_id,)).fetchone()
            if not row or row["owner"] != owner or row["lease_until"] < time.time():
                raise LeaseLost(job_id)
            if row["cancel"]:
                state = "cancelled"
            terminal = state in TERMINAL
            con.execute("""UPDATE engine_jobs SET checkpoint=?,state=?,error=?,updated=?,owner=?,lease_until=?
                WHERE id=?""", (json.dumps(checkpoint), state, json.dumps(error) if error else None, time.time(),
                                None if terminal else owner, None if terminal else time.time()+120, job_id))
            self.event(con, job_id, state, {"stage": checkpoint.get("stage"), "error": error})
        if state == "cancelled":
            raise InterruptedError("Job cancelled")

    def heartbeat(self, job_id, owner):
        with self.connect() as con:
            updated = con.execute("""UPDATE engine_jobs SET lease_until=? WHERE id=? AND owner=?
                AND lease_until>? AND cancel=0""", (time.time()+120, job_id, owner, time.time()))
            if updated.rowcount != 1:
                raise LeaseLost(job_id)

    def cancel(self, job_id):
        self.get(job_id)
        with self.connect() as con:
            con.execute("""UPDATE engine_jobs SET cancel=1,state=CASE WHEN owner IS NULL THEN 'cancelled'
                ELSE state END,updated=? WHERE id=?""", (time.time(), job_id))
            self.event(con, job_id, "cancel_requested", {})

    def retry(self, job_id):
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT * FROM engine_jobs WHERE id=?", (job_id,)).fetchone()
            if not row:
                raise KeyError(job_id)
            if row["owner"] and row["lease_until"] > time.time():
                raise ValueError("Cannot retry an actively leased job")
            if row["state"] == "awaiting_approval":
                raise ValueError("A staged candidate needs review, not inference retry")
            con.execute("UPDATE engine_jobs SET state='queued',cancel=0,owner=NULL,lease_until=NULL,error=NULL WHERE id=?",
                        (job_id,))
            self.event(con, job_id, "resumed", {})

    def pause_provider(self, reason):
        with self.connect() as con:
            con.execute("INSERT OR REPLACE INTO engine_control(key,value) VALUES('provider_pause',?)",
                        (json.dumps(reason),))

    def resume_provider(self):
        with self.connect() as con:
            con.execute("DELETE FROM engine_control WHERE key='provider_pause'")

    def provider_pause(self):
        with self.connect() as con:
            row = con.execute("SELECT value FROM engine_control WHERE key='provider_pause'").fetchone()
            return json.loads(row[0]) if row else None

    def gate_campaign(self):
        with self.connect() as con:
            con.execute("INSERT OR REPLACE INTO engine_control(key,value) VALUES('pilot_gate','true')")

    def staged(self, job_id, manifest):
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT * FROM engine_jobs WHERE id=?", (job_id,)).fetchone()
            if not row or (row["owner"] and row["lease_until"] > time.time()):
                raise ValueError("Cannot stage unknown or actively leased job")
            from ..releases.packaging import verify_manifest
            verify_manifest(manifest)
            if manifest["set_number"] != row["set_number"] or manifest["guide_id"] != row["guide_id"]:
                raise ValueError("Staged manifest identity does not match the queued job")
            checkpoint = json.loads(row["checkpoint"])
            if manifest["source_sha256"] != checkpoint.get("candidate", {}).get("source_sha256"):
                raise ValueError("Staged manifest does not bind the job source")
            checkpoint["staged_manifest"] = manifest
            con.execute("UPDATE engine_jobs SET state='awaiting_approval',checkpoint=?,error=NULL WHERE id=?",
                        (json.dumps(checkpoint), job_id))
            self.event(con, job_id, "awaiting_approval", {"publication": "not_performed"})
            if row["set_number"] == "10316" and row["guide_id"] in {"booklet-01", "booklet-02"}:
                successor = "booklet-02" if row["guide_id"] == "booklet-01" else "booklet-03"
                revision = json.loads(row["config"]).get("revision")
                for waiting in con.execute("SELECT * FROM engine_jobs WHERE set_number='10316' AND guide_id=? AND state='blocked'", (successor,)).fetchall():
                    error = json.loads(waiting["error"]) if waiting["error"] else {}
                    if error.get("code") == "prior_booklet_required" and json.loads(waiting["config"]).get("revision") == revision:
                        con.execute("UPDATE engine_jobs SET state='queued',error=NULL WHERE id=?", (waiting["id"],))
                        self.event(con, waiting["id"], "dependency_available", {"predecessor_job_id": job_id})

    def reset_candidate(self, job_id):
        """Reserve a maintenance transaction so a watcher cannot claim during file quarantine."""
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT * FROM engine_jobs WHERE id=?", (job_id,)).fetchone()
            if not row:
                raise KeyError(job_id)
            job = self.decode(row)
            if (job["owner"] and job["lease_until"] > time.time()) or job["state"] == "awaiting_approval":
                raise ValueError("Cannot reset an active or staged candidate; enqueue a new revision")
            directory = self.root / "jobs" / job_id
            quarantine = directory / "rejected" / uuid.uuid4().hex
            quarantine.mkdir(parents=True, exist_ok=True)
            for name in ("scene.json", "validated-scene.json", "release-validation.json", "validation-import.json"):
                source = directory / name
                if source.exists():
                    source.replace(quarantine / name)
            checkpoint = job["checkpoint"]
            for key in ("candidate", "completed_panels", "page_reviews", "staged_manifest", "render_directory",
                        "render_scene_sha256", "render_report_sha256"):
                checkpoint.pop(key, None)
            con.execute("UPDATE engine_jobs SET checkpoint=? WHERE id=?", (json.dumps(checkpoint), job_id))
            self.event(con, job_id, "candidate_quarantined", {"reason": "Explicit reset; retained raw evidence"})

    def record_render(self, job_id, output, report):
        from ..releases.models import SceneV2, digest
        directory = self.root / "jobs" / job_id
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT * FROM engine_jobs WHERE id=?", (job_id,)).fetchone()
            if not row or (row["owner"] and row["lease_until"] > time.time()):
                raise ValueError("Cannot attach external render to unknown or actively changing job")
            scene = SceneV2.model_validate_json((directory / "scene.json").read_text())
            if report["scene_sha256"] != digest(scene):
                raise ValueError("Candidate changed during rendering")
            checkpoint = json.loads(row["checkpoint"])
            checkpoint.update(render_directory=str(output.resolve()), render_scene_sha256=digest(scene),
                              render_report_sha256=hashlib.sha256((output / "report.json").read_bytes()).hexdigest())
            con.execute("UPDATE engine_jobs SET checkpoint=? WHERE id=?", (json.dumps(checkpoint), job_id))
            self.event(con, job_id, "render_recorded", {"scene_sha256": digest(scene)})
