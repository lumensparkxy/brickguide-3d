# Local batch engine

The private Python engine runs source indexing and fresh Codex CLI proposals. It never loads authored
reference scenes. Only official page images, its own earlier proposal checkpoints and verified individual
part geometry are supplied as assembly/geometry inputs. It is separate from the public portal API.

## Run

Use the existing project virtual environment (or `uv run --extra dev`). Codex must be installed and
`codex login status` must report ChatGPT authentication. No paid provider API fallback exists.

```sh
.venv/bin/python tools/engine.py enqueue --all --revision campaign-1
.venv/bin/python tools/engine.py run --max-jobs 1
.venv/bin/python tools/engine.py status
.venv/bin/python tools/engine.py report
.venv/bin/python tools/engine.py watch
.venv/bin/python tools/engine.py watch --sync-cloud --project lumensparkxy
.venv/bin/python tools/engine.py cancel JOB_ID
.venv/bin/python tools/engine.py retry JOB_ID
.venv/bin/python tools/engine.py retry JOB_ID --reset-candidate
.venv/bin/python tools/engine.py resume --provider
.venv/bin/python tools/engine.py resume JOB_ID
```

`enqueue --all` installs a campaign gate: only 30669/alt-02 runs until a validated pilot has been packaged.
Other jobs remain queued, not falsely tested. Explicit `--set NUMBER --guide ID` supports individual jobs.
`--revision` creates a distinct experiment; repeated identical requests deduplicate. Source receipts,
model, pipeline version, part-cache revision and experiment identity are included in CLI fingerprints.

Watch runs only while the computer/process is active. SQLite (`var/engine/jobs.sqlite3`) provides durable
checkpoints, one globally leased job, fencing and crash recovery after a 120-second lease. A heartbeat
renews every five seconds. The optional cloud sync runs independently every 300 seconds even during a
long job. It uses uploader impersonation and the dedicated `guide2build-requests` database, filters eligible
requests and leases them transactionally. Unknown sets become `source_discovery_required`, never a guessed URL.
Authentication is optional for local-only commands. Cloud errors do not erase or stop local work.

Each model call has a five-minute deadline, a 20 MB result limit and 32 MB event-log bounds. Invalid proposals
get up to three attempts per unit; explicit retry retains earlier attempts. Authentication, quota and unavailable
provider failures pause inference globally until `resume --provider`; no credits are purchased automatically.
Subscription reset times are not guessed. Model subprocesses use a temporary non-repository cwd, read-only
sandbox, forced ChatGPT auth, disabled model tools/plugins/hooks/browser/memory and an environment allowlist
that excludes API keys, cloud credentials and parent-agent state. The CLI itself retains access to its normal
ChatGPT authentication mechanism. Do not use `danger-full-access` to work around an inference failure.

## Evidence and completion gates

Each job directory retains source receipts, page indexes, prompts, raw JSONL events, structured responses,
invocation durations/CLI-reported usage, proposals, rejected candidates and geometry provenance. Token counts
are reported only when the CLI actually returns them. Subscription monetary cost is not inferred from tokens.
Automatic source indexing remains `automatic_unverified`; matching a known 12-step count is not proof of every
substep or a complete reconstruction. A page is not a step.

Proposals are append-only deltas: new sections, new physical instances and new snapshots with only new/moved
pose updates. The engine reconstructs unchanged poses and preserves historical snapshots deterministically.
Model context contains current physical IDs/poses, not full snapshot history. Source indexing sends only the
previous page and section names; rendered review sends only page-local changes. Current-state context is capped
at 400 KB and total prompts at 1 MB. Assemblies beyond that need spatial partitioning; the largest sets have
not been validated and are not silently sent as unbounded full-history prompts.

Fresh snapshots are bound to the requested source page and printed main step, use stable physical IDs and
cannot rewrite earlier checkpointed snapshots. Rivendell books 2/3 require a validated staged predecessor and
carry forward its sources, sections and physical IDs; they do not start as unrelated models. Other alternate
builds/car booklets remain independent. Missing or blocked predecessors block continuation explicitly.

Individual geometry downloads use the existing allowlisted resolver into a per-job cache; shared portal assets
are not overwritten. Dependency hashes and actual geometry existence do not prove placement or connections.
Current resolver bounds can still block large/unsupported part closures; such failures remain visible.

```sh
.venv/bin/python tools/engine.py render JOB_ID --output var/evidence/NEW_RENDER_DIRECTORY
.venv/bin/python tools/engine.py validate JOB_ID --bundle var/evidence/INDEPENDENT_VALIDATION
.venv/bin/python tools/engine.py package JOB_ID --output var/releases/NEW_RELEASE_DIRECTORY
```

