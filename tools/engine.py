"""Local batch engine entrypoint. No cloud identity or publication authority is required."""
import argparse
import hashlib
import json
import time
from pathlib import Path
from _paths import ROOT
from guide2build.catalog import find_guide
from guide2build.engine.store import EngineStore, PIPELINE
from guide2build.engine.runner import run_once
from guide2build.jobs.source_cache import cached_receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "var")
    commands = parser.add_subparsers(dest="command", required=True)
    enqueue = commands.add_parser("enqueue")
    enqueue.add_argument("--all", action="store_true", help="Enqueue all 19 curated booklets")
    enqueue.add_argument("--set", dest="set_number")
    enqueue.add_argument("--guide")
    enqueue.add_argument("--model", default="gpt-6-astra")
    enqueue.add_argument("--revision", default="1", help="Explicit new experiment identity; never overwrites old jobs")
    for command in ("run", "watch"):
        worker = commands.add_parser(command)
        worker.add_argument("--sync-cloud", action="store_true", help="Sync requests every 300s using uploader identity")
        worker.add_argument("--project", default="lumensparkxy")
        worker.add_argument("--max-jobs", type=int, default=1 if command == "run" else 0,
                            help="0 drains queue; watch then polls until interrupted")
        worker.add_argument("--poll-seconds", type=int, default=30)
    for command in ("status", "report"):
        commands.add_parser(command)
    for command in ("retry", "cancel"):
        action = commands.add_parser(command)
        action.add_argument("job_id")
        if command == "retry":
            action.add_argument("--reset-candidate", action="store_true", help="Quarantine invalid candidate; preserve raw calls and source index")
    resume = commands.add_parser("resume")
    resume.add_argument("job_id", nargs="?")
    resume.add_argument("--provider", action="store_true", help="Clear global pause after authentication/quota recovery")
    render = commands.add_parser("render")
    render.add_argument("job_id")
    render.add_argument("--output", type=Path, required=True)
    validate = commands.add_parser("validate")
    validate.add_argument("job_id")
    validate.add_argument("--bundle", type=Path, required=True)
    package = commands.add_parser("package")
    package.add_argument("job_id")
    package.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    store = EngineStore(args.data_dir)
    if args.command == "enqueue":
        if args.all:
            store.gate_campaign()
            if args.set_number or args.guide:
                parser.error("--all cannot be combined with --set or --guide")
            catalogue = json.loads((ROOT / "config/sets.json").read_text())
            pairs = [(s["set_number"], g["guide_id"]) for s in catalogue["sets"] for g in s["guides"]]
        elif args.set_number and args.guide:
            pairs = [(args.set_number, args.guide)]
        else:
            parser.error("Provide --all or both --set and --guide")
        result = []
        provenance = store.data_dir / "public/ldraw/provenance.json"
        library = hashlib.sha256(provenance.read_bytes()).hexdigest() if provenance.is_file() else "missing"
        for set_number, guide_id in pairs:
            guide = find_guide(set_number, guide_id)
            receipt = cached_receipt(store.data_dir, set_number, guide_id, guide["pdf_url"])
            job = store.enqueue(set_number, guide_id, {"model": args.model, "reasoning": "high",
                "revision": args.revision, "pipeline": PIPELINE, "parts_revision": library,
                "source_sha256": receipt["sha256"] if receipt else None})
            result.append({key: job[key] for key in ("id", "set_number", "guide_id", "state")})
        print(json.dumps(result, indent=2))
    elif args.command in {"run", "watch"}:
        if args.max_jobs < 0 or not 1 <= args.poll_seconds <= 300:
            parser.error("Use nonnegative --max-jobs and --poll-seconds between 1 and 300")
        completed = 0
        sync_loop = None
        if args.sync_cloud:
            from guide2build.engine.cloud_sync import RequestSyncLoop
            sync_loop = RequestSyncLoop(store, {"model": "gpt-6-astra", "revision": "cloud-request-v1"},
                                        args.project, lambda value: print(json.dumps(value), flush=True))
            sync_loop.start()
        try:
            while True:
                if run_once(store):
                    completed += 1
                    print(json.dumps({"processed_jobs": completed}), flush=True)
                    if args.max_jobs and completed >= args.max_jobs:
                        break
                elif args.command == "run" or store.provider_pause():
                    break
                else:
                    time.sleep(args.poll_seconds)
        except KeyboardInterrupt:
            print("Stopped; leased jobs recover automatically after lease expiry.")
        finally:
            if sync_loop:
                sync_loop.close()
        print(json.dumps({"provider_pause": store.provider_pause(), "processed_jobs": completed}))
    elif args.command in {"status", "report"}:
        jobs = store.list()
        result = {"pipeline": PIPELINE, "provider_pause": store.provider_pause(), "jobs": []}
        for job in jobs:
            cp = job["checkpoint"]
            from guide2build.engine.reporting import summarize_calls
            metrics = summarize_calls(store.root / "jobs" / job["id"] / "calls")
            result["jobs"].append({key: job[key] for key in ("id", "set_number", "guide_id", "state", "error")}
                | {"stage": cp.get("stage"), "source_sha256": cp.get("source_sha256"),
                   **metrics, "subscription_cost": "not_reported_by_cli",
                   "indexed_pages": len(cp.get("page_indexes", [])), "page_count": cp.get("page_count"),
                   "completed_panels": cp.get("completed_panels", 0), "total_panels": cp.get("total_panels"),
                   "evidence": str(store.root / "jobs" / job["id"]), "human_review": "not_run",
                   "physical_build": "not_run", "published": False})
        print(json.dumps(result, indent=2))
    elif args.command == "cancel":
        store.cancel(args.job_id)
        print(json.dumps({"job_id": args.job_id, "cancel_requested": True}))
    elif args.command in {"retry", "resume"}:
        if args.command == "resume" and args.provider:
            store.resume_provider()
        if args.job_id:
            if args.command == "retry" and args.reset_candidate:
                store.reset_candidate(args.job_id)
            store.retry(args.job_id)
        elif not args.provider:
            parser.error("Provide a job ID or --provider")
        print(json.dumps({"job_id": args.job_id, "provider_pause": store.provider_pause()}))
    elif args.command == "render":
        from guide2build.engine.rendering import render_candidate
        job = store.get(args.job_id)
        directory = store.root / "jobs" / job["id"]
        report = render_candidate(directory / "scene.json", directory / "geometry", args.output)
        store.record_render(job["id"], args.output, report)
        print(json.dumps(report, indent=2))
    elif args.command == "validate":
        from guide2build.engine.validation import import_validation
        print(json.dumps(import_validation(store, args.job_id, args.bundle), indent=2))
    elif args.command == "package":
        from guide2build.releases.models import SceneV2, ReleaseValidation
        from guide2build.releases.packaging import package_release
        job = store.get(args.job_id)
        directory = store.root / "jobs" / job["id"]
        scene = SceneV2.model_validate_json((directory / "validated-scene.json").read_text())
        validation = ReleaseValidation.model_validate_json((directory / "release-validation.json").read_text())
        imported = json.loads((directory / "validation-import.json").read_text())
        from guide2build.releases.models import digest
        raw = SceneV2.model_validate_json((directory / "scene.json").read_text())
        if digest(raw) != imported["raw_scene_sha256"]:
            raise ValueError("Raw candidate changed after independent validation")
        from guide2build.engine.validation import import_validation, ValidationBundle
        bundle_dir = Path(imported["bundle_directory"])
        bundle = ValidationBundle.model_validate_json((bundle_dir / "validation-bundle.json").read_text())
        if digest(bundle) != imported["validation_bundle_sha256"]:
            raise ValueError("Independent validation bundle changed after import")
        import_validation(store, job["id"], bundle_dir)
        scene = SceneV2.model_validate_json((directory / "validated-scene.json").read_text())
        validation = ReleaseValidation.model_validate_json((directory / "release-validation.json").read_text())
        manifest = package_release(scene, validation, directory / "geometry", args.output,
            preview=Path(imported["preview"]),
            source_index=json.loads((directory / "verified-source-index.json").read_text()))
        store.staged(job["id"], manifest)
        print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
