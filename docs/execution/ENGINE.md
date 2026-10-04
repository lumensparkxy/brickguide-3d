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

Each model call defaults to a fifteen-minute deadline (900 seconds), a 20 MB result limit and 32 MB
event-log bounds. Alpha jobs retain explicit `provider_timeout` overrides; the actual deadline is recorded
in each call's `request-runtime.json`. Invalid proposals get up to three attempts per unit; explicit retry
retains earlier attempts. Authentication, quota and unavailable
provider failures pause inference globally until `resume --provider`; no credits are purchased automatically.
Subscription reset times are not guessed. Model subprocesses use a temporary non-repository cwd, read-only
sandbox, forced ChatGPT auth, disabled model tools/plugins/hooks/browser/memory and an environment allowlist
that excludes API keys, cloud credentials and parent-agent state. The CLI itself retains access to its normal
ChatGPT authentication mechanism. Do not use `danger-full-access` to work around an inference failure.

## Evidence and completion gates

### Guided one-instruction operation

After enqueueing a fresh experiment, run:

```sh
.venv/bin/python tools/engine.py step JOB_ID
```

The first call indexes the official booklet, then attempts at most one new main instruction,
including its substeps. Success saves the candidate and releases the lease in `paused` state;
ambiguity or provider failure records a blocker. Inspect the source and candidate before running
the same command for the next instruction. This is a candidate checkpoint, not validation or approval.
Ordinary `run`/`watch` do not select paused jobs. The targeted command never falls back to another job
and respects the global lease, provider pause and campaign gate. A blocked job still requires explicit
retry/resume after its cause is addressed. Calling `step` after construction is complete pauses with
`construction_complete_needs_validation`; it does not silently enter whole-booklet review.

Fresh guided 30669/alt-02 job `4623deafb567466e8b1f97bb512881c0` was verified queued with an empty
checkpoint on 2026-10-03. No inference was started while adding this control. Synthetic tests verify
indexing, one-instruction boundaries, checkpoint preservation and job selection; they do not establish
official reconstruction accuracy.

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

### Context repair during requested resume

`codex-source-context-v3` retains the append-only contract and adds verified Subpart definitions to the individual-part context, within the existing byte budget. This repairs wrapper-only parts such as25269, whose shape is defined in `parts/s/25269s01.dat`. Definitions retain their hashes, depth/count limits and explicit truncation flags. No assembly coordinates or authored reference are loaded.

At a page boundary, construction receives the target official page first and the preceding instruction page second. The preceding page supplies orientation context only; new instance/step source references must still match the exact target page. These additions are evidence input improvements, not geometry/connector certification.

## Private local playground preview

To inspect a persisted engine job in the real portal, build the frontend and start the read-only preview:

```sh
npm run build
.venv/bin/python tools/preview_engine.py JOB_ID --port 4175
```

Open `http://127.0.0.1:4175`, enter the job's set number, and choose **Open candidate**.
The landing status reports the experiment, engine state, coverage and current blocker, including when
no candidate exists. The viewer loads the actual checkpointed SceneV2, verified individual geometry and
checksum-verified official source pages. Candidate identity is checked against the private checkpoint;
this does not import an authored reference, certify the assembly, create a release or publish a tutorial.
The server accepts reads only, binds loopback, and exposes selected in-memory asset snapshots rather than
the private job directory. Return to set lookup and reopen to load a newer checkpoint. The full-height
viewer retains candidate labels; job/experiment identity is in its reconstruction-details popover.

`codex-source-context-v4` adds bounded, hash-verified stud mesh-reference transforms derived from individual
part/subpart/stud-group files in canonical viewer coordinates. These landmarks are not certified connectors
or assembly poses. `v5` further instructs proposals to derive socket seating planes instead of aligning a
curved part's lowest outer edge to another part. These changes were motivated by a real rejected first-step
candidate with an 8-LDU seating gap; its raw proposal and screenshots remain in the playground evidence.
The known indexed panel count is now checkpointed before construction, including first-panel failures.