`render` calls the actual loopback Three.js renderer and verifies its scene and PNG hashes. Complete candidates
also render before independent model review receives original pages **and** actual model images. GPU values
from SwiftShader are software-renderer measurements, not native-M3 GPU benchmarks. Renderer failures cannot
qualify as review passes.

`validate` imports `validation-bundle.json`, whose strict schema is defined by `engine.validation.ValidationBundle`:

- `candidate_sha256`: canonical hash of the exact untouched SceneV2 proposal.
- `source_index`: independently verified source hashes and expected section/step keys, in the release packager's
  format; it must agree with the trusted source registry and candidate coverage.
- `connector_report`: matching scene hash, named/versioned deterministic checker, pass/fail/unsupported,
  supported physical IDs and hash-verified evidence files. Every physical instance must be supported.
- `assembly_report`: matching scene hash, named agent reviewer, source/render comparison report (no unverified camera-matching claim),
  actual render report file and one passing source-page/render-image comparison for every microstep.

Relative evidence files are root-confined, byte-bounded and hash checked. Compared source-page hashes must
match the locally retained official rasters. Source PDF receipts and the entire geometry closure are verified
again. Browser reports must match an engine-recorded render receipt. Human actor labels are rejected here;
authenticated tutorial publication approval remains a separate operation.

**Current deterministic-checker gate:** the closed registry has no general assembly checker. The legacy
authored first-four-step helper cannot certify complete automatic scenes and is deliberately not registered.
Validation rejects unsupported checker IDs and reruns registered code; caller-provided pass flags and arbitrary
evidence files can never grant geometry/connector success. Implementing and independently testing a general
checker remains required before the pilot or any other full tutorial can pass this gate.

Successful import writes a separate `validated-scene.json` (only deterministic check flags differ), release
validation and an immutable-by-hash validation receipt. The raw candidate remains unchanged. Packaging checks
that the candidate, bundle and evidence have not changed, then delegates to the fail-closed release packager.
Only successful packaging marks `awaiting_approval` and unlocks the campaign. It does not upload, approve or
publish anything. The engine has no publisher authority.

This interface supports a real validation handoff; it does not manufacture a general connector checker.
Unsupported connectors, missing independent coverage or missing matched render review remain blockers until
appropriate independent evidence is produced. JSON-only model critique cannot certify a release.

## Recorded implementation experiment (2026-10-03)

19 catalogue jobs were enqueued. Only the 30669/alt-02 pilot ran; the other 18 are gated/queued.
Real subscription-authenticated structured image calls succeeded after an outer sandbox restriction and strict
schema issue were diagnosed. The pilot indexed all eight pages and identified main instructions 1–12.
An initial construction call refused uncertain curved-part identity. Supplying verified individual-part geometry
allowed a three-piece step-1 proposal; step 2 then reported uncertain heights/rotations. Independent inspection
caught an in-range but wrong source-page reference in step 1. That candidate was quarantined, not silently fixed,
and the exact-panel guard was added before a bounded retry. See current `engine.py report` and the job directory
for the retry's final state. This experiment does not establish a complete tutorial or assembly correctness.

The old partial screenshot in `var/evidence/engine-pilot-render` binds the quarantined candidate hash and must
not be used as validation of a later revision. No human review, physical build or tutorial publication occurred.

Final bounded pilot retry: 2 of 12 main steps / 2 microsteps / 5 physical parts retained, both bound to the
correct official page. Step 3 stopped on the model's unresolved 25269 corner-round tile rotation. The delta
adapter's real structured call also returned that explicit blocker; it did not invent an attachment.
`var/evidence/engine-pilot-benchmark.json` records 16 model calls and 781.253 seconds of active model-call time
across indexing, failed proposals and development retries (332,807 input / 17,989 output tokens reported by
CLI, with reasoning tokens reported separately). This is a development experiment, not end-to-end completed-set
latency or a basis for extrapolating 100-page completion time. Monetary subscription usage is not reported.

The valid partial candidate has canonical hash `bafb5402e76e8a18e67a8986c71a1655d866fa6756a0345ba515d28032b2a2a7`.
Actual screenshots for both steps and rendering counters are retained under
`var/evidence/engine-candidate-render-bafb5402e76e8a18e67a8986c71a1655d866fa6756a0345ba515d28032b2a2a7/`.
They were visually inspected against the official page, but no connector or completed-assembly pass was granted.
The browser reported SwiftShader and no GPU timer support; native GPU benchmark status remains `not_run`.