`codex-source-context-v6` adds a per-instruction visual gate. Each structurally valid proposal is saved
under `proposals/`, rendered with real geometry for its new snapshots, and independently compared by the
runtime model with the official page before it becomes the next checkpoint. A failed or ambiguous visual
comparison retains the raw proposal, rendered images and review but does not advance the candidate.
Active-piece semantics and image-relative attachment order are explicit in the construction prompt.
This adds actual image review, not a general connector checker: scene geometry/connector/physical flags
remain `not_run`, and review metadata remains agent evidence. The complete-booklet validation and packaging
gates still apply. `step` also performs this visual gate before pausing after one instruction.

## Alpha image tolerance (opt-in)

New jobs can use a less precise source-image fit for alpha experiments:

```sh
.venv/bin/python tools/engine.py enqueue --set 30669 --guide alt-02 --revision alpha-30669-01 --quality-profile alpha --max-panel-attempts 3
.venv/bin/python tools/engine.py step JOB_ID
```

Use the job ID returned by enqueue. `step` processes at most one new main instruction; it does not start
a web server. These example commands have not been run against the live queue in this tolerance change.

| Profile | Maximum landmark RMS | Maximum individual landmark error |
|---|---|---|
| `strict` (default) | 4 px | 12 px |
| `alpha` | 8 px | 12 px |

Pixels refer to the retained rendered source page, not the portal viewport. Source resolution, camera
ambiguity tolerance (0.75 px), named landmark requirements, part/connector/sequence checks and actual-render
visual review are unchanged. The profiles are engineering tolerances, not measured accuracy percentages.
Unsupported contacts, missing parts, wrong-side attachments and visible discrepancies still block.

The job fingerprint includes the profile. The checkpoint and per-instruction recovery receipt bind its
version and limits; changing an existing job's tolerance is rejected. Enqueue a new experiment rather than
resetting an exhausted strict job. Reports retain the strict fit result and exact errors for alpha-accepted
landmarks. Local previews label alpha candidates **Alpha sample · unverified**, including measurements in
the reconstruction details. An open older snapshot excludes measurements from future instructions.
No release, human acceptance or physical-build status is granted by alpha mode.

Offline replay of the saved instruction-2 proposal `69451c531c524ef5a5be037aad9f8a40` passes the alpha
landmark fit at 7.763342 px RMS / 9.859493 px maximum, but its actual fitted render is nearly edge-on and
does not match the booklet's above view. That proposal remains rejected; numerical fit acceptance alone
does not make it a suitable tester sample. No new inference or complete alpha booklet was generated here.
Evidence: `var/evidence/alpha-tolerance-30669-01/`. Local services remain stopped.

## Connection-based instruction repair (`codex-spatial-repair-v7`)

The local engine now separates model choices, deterministic placement, camera fitting, and image review.
A model-facing instruction proposal includes the existing append-only delta plus explicit connector pairs,
free assembly roots, printed sequence evidence, and named visible source landmarks. For ordinary additions,
`moving_group_ids` is empty. Only an attachment moves an entire previously constructed detached group.

`config/individual-connectors.json` describes 18 individual designs through 19 geometry records (including
the 3023/3023b alias), with 141 nominal frames. The original six records are preserved. The added records
cover the pilot's remaining plates, tiles, wedges and slopes, including 11477, 15573, 18980, 22385, 3040b,
3068b, 32028, 3623, 6636, 78443 and 78444. Unsupported cavities, rails, clips and other connector families
remain excluded. Each nominal connector and visible stud-cap landmark is tied to the actual individual-part dependency
closure and its hashes. Metadata contains no set assembly coordinates. It is agent-derived engineering
metadata, not physical measurements or human approval. Other part/connector families remain unsupported.

The solver computes mating-frame transforms and quarter-turn orientations, checks occupancy across visible
and hidden physical pieces, and retains rigid group membership across attachment and resume. Detached
callouts have separate coordinate workspaces until connected. Extra free roots, disconnected new pieces,
unsupported contacts, duplicate poses, nonrigid movement and extreme coordinates are rejected. Broad-phase
volume overlaps are retained as review candidates; narrow-phase intersection and insertion-path checks are
not implemented. Global scene geometry/connector/physical flags remain `not_run`.

Source observations identify visible stud-cap centers by catalogue landmark ID and full-page image UV.
The bounded orthographic fitter records every landmark residual, ambiguous alternatives and the declared
camera family. `upright_above` is an explicit source interpretation, never inferred just to lower an error.
The default gate is RMS <=4 original-page pixels and maximum landmark error <=12 pixels. Incoming pieces
shown displaced beside arrows must not serve as seated-world camera landmarks. The actual Three.js renderer
uses the fitted camera independently of assembly poses, preserves page aspect, and binds the requested camera,
actual camera matrices and screenshots to hashes. Landmark agreement does not certify hidden geometry.

New jobs may explicitly select `--quality-profile alpha` for RMS <=8 pixels, retaining the 12-pixel
individual-landmark bound, ambiguity gate and actual visual review. The profile is bound to the saved
configuration and receipts and cannot be changed on resume. Strict results are retained alongside alpha
results. A numerically passing edge-on render can still fail the source comparison. Preview UI labels
these samples unverified; relaxed image tolerance never grants assembly, human or physical approval.

The next proposal now receives compact prior-camera context from this job's last accepted snapshot:
named source pixels, resolved world landmarks and camera right/up axes. The reader verifies the current
scene receipt, source-view file hash, actual official page PNG hash/dimensions, visible IDs and individual
geometry. The active source is the last snapshot's booklet, which may differ from a continuation's primary
source. Missing legacy/rebased receipts supply no context; a matching but invalid receipt fails closed.
Old image coordinates cannot be copied into the new source figure, and previously visible studs may become
hidden. This context supports correspondence identity without prescribing new poses. Its live generation
effect has not yet been measured: the pilot stopped on colour uncertainty before the upgraded worker ran.

Each instruction has a persisted trial budget (default 3; configurable 1–5 on enqueue). Structured review
findings identify connection, side, sequence, mapping, coverage or source-view failures. A repair replaces only
the rejected instruction. Previously checkpointed snapshots never pass through model output again.
Ordinary printed instructions are single snapshots; numbered detached callouts and subsequent attachments
need explicit source sequence evidence. Printed callout labels must equal the labels shown by the viewer.

```sh
.venv/bin/python tools/engine.py enqueue --set 30669 --guide alt-02 --revision MY-NEW-REVISION --max-panel-attempts 3
.venv/bin/python tools/engine.py step JOB_ID
.venv/bin/python tools/preview_engine.py JOB_ID --port 4175
```

A normal retry retains the instruction budget. Exhaustion leaves a specific blocker and all trial evidence.
A reviewed trial is durably receipted before candidate promotion; recovery verifies source/history, proposal,
scene, render and review hashes without spending another model call. Candidates from older pipeline versions
require a new revision. Source indexing and schema-response retries have their own existing bounded counters.
Provider schema rejection is an engine `invalid_schema` failure, not an authentication/quota outage or reason
to pause unrelated jobs. Homogeneous tuple schemas are translated to supported bounded array schemas.

Per-trial evidence is under `var/engine/jobs/JOB_ID/proposals/TRIAL_ID/`: `proposal.json`, `raw-scene.json`,
`scene.json`, `spatial-validation.json`, `source-views.json`, actual `renders/`, `visual-review.json` when reached,
and `outcome.json`. Rejected trials are never served as accepted candidates. Accepted output is labelled
`automatic_connector_corrected_candidate`; it is not an unassisted success or an approved tutorial.
Whole-job validation reports retain the configured artifact kind and reused-evidence lineage, so an assisted
alpha continuation is not relabelled as an unassisted automatic conversion.

Fast alpha campaign commands: `.venv/bin/python tools/alpha_campaign.py status`; `.venv/bin/python tools/alpha_campaign.py run` (selected campaign IDs only, --skip-set may freeze source-assisted prefixes); `.venv/bin/python tools/preview_alpha.py --campaign-file var/evidence/alpha-ten-set/campaign.json` (read-only loopback preview, no publication/review authority).

`correct-empty-batch --set N --guide ID --source-review PATH` is a separately labelled agent correction for a rejected batch of genuinely noninstruction pages, never a way to reset inference attempts. The typed review must bind actual source/page hashes, actor and non_instruction classifications. The backend removes only false blockers, preserves all parts/poses/source observations and original trial/counter history, then normal receipt replay advances one batch with inference disabled. It cannot clear geometry/schema/security failures or grant assembly/human approval. `register-assisted` validates full source coverage, real individual assets and any accepted-prefix lineage, then leases the selected job for a frozen assisted import. Failed imports/corrections release their own lease and retain attempts.
