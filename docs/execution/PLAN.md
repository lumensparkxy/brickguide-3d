# Execution checkpoint — 2 October 2026

## Current outcome
Implemented and ran the local prototype. Set 30669 / alt-02 has a source-backed, corrected,
PDF-assisted candidate covering 12 main steps, 16 microsteps and 32 physical pieces.
Full Version I acceptance is blocked by unresolved geometry/connector/source ambiguity and the
unconfigured automatic provider. No human or physical verification has occurred.

## Milestones

| Milestone | State |
|---|---|
| M0 preflight/setup | Verified: real lockfiles, installed project-local dependencies, doctor. |
| M1 source/contracts | Implemented and tested: official bytes/hash/pages, safe caching/rasterization, scene/runtime validation. |
| M2 parts | 18 pinned candidate designs; 134 dependency files + material file verified. Exact source variants remain candidate. |
| M3 first four | 8 microsteps / 11 pieces inspected; 14 authored contact-frame checks pass. Full hidden-contact/narrow-phase gate incomplete. |
| M4 tutorial | Implemented and Chromium-tested with actual source/parts, replay/camera/navigation/resume, phone layout and explicit failures. |
| M5 durable jobs/review | Implemented and tested: SQLite events/leases/retry/cancel/idempotency, immutable revisions and audited corrections. |
| M6 full booklet | All 12 steps represented and visually inspected in candidate v3. Not promoted to an accepted assembly. |
| M7 validation | 78 Python tests previously passed; camera follow-up passes 18 frontend + 10 browser tests; final phone refinement rerun passes 2 real integration tests. Remaining acceptance limits explicit. |

## Preserved evidence
- Exact official source SHA in PROGRESS.json and VALIDATION_REPORT.md.
- Authored v1/v2 snapshots and correction logs in config/; current v3 and immutable revisions in var/.
- All 16 current source/render screenshots in var/evidence/browser/steps; v1 browser evidence preserved.
- Primary-agent integration plus backend, web and reconstruction specialist work. Backend author independently
  audited source/parts/UI code outside their ownership; primary integrated fixes and checked actual runtime.
- No Git metadata exists, so no commit/branch/issue IDs are invented.

## Next executable action
Open the existing v3 candidate and its review findings. Review the saved official panel comparisons, complete
supported connector metadata and narrow-phase geometry checks, and resolve canopy tint/part variants/tail
centering with actual evidence. Apply corrections as new revisions. Preserve source ambiguity if it cannot be
resolved. Do not mark the first-four gate passed from pixel agreement or authored contact coincidences alone.

Automatic conversion is a separate future integration requiring an explicitly authorized provider and cost
budget, then clean-source evaluation without access to authored coordinates. Human/physical verification
requires actual external action. See BLOCKERS.md and VALIDATION_REPORT.md for exact limits and commands.

## Camera toolbar repair — 2 October 2026
- Reproduced Zoom in jumping inside the final assembly in the live browser. Rotation and zoom
  handlers overwrite camera.position before evaluating their relative offset.
- Repair camera operations; review pan scale, repeated actions, limits and residual drag inertia.
- Add numerical camera regressions and rendered browser checks that reject clipped/empty views,
  check all six buttons, inverse pairs, and interactions after drag/scroll. Preserve Reset view framing.
- Record actual results and update progress after verification; assembly acceptance remains unchanged.

Camera repair complete: six numerical regressions and real rendered-browser stress checks pass.
`npm run check` passes; full browser suite passes 10/10 (47.2 seconds). Evidence and the earlier
screenshot-only test gap are recorded in VALIDATION_REPORT.md. Existing V1 acceptance blockers remain.

## Review panel usability repair — 2 October 2026
- The panel prints 32 per-instance mapping records as identical rows, without their instance/step/source context.
- Group identical findings for display while preserving every original record and status; show counts and affected pieces.
- Add current-instruction/all-instructions filtering, evidence links and navigation to relevant instructions.
- Explain reviewer purpose and keep technical correction fields under an explicit advanced editor.
- Verify real candidate counts/navigation and loading/error states; retain existing correction/conflict tests.

Review panel repair complete: 21 frontend tests, TypeScript/build and 6 targeted browser tests pass.
All 40 records retained, 9 topic groups; real candidate step/piece navigation and error retry verified.

## Stable instruction navigation — 2 October 2026
- Reproduced instruction 11 → 12: Next/Previous y changes 852.59 → 909.16 px at 1440×1100.
- Existing brick poses do not change; the longer parts list expands the workspace grid.
- Stabilize workspace row heights across steps, keeping source/details scrollable and phone tabs usable.
- Verify 11 ↔ 12 and all 16 instructions at desktop/tablet/phone widths, including longer parts lists.

Stable navigation complete: Next/Previous keep identical bounds through 11 → 12 → 11. All 16
instruction layouts verified at 1440, 900 and 390 px; phone tabs remain stable. 21 frontend and
7 targeted browser tests pass; TypeScript and production build pass.

## Full-build playback — 3 October 2026
- Add a separate Play full build control that starts at instruction 1 and automatically advances through all 16 snapshots.
- Slow each placement animation and hold each completed instruction; keep source and parts synchronized.
- Pause freezes animation/navigation, Resume continues, Stop retains the current instruction; manual navigation ends playback.
- Wait for real geometry, respect reduced motion, preserve rigid subassembly attachment and candidate labels.
- Verify a complete real-source run plus pause/resume/stop, restart, normal Replay, failures and phone layout.

Full-build playback implemented and verified: complete 16-instruction real-source run; pause/resume,
stop/manual cancellation, phone, reduced motion, exact final snapshot, and saved progress passed.
21 frontend tests and 7 playback/viewer browser tests pass; TypeScript/build pass. Existing navigation
and integration regression rerun passes 3/3 in 22.0 seconds: var/evidence/full-build-regression.txt.

## Compact provenance status — 3 October 2026
- Remove the large candidate banner at the user's request; retain a compact origin/review label beside the title.
- Move coverage, authorship, human-review and physical-check details into the existing collapsed provenance section.
- Verify desktop/phone layout and existing viewer behavior; preserve all status data and disclosures.

Compact status complete: large banner removed; full disclosures retained in collapsed provenance.
TypeScript/build and 6 targeted browser tests pass; desktop and phone screenshots inspected.

## Source-aware placement animation — 3 October 2026
- Confirmed instruction 9 (printed step 5, PDF page 4): two red plates attach beneath the wing.
- Existing generic +60 Y approach wrongly passes through the assembly; also audit underside callout attachments.
- Add explicitly authored, source/revision-bound presentation directions; no guessed universal drop trajectory.
- Conservatively reject swept part bounds entering occupied space beyond the final contact envelope.
- Unknown/blocked movement uses an in-place highlight. Preserve snapshots, uncertainty and source evidence.
- Verify Replay and full playback, underside path samples, attachment rigidity, fallbacks and final snapshots.

Placement animation repair complete: instruction 9 approaches from below; 2/5/8 conservatively
highlight in place when the approach bounds are blocked. All 16 motions audited; complete playback and
exact final state verified. 26 frontend tests, 4 motion/playback and 2 integration tests pass. Broad-phase
approach screening does not establish narrow-phase/connector/physical validation.

## Open Studio design implementation — 3 October 2026
- User selected the second displayed design concept: large model stage, single left instruction/source/parts rail and unified navigation dock. Reference retained at var/evidence/open-studio/selected-reference.png. This supersedes the earlier three-column visual arrangement only.
- Preserve actual assembly/review data, cached preparation, all 16 microsteps and 12 main steps, keyboard/camera controls, replay/full playback and revision-aware resume.
- Implement compact application header, responsive shared instruction context, real part thumbnails/colour labels, contextual camera toolbar and review beside the source/model. No extra account, export or settings feature from illustrative chrome.
- Primary owns App/ViewerWorkspace/styles/integration; renderer specialist owns AssemblyViewport; read-only test investigation and independent review have separate scopes.
- Validate type/unit/build and relevant browser regressions; inspect live desktop/phone/callout/final/review states against the selected concept; update progress/report with actual evidence.

Open Studio implementation complete: 78 Python tests, schema/lint, 26 frontend tests, TypeScript/build and all 18 browser tests pass. Final desktop/reference and phone/callout/review captures inspected; three independent review findings repaired and rechecked. All source-derived assembly data and existing acceptance gates remain unchanged. Evidence: var/evidence/open-studio/ and design-qa.md.

## Brick Playground landing — 3 October 2026
- User selected the first landing concept: sunshine-yellow hero, colourful brick/plane imagery, set lookup and a three-step explanation. Exact visual target saved in var/evidence/landing-playground/selected-reference.png.
- Implement only the landing and set-to-booklet handoff. Preserve the approved tutorial and all preparation, retry, source and uncertainty states.
- Produce matching hero and individual process illustrations as labelled decorative artwork; never use generated imagery as assembly evidence. Primary owns app flow/styles/tests; asset workers own only assigned image files.
- Add a real supported-example shortcut using the existing catalogue/guide APIs, clear loading/errors, responsive layout, keyboard focus and reduced-motion handling.
- Verify desktop/phone and lookup/example/preparation paths, compare rendered page with selected design, record tests and evidence.

Brick Playground complete: selected visual implemented with four original decorative assets and a local
font. Real lookup/example handoff, result/error focus, preparation and return behavior verified. 26 frontend
tests, TypeScript/build and 8 relevant browser tests pass; 3 focused responsive tests also pass after refinement.
Desktop/tablet/phone comparisons inspected. Tutorial implementation and assembly acceptance unchanged.
Evidence: var/evidence/landing-playground/; current QA: design-qa.md.

## Yellow-blue consistency and callout controls — 3 October 2026
- User requests shared landing palette across tutorial/review/preparation, a themed Find my set dialog, visible Replay on Step3, and stable Part1/Part2/Attach controls.
- Reproduce layout/renderer behavior before repair. Primary owns App, dialog, theme CSS and ViewerWorkspace layout; renderer specialist owns AssemblyViewport and targeted replay browser regression. Preserve real poses, source data and conservative placement safeguards.
- Use native modal behavior for found-booklet/preparation flow, Escape/close/focus restoration and phone scrolling. Preserve lookup failure/retry/cancel/provider distinctions.
- Reserve consistent instruction/substep layout and evaluate camera framing separately from DOM movement. Verify actual callout steps, all16 replay outcomes, modal/error paths and responsive layouts. Record evidence and update progress/report.
- Completed: themed native dialog and all app surfaces; stable sibling copy/layout and shared camera frame; safe visible highlight replay. 78 Python + 26 frontend tests, schema/lint/typecheck/build pass. All 26 unique browser tests pass (broad run plus affected-file rerun); screenshots and detailed evidence in VALIDATION_REPORT and theme-consistency directory. Independent dismissal finding fixed and rechecked. Source/model/physical acceptance unchanged.

## Ten-set release evaluation — 3 October 2026
- User requests at least 10 sets: 3 simple, 3 medium, 4 complex; correctness, bottlenecks and GPU/rendering measurements.
- Inspect current catalogue/provider/reference support before claiming generalization. Source researcher owns a separate official-source matrix; renderer worker owns opt-in renderer diagnostics and performance test; independent reviewer audits release gates read-only. Primary owns real lookup matrix, integration, source-boundary tests and final report.
- Select 10 distinct real sets from verified official metadata. Exercise current app/API for each and record pass/blocked/error boundaries. Do not substitute synthetic scaling for actual set correctness or silently promote unprepared sets to supported catalogue entries.
- Measure the available real reconstruction in actual browser: loading, active frame pacing, draw calls/triangles, CPU submission, GPU query if supported, idle rendering and reopen resource counts. Separate browser cache from prepared source cache and emulated phone viewport from physical device.
- Record unavailable reconstruction/provider or hardware measurement as explicit blockers and finish all independent checks. No paid inference, complete community models or production deployment.
- Audit completed: all10 set lookups checked, official source links verified,4 selected PDFs/176pages rendered and6 correctly rejected at20MiB. One candidate renders; nine have no supported scene; automatic conversion unavailable. Opt-in diagnostics measured real Apple M3 GPU separately from SwiftShader. Native baseline ~60renders/s, desktop p95GPU1.617ms; five reopens stable. 78Python/26frontend/27browser regressions pass;4 isolated benchmark profiles pass. Ten-set reconstruction/release gate remains blocked; exact next gates and evidence in TEN_SET_RELEASE_REPORT.md.

## Bounded ten-set source preparation — 3 October 2026
- User authorized the needed changes following the limits audit. Raise the configurable PDF ceiling to 256 MiB and provisional page ceiling to 1000 while retaining per-page memory/pixel safeguards.
- Render resumable, checksum-verified bounded batches; add cancellation and worker heartbeats, actual manifest-backed page serving, and safe handling of unknown booklet counts.
- Register only observed official booklets from the ten-set source matrix. Distinguish source preparation from available reconstructed tutorials in the existing yellow-blue dialog.
- Source worker owns download/render/cache and source tests; job worker owns leases, checkpoints and job tests; catalogue/UI worker owns curated metadata and frontend flow. Primary owns API integration, actual source validation, documentation and final verification.
- Validate large official sources and cancellation/retry behavior, run software and browser regressions, and inspect rendered source-only workflow. Nine missing reconstructions remain explicit blockers; no paid inference or deployment.
- Complete: configurable256MiB/1000-page source budgets, bounded resumable batches, private source snapshots, heartbeat/cancel/retry, manifest-bound serving, ten-set/19-booklet catalogue and honest preparation UI. All19fresh jobs/2231pages and finalpage endpoints verified; real360-page cancellation/resume passed.108backend,27frontend,28browser regressions and1final UI recheck pass. Independent serving/identity/resume findings fixed and reproduced as resolved. Nine missing reconstructions remain explicit; see LARGE_SOURCE_PREPARATION.md.

## Actual ten-set 3D construction benchmark — 3 October 2026
- User clarified that the required benchmark is construction of actual 3D tutorials, not PDF preparation. Retain the original ten-case split: three small, three medium and four large.
- Start fresh timed PDF-assisted reconstruction attempts from official source pixels. Record existing30669candidate loading separately; do not count replay/materialization as fresh reconstruction.
- Small worker owns30669/60400/31134, medium worker owns42163/76920/31129, large worker owns42171/21343/21061/10316. Each owns isolated evidence/candidate/build-script directories and private assets; primary owns integration, measurement/reporting and validation. No shared catalogue/renderer edits by workers.
- Inspect selected build identities and all necessary source instructions; construct actual parts/poses/callouts until complete or a source-specific unresolved blocker is evidenced. Preserve partial candidates, uncertainty, timestamps and correction logs. Do not call partial work a complete-set benchmark.
- Validate actual produced candidates structurally, inspect real source/render alignment and benchmark load/render only on those models. Report authoring wall time separately from deterministic rerun time and viewer performance. No paid provider, fabricated coordinates, completed community models, deployment or human/physical claims.

### Construction benchmark checkpoint
- Attempted all 10 source-derived reconstructions; retained11partialbookletcandidates and prior correction history. No full tutorial passed.
- Staged verified source/part assets into isolated8001/5174 runtime; final actual browser/nativeM3GPU pass11/11 with every represented snapshot captured.
- Independent source review identified remaining real pose errors (including kart bumper and Viking slope); these are construction failures, not renderer failures.
- Software checker108backend/27frontend plus lint/schema/typecheck/build passed. Report andPROGRESS separate partial rendering from assembly accuracy and full construction latency.
- Next: correct source mappings/poses, pass a complete booklet evidence gate, then repeat full-case timings; do not publish private partials as tutorials.


## Approved cloud/local-engine implementation — 3 October 2026
User approved implementation of local Codex batch reconstruction and Google-only release architecture.
Project lumensparkxy; approver maswadkar@gmail.com; new resources europe-west1; existing Krishi/default DB untouched.
Scope all 19 official booklets in 10 sets. Website code may deploy after checks; content requires per-version human approval.
Stages: 0 baseline/access; 1 v2 contracts/public isolation; 2 durable engine; 3 complete pilot; 4 cloud portal; 5 immutable packaging/approval; 6 all19 campaign; 7 verified deployment/operations.
Parallel ownership: batch_engine engine/CLI/tests; release_backend public API/contracts/packaging/tests; portal_frontend UI/tests; primary infrastructure/dependencies/integration/evidence.
Gate: never equate partial render/schema validity with complete accurate reconstruction. Continue independent work while concrete blockers remain.

## Local engine and Cloud Run implementation — 3 October 2026

The approved cloud/batch plan supersedes V1's earlier no-cloud scope. Preserve the existing Krishi service and default database. Tutorial publication still requires the user's explicit approval of an exact immutable version.

- Stage 0: local Git, project-local SDK, authenticated approved account, billing/project inventory, 19 pinned official sources and real restricted Codex image calls verified.
- Stages 1–2: public/private entrypoints, source-aware contracts, compact scene chunks, durable local queue, bounded delta proposals, geometry provenance, render and independent validation interfaces implemented and tested.
- Stage 3: fresh pilot is blocked at step 3 (2/12 main steps, 5 physical pieces) on ambiguous tile orientation. No complete-scope deterministic geometry/connector checker exists; release validation fails closed. Authored reference remains separate.
- Stage 4: dedicated databases/buckets/identities provisioned. Project budget created. First Cloud Build failed on omitted build inputs; isolated upload-context build now passes. Retry private preview and public code deployment, then inspect real browser and cloud permissions.
- Stage 5: immutable packaging, private upload/hash verification, identity-bound approvals and pointer promotion/rollback implemented with tests. No eligible real bundle or tutorial approval exists; real publication/rollback remain unexercised.
- Stage 6: all 19 jobs persisted. Other 18 remain queued behind pilot gate; full-set timing and full-assembly GPU benchmarks are not established.
- Stage 7: finish public deployment checks, operations report and local checkpoint. Keep unresolved reconstruction/checker/large-context limits explicit; do not mark the overall campaign complete.

Primary integrates/cloud deploys; three bounded workers own engine, portal/release and independent review. No remote Git repository or paid inference fallback was created.

### Verified cloud checkpoint

Cloud Build `c98d0db4-954e-4da1-93ce-7339005927af` succeeded. Private preview/authenticated proxy and public deployment passed smoke tests. Live desktop/phone flows record and deduplicate requests without requesting PDF/crop bytes. An actual second-revision traffic promotion and rollback restored the original verified image; test tag removed. Existing Krishi spec/generation and default database configuration remained unchanged.

159 backend, 34 frontend and 31 browser tests passed; three opt-in benchmarks skipped. The final browser run was isolated after output-directory collisions were diagnosed; source-panel collapse on Part/Attach was repaired and inspected. Operations/report documents and immutable local Git checkpoints are retained. The complete-source pilot, deterministic checker, large-context partitioning, 18 remaining constructions and real tutorial publication/recovery remain outstanding; overall plan is not marked complete.

## User-requested processing resume — 3 October 2026

Resume the saved 30669/alt-02 pilot without discarding its two completed panels. Run one bounded worker pass using the existing subscription-authenticated provider, observe actual progress, and retain any new blocker. Keep the remaining campaign gate and publication approval requirements unchanged.

The first resumed call ran for64.927seconds and returned the same attachment-offset/tile-orientation ambiguity. Inspection found wrapper-only part definitions missing their verified subpart geometry. Added bounded, hash-checked subpart context and the preceding official page at page boundaries, plus tamper/bounds/source-order regression tests. Started a second bounded pass under `codex-source-context-v3`, preserving previous snapshots and publication gates.

Resume outcome: both bounded passes finished, with no additional accepted panel. The context-v3 result no longer lists tile rotation, but still blocks on exact stud offset and vertical attachment placement. Pilot remains2/12; eighteen booklets remain gated. Worker stopped after the bounded job; provider authentication/quota did not block it.161backend tests and schema check pass; relevant Ruff checks pass. New source/geometry input repair is local only; no website or tutorial publication. Evidence: `var/evidence/engine-resume-result.json`.

## Guided fresh 30669 run

User created job4623deafb567466e8b1f97bb512881c0 (guided-30669-01) and requested collaborative command-by-command processing. Add a job-specific `step` command that indexes its source, proposes at most one main instruction (including that instruction's substeps), persists it and releases the worker into an explicit paused state. Ordinary workers must not claim paused jobs. Preserve campaign/validation gates and the older failed pilot. Test against isolated synthetic inputs; leave the real new job queued for the user to execute.
# Local engine reset — 2026-10-03

User requested a completely fresh engine start. Verify no reconstruction worker is running;
inventory and hash the existing engine directory, move it into an ignored recovery archive,
verify every archived file, and initialize an empty engine database. Clear the active queue,
leases, checkpoints, provider pauses and campaign controls through that fresh database.
Retain source PDFs, individual geometry, historical QA evidence, authentication and the portal.
Do not enqueue or run inference until the next guided user command.

## Fresh engine playground — 3 October 2026

Run the user-requested `fresh-30669-01` experiment from official source and individual geometry. Preserve existing guided-command changes. Use at most five diagnostic/fix iterations; retain raw calls, rejected proposals and candidate checkpoints. Exercise the actual local portal with this job's output (never substitute the authored reference), inspect source/render correspondence and record exact coverage and remaining blockers. Keep all publication and human/physical-review gates intact.

Fresh playground outcome: five engine passes completed (including the initial sandbox-start failure).
All eight official pages indexed. Individual geometry landmarks, seating-surface guidance, early coverage
reporting, candidate portal transport and a per-instruction actual-render visual gate are implemented.
Attempt 3's first-step gap and attempt 4's wrong-side step-3 attachment were independently identified and
quarantined. Attempt 5 failed the new gate on reversed intermediate slope-attachment order at instruction 1;
no rejected draft was checkpointed. Current accepted-by-pipeline coverage is 0/12; no complete automatic build.
The actual local portal was exercised with prior partial candidates and the final blocked state, on desktop
and phone. 171 backend / 34 frontend / 31 browser tests pass; 3 optional browser audits skipped. Local preview
remains at http://127.0.0.1:4175. See var/evidence/fresh-30669-01/result.json and iterations.json. Stop at the
user's five-pass ceiling; next reconstruction work requires a new instruction, not an unbounded retry.

## Authorized spatial correction layer — 3 October 2026

The user authorized the next implementation after the five-pass playground diagnosis. Add bounded,
source-backed spatial correction to the local engine and exercise it in the local portal.

- Derive hash-bound connector frames for the supported individual part families. Compute mating poses
  from explicit connection choices; preserve unsupported/ambiguous contacts as findings. Preserve raw
  model proposals separately from deterministic corrections and retain existing acceptance limits.
- Fit a separate source camera from explicit source landmarks, record reprojection error and ambiguity,
  and render comparisons without changing world poses. Do not call image agreement mechanical proof.
- Repair only the current instruction, with a persisted attempt ceiling, structured feedback and retained
  rejected evidence. Keep prior snapshots immutable and printed/callout order explicit.
- Primary owns runner/contracts/integration and execution records; reconstruction specialist owns new
  connector/solver modules and tests; viewer specialist owns source-camera fitting/render integration.
- Test floating/seating errors, wrong-side evidence, rigid subassemblies, unsupported metadata,
  rejected repairs and immutable history. Run a bounded fresh source-only experiment and inspect the
  actual desktop/phone portal. Report partial coverage and unresolved source/mechanical gates honestly.

Spatial correction checkpoint: implemented six-design nominal connector placement, hash-bound visible
landmarks, separate source-camera fitting/actual Three.js capture, and durable bounded instruction repair.
Independent review found and helped close hidden-connector occupancy, detached-group membership and extreme
coordinate failures. A live schema incompatibility was fixed without weakening the response contract.

Fresh spatial-30669-01 indexed all eight pages but exhausted three trials (including schema rejection).
The explicitly recorded spatial-30669-02 continuation reused its automatic index/rejected trial and allowed
two further trials: instruction 1 passed on the first, with 0.326 px landmark RMS and independent limited
source review. Instruction 2 then exhausted its own two-trial budget (27.21 → 7.76 px RMS); it was not
checkpointed. Current candidate remains 1/12 main steps, 1 snapshot, 3 pieces. Worker stopped; no watcher.

225 backend tests, 39 frontend tests, schema/lint/typecheck/build and 31 browser regressions pass (3 optional
browser audits skipped). Actual candidate desktop/phone and in-app interactions passed. Preview remains
http://127.0.0.1:4175, job2ad572af542a40c1bdcf4b08a5899046. Full booklet, broader part connectivity,
narrow-phase/path validation, human review and physical build remain blocked/not run. Next work is precise
instruction-2 wing/landmark disambiguation, not a lower visual threshold or a reset of failed-trial counters.

## Opt-in alpha image tolerance — 3 October 2026

The user now requests less precise pixel matching to prepare samples for alpha testers. This supersedes
the preceding recommendation against lowering the visual threshold for experiments. Add an explicit
`alpha` quality profile: 8 px landmark RMS, retaining the strict 12 px individual-landmark cap and camera
ambiguity checks. Keep `strict` at 4/12 px by default. These are engineering tolerances, not accuracy claims.

- Persist the profile in each new job and its evidence/recovery receipts. Do not alter the existing blocked
  strict job, accepted snapshots, or consumed repair attempts. Expose relaxed acceptance and exact errors.
- Preserve source identity, part geometry, connector, sequence, render and visual-review gates. Alpha
  generation never grants release approval, human review or physical-build status.
- Label local alpha candidates throughout the preview and viewer. Re-evaluate the current rejected trial
  offline under both profiles and record the exact difference; no new inference or publication is implied.
- Test configuration, threshold boundaries, recovery integrity and preview metadata, inspect the rendered
  labels with temporary local services if needed, then leave the user's web services stopped.

Outcome: strict/alpha profiles, persisted tolerance and receipt binding, strict-error retention, CLI/report
support, and unverified alpha labels are implemented. 237 backend and 41 frontend tests pass; schema,
lint, typecheck/build and targeted desktop/phone UI checks pass. Independent review found a live-metadata
association issue; the viewer now excludes future instructions from the open snapshot's measurements.
The existing second-step fit passes 8/12 numerically, but its actual render is nearly edge-on rather than
the source's above view. It was not promoted. Accepted coverage stays 1/12; no new inference, alpha sample,
publication or human/physical verification. Temporary preview and render processes were stopped.

## Camera agreement diagnosis — 3 October 2026

Read-only engine investigation plus separate diagnostic evidence shows that instruction 2's near/far slope
landmark instance IDs were reversed. Swapping those observations alone yields 0.402088 px RMS and a
36.364274° above-view camera; actual render/source inspection confirms limited visible agreement. No
engine code, persisted job proposal or acceptance status was changed. A subsequent implementation should
repair supported correspondence alternatives, report a camera search forced onto its allowed boundary,
and validate source/render evidence before promotion. Keep this assisted diagnostic distinct from an
unassisted reconstruction. Evidence: `var/evidence/camera-diagnosis-30669-01/diagnosis.json`.

## Generate the corrected alpha pilot — 3 October 2026

The user requests generation of the identified pilot, interpreted as set 30669 / alt-02. Create a new
alpha experiment without altering the blocked strict parent. Reuse the parent's automatic source index
and accepted first instruction with explicit lineage. Provide the recorded near/far landmark correction
as source-backed repair feedback, then run real subscription-authenticated proposals and visual reviews
through the remaining booklet. This is an assisted continuation, not an unassisted fresh conversion.

- Primary owns setup, run supervision, any necessary runner/instruction fixes, integration and records.
  Reconstruction worker owns additional individual connector metadata and its tests; no assembly reference
  coordinates are allowed. Finish metadata before freezing the new job's catalogue identity.
- Each instruction gets at most five persisted proposal/repair trials. Preserve failed trials and accepted
  snapshots. Stop on provider access/quota failure or a specific unresolved evidence/metadata blocker;
  do not reset exhausted counters. Continue independent verification if generation blocks.
- Generate all 12 main instructions and printed substeps when the checks permit; inspect source/render
  output and exercise the actual alpha candidate in the local portal. Keep public release, human review,
  physical-build status and automatic accuracy distinct from candidate generation.
- Use temporary loopback services for rendering/QA, then leave local web services stopped as requested.
  Keep evidence under `var/evidence/pilot-alpha-30669-01/` and record exact coverage and remaining blockers.

During generation, instructions 6 and 7 repeated near/far landmark identity errors. The accepted source
camera and named correspondences are retained in receipts but omitted from the next proposal's context.
Add compact, hash-verified prior alignment context, including its source page and resolved world landmarks,
to the next instruction prompt. This is the job's own accepted evidence, not an authored reference or a
new placement. Stop only between instructions using an explicitly recorded administrative claim pause,
then resume the same job with all attempt counters intact. Root owns runner integration; camera worker
owns the bounded context reader and focused integrity tests. Do not alter camera thresholds or introduce
boundary-angle rejection during this run. Keep the separate boundary diagnostic as follow-up evidence.

The live generation reached 7/12 main instructions before instruction 8 exhausted its five trials on
transparent clear versus transparent light-blue colour identity. Preserve this partial candidate and
its counters; complete source/BOM/portal verification without another reconstruction call. The proposed
alignment-context change will receive offline/automated validation only in this run.

Actual partial-candidate portal QA also reproduced full-build playback cancelling when streamed snapshots
temporarily set renderer readiness to false. The portal worker owns the minimal viewer transition fix and
a chunk-loading browser regression; root retains integration. Preserve Pause/Stop/manual-seek semantics,
visible error/retry behavior, and all candidate data. Rebuild, rerun desktop/phone QA, then close services.

Outcome: preserved the assisted alpha candidate at 7/12 main instructions, 11 snapshots and 19/32 pieces;
instruction 8 remains blocked on transparent colour identity after five trials. Independent source/BOM
and connector reviews are recorded. The accepted camera-context helper passes 31 focused tests and an
actual-candidate offline check, with no measured subsequent live-generation effect. The playback fix
passes two new regressions, and actual desktop/phone QA passes all available snapshots and controls.
Final software checks: 279 backend, 41 frontend and 33 browser tests passed; three opt-in audits skipped.
Cancelled browser DAT requests remain disclosed with 81 successful hash-verified asset readbacks. All
temporary services are stopped, accepted data is unchanged, and no further inference or publication ran.
Full booklet, human acceptance, physical build and general collision/contact certification remain open.

## Ten-set playable alpha campaign — 3 October 2026

The user now explicitly accepts small reconstruction errors and requests playable alpha models for the
ten selected sets. Add an explicit fast alpha generation mode: infer bounded groups of official source
pages directly into append-only poses, record uncertain colour/decoration/contact/camera interpretations
as review notes, and preserve structural/source/individual-geometry integrity. Strict spatial generation
and release approval remain separate. Existing exhausted experiments retain their data and counters.

Scope: 30669/alt-02 (the current pilot), both 60400 booklets, 31134/booklet-01, 42163/main, 76920/main,
31129/booklet-01, 42171/main, 21343/main, 21061/main and all three 10316 booklets: ten sets, thirteen PDFs.
The 2,028 cached pages remain official assembly evidence. Attempt complete selected booklets; never label
a partial model complete or create fictional intermediate coverage. Native text is indexing context only.

- Root owns mode selection, lease/campaign orchestration, individual-geometry cache scaling and integration.
- Backend worker owns compact alpha patches, durable page-batch attempts and source-derived append logic.
- Reconstruction worker completes the plane from the retained seven-step pilot with explicit assistance.
- Portal worker owns the read-only multi-job preview and correct per-guide alpha status/disclosures.
- Small errors use the most likely source-supported interpretation with alternatives and affected IDs.
  Unsupported exact connector checks stay unverified; absent real geometry and invalid source/schema
  remain blockers. No fabricated identity, geometry, review, physical test or full completion claim.
- Use at most five durable repairs per batch, compact current-state context and verified individual-part
  closure caching. Keep private raw calls, notes, snapshots and exact coverage/timing in
  `var/evidence/alpha-ten-set/`. Run generation by selected campaign job IDs, not unrelated queued work.
- Inspect actual source/rendered output and local desktop/phone flows. Keep software behavior, approximate
  reconstruction coverage and physical/human verification distinct. Stop temporary web services afterward.
  No cloud deployment, publication, paid API fallback, Git push or destructive cleanup is authorized here.

The plane and both go-kart booklets are now source-assisted complete and registered. Freeze the shuttle and Mustang automatic prefixes for explicitly source-assisted append completion; complete the bulldozer similarly. The backend correction helper permits only blockers removal for actual agent-inspected empty noninstruction batches, with image/source/actor hashes and five consumed trials preserved. Three leading batches (42171, 21343, 10316 booklet01) advanced normally without inference. Resume other campaign jobs, and inspect all completed candidates in the local portal.

Real larger-source batches occasionally hit the bounded300-second Codex timeout. Add an explicit, audited runtime override for remaining fast-alpha batches using gpt-6.1-sol/low; retain frozen source/policy and all previous trial budgets/receipts. Runtime changes must require an idle, explicitly alpha job, use a fenced checkpoint, preserve candidate/history and forbid strict/complete/exhausted jobs. Receipt/report metadata must show the actual runtime; there is no API fallback. This follows the user request for faster approximate alpha models.

Generation also exposed a reporting mismatch: unnumbered minifigure/presentation snapshots were counted as numbered main instructions, and cumulative booklet candidates could include earlier-booklet counts. Count numbered section/main pairs from the currently selected source in alpha status/report surfaces while retaining every snapshot and all frozen checkpoint history. Root owns this small reporting correction and focused regression checks.

The first frozen shuttle import exposed a real registration bug: grouped uncertainty metadata was a dictionary while the importer expected a list. The failed import released its lease and retained its original prefix/counters. Normalize supported grouped notes into displayable plain-text review records, preserve original report evidence, then retry the same frozen artifact. This does not relax source or geometry checks.

Make tools/validate_scene.py accept both scene contract versions, including section-aware numbered main counts. The Mustang diagnostic reproduced its current schema1-only limitation; verify against the frozen real alpha candidates without changing their hashes. This remains structural validation, not assembly certification.

Actual complete-model portal inspection exposed two copy problems: unknown curated instruction totals still produced an incomplete-coverage footer despite a pinned full-source assisted receipt, and every unnumbered instruction was labelled Final assembly (including minifigure preparation). Use neutral unnumbered-instruction labels and the evidenced complete-alpha source-coverage flag for the footer; keep assembly unverified. Root owns the small UI edit and rendered recheck.

Single supplied chains and shock absorbers use verified constituent Part geometry; rejected Shortcut roots remain rejected. Record component counts separately from supplied physical units and preserve the exact official unit geometry inspection. Root owns the frozen tiger import and actual 437-snapshot portal check, then complete source-assisted Rivendell booklet01 with original Frodo prefix retained. Native PDF glyph indexing supplies page/number context only; part shape and approximate placement remain agent interpretation of actual official pages.

The targeted rendered footer check caught a real wiring error: the viewer compared a formatted display string with source-coverage enum values. Pass the evidenced raw source-coverage flag separately from its display text and verify the actual footer/unnumbered labels again. Root owns this two-file correction; failed adapter/runtime evidence is retained.

Rivendell booklet01 now has246 source-bound numbered main keys plus unnumbered character/final panels. Actual repeated-whole-model inspection exposed wrong dark-tan/gray codes, long-beam local axes, separated roof-quarter centres and a translated upper tower. Correct only new assisted data, retain the original10descriptors/2snapshots, keep visible contact/proportion and painting/print limitations. Freeze one reviewed candidate; complete booklets02and03 cumulatively with preserved predecessor data. Root owns registration and read-only actual portal checks.

Actual candidate rendering also exposed canonical hash drift because Node parsed/reserialized the original scene before Python normalization, losing signed zero. Pass original UTF-8 JSON as a string to canonical Python contracts. The corrected renderer now reports exactly the authored candidate SHA; original render receipts remain retained.

Large-model actual portal QA failed with a connection reset while reading Notre-Dame chunk23. The server remained alive at98.5percentCPU/1.7GBRSS; status and source-page requests repeatedly parsed and validated large unchanged candidates. Cache read-only job JSON against mainDB/WAL file identities and SceneV2 against confined scene file identity plus currentjob object. Continue live officialPDF/receipt identity checks and invalidate on DB or scene changes. Preserve failed browser/report evidence, verify warm-cache source/checkpoint tamper tests, then rerun actual portal QA. Completion importer also omitted report `uncertainty_notes`/`alpha_notes`: support known note formats, merge/de-duplicate with retained prefix notes, and allow fenced same-frozen-scene metadata refresh without inference or budget resets. Root owns both fixes.

Actual Viking final-view screenshot exposes thousands of blue boxes obscuring the finished assembly. Suppress static active-piece boxes for inspection snapshots that introduce no pieces, retain all source/instance data and normal build/attachment outlines, and label that view Assembly overview. Explicit replay may still emphasize the recorded pieces. Root owns the two-file viewer change, frontend checks and a rendered follow-up on the large models; the already running browser QA retains its original build.

Independent read-only review reproduced warning loss for the actual legacy plane checkpoint: it stores four historical uncertainty_notes without an alpha_review_notes key. Same-scene metadata refresh would retain only the new report warning. Merge both historical fields before new notes in both fresh assisted import and same-scene refresh; keep exact candidate/counters and de-duplication. Root owns the narrow correction and real-shape regressions; no live metadata refresh occurs during portal DB-stability QA.

Persist new assisted scenes as compact atomic JSON: the actual book01 file grows from8.3MB authored to18MB prettified on import, risking the256MB preview bound for cumulative Rivendell. Add an opt-in compact mode to the existing atomic writer and use it only for new assisted scene files. Existing frozen candidates and metadata formatting remain unchanged. Book03 source panels may hide prior modules until the evidenced final joining step while retaining their exact original snapshots and all physical IDs.

Actual large-model source comparisons show substantial gaps/overlaps, so alpha copy must not promise only small errors. Describe colours/placements as unverified with visible gaps possible, keep per-model notes visible, and use known selected-source coverage in the details without confusing cumulative numbered counts with one booklet. Root owns this bounded copy correction and the actual new-build follow-up.

Independent final13-candidate review found the frozen pilot report contains all8 page pins/full_source_review, while registered alpha-report remains an older7-pin receipt. Same-scene refresh returns early when notes match, ignoring changed valid report evidence. Compare the input report SHA as well as merged notes before skipping a fenced refresh; retain exact scene/config/trials and idempotency. Root owns the narrow importer correction, stale-receipt regression, archival copy and actual pilot report refresh after the running read-only03 portal audit finishes. No model/source/geometry change or inference occurs.

Ten-set local alpha checkpoint complete: all13 frozen source-assisted booklets registered across10 sets, all2,028 source-page pins verified, every new-source view and representative controls/phone flow tested. Final report-only pilot sync fixed without changing scene/source/trials; independent13-candidate review and current399 backend tests pass. Temporary browser/loopback preview stopped and ports verified closed. Retain original strict/automatic failures, all5-attempt histories, unverified reconstruction limitations and physical/human not_run. Local handoff README gives candidate list/start command/tester flow; no deployment/publication or destructive cleanup.

User follow-up: increase the five-minute inference timeout. Root owns a shared fifteen-minute
(900-second) default for the Codex provider and alpha runner. Preserve explicit timeout overrides,
cancellation checks, the five-second subprocess termination grace, and all existing attempt histories.
Verify continuation beyond the old 300-second boundary with a simulated clock and verify actual local
stub termination under an explicit short timeout. Run focused engine regressions and compare the live
job database read-only before/after. Do not start inference, resume jobs, or restart web services.

User web-test follow-up: start the existing read-only alpha campaign portal on127.0.0.1:4175 and verify
current built frontend against real frozen candidates. Root owns the sequential test run: frontend
typecheck/unit/build, preview/API/contracts checks, actual ten-set/thirteen-booklet lookup and representative
small/large desktop/phone viewer, source, BOM, camera, keyboard, playback and revision-scoped resume flows.
Record browser/console/network observations, screenshots and exact read-only job-row hashes under
var/evidence/web-app-test-2026-10-04. Fix a reproduced portal defect if found, preserve original failed evidence,
and rerun only affected checks. Inference, source generation, publication and job changes are outside this
test run. Leave the requested local4175 portal available after closing the temporary QA browser.

Initial real Chrome load reproducedfavicon.ico404: the HTML declares no icon and the static app has none.
Preserve the original console evidence, add an original local SVG brick favicon and explicit HTML link,
rebuild, and verify a fresh real page requests the icon successfully with no startup console error.
The first favicon recheck reproduced a second404 because the preview intentionally serves static files
only below assets/images/fonts. Retain that failed run and serve the new icon below images; retain the
existing confined static allowlist without adding a root-path exception.

The actual thirteen-booklet sweep rendered every first/final view but produced repeated "Too many active
WebGL contexts" warnings. Renderer cleanup disposes resources without releasing the browser context;
explicitly release the context after removing its loss listener and disposing resources. Preserve the
failed sweep. Rerun a fresh-page repeated-open sweep with no context warnings, full pilot controls and
large-model mobile playback after waiting for actual geometry readiness. The first large playback test
used a12-second deadline while restart was still loading; inspect its state before classifying it as a
product playback failure. Browser-only injected settings recovery initially used a label changed by loading;
use the observed stable find-set control and retain that adapter failure separately.

Web-test checkpoint complete:45 frontend tests/typecheck/build,46 preview/API/contracts tests and schema
drift passed. Actual current Chrome checks cover10 set lookups/13 booklets,26 first/final views plus every
16 pilot instruction, source/BOM bindings, camera/keyboard, reduced-motion playback, revision resume,
desktop1440x900/1000 and phone390x844. Five deliberate browser-only failure/recovery cases passed.
Post-cleanup repeated openings produced no context warnings. Largest Rivendell opening16.3seconds and
restart14.7seconds were measured; the earlier12-second test deadline was too short, and later actual
state showed playback had reached instruction197. Preserve that failed test and all original context warnings.
Campaign network matcher initially assumed cancelled resources were only geometry;27 remaining URLs,
including the actual final instruction chunk, were read back against frozen hashes. All3935 observed
campaign cancellations across2312 unique URLs remain recorded with matching successful readbacks.
No source/scene/job changes or inference occurred. Rebuilt real in-app tab resumed plane instruction2,
ready/source/geometry visible and console errors/warnings empty. Leave only requested loopback4175 preview
and the user's existing tab available; close the separate QA browser. Evidence:var/evidence/web-app-test-2026-10-04/verification.json.

## Home set dropdown and release preflight — 4 October 2026
- Replace the set-number text field with a native, labelled dropdown for the ten curated sets. Use
  the catalogue's actual names in `set-number - name` labels; retain Find my set and the plane shortcut.
- Remove the large alpha sample button block from the home page. Retain candidate accuracy,
  source coverage and human/physical verification disclosures in booklet and tutorial views.
- Verify the flow: home → select set → Find my set → correct booklets → tutorial → return.
  Inspect desktop/mobile, keyboard focus, longest labels and loading/error handling; run local checks.
- Primary owns UI, test adaptation and integration. Independent reviewer owns read-only release
  investigation. Preserve the existing engine/alpha work and all source/scene/job state.
- Once UI verification passes, prepare the user's requested GitHub/production release using actual
  repository and deployment configuration. Resolve any missing GitHub destination and distinguish
  website deployment from tutorial publication; do not manufacture content approvals.
- Evidence: `var/evidence/home-set-dropdown/`. Browser plugin not available; use existing Playwright.

Release preflight found two concrete fresh-checkout CI gaps: the workflow did not create the `.venv`
required by the browser servers, and real-source tests expected ignored local PDF/geometry/reference
assets. Create the project venv in CI and explicitly run the cache-independent `software` browser project.
The default local suite continues to run both `software` and `reference`; no source acceptance is waived.
Run a data-free isolated checkout check before pushing. Execute browser cases serially after a parallel
run exposed camera/focus failures that both passed in isolation. Retain all failed logs and traces.


Dropdown verification complete:400 backend/45 frontend checks and full serial33 browser tests passed;
3 explicit opt-in audits remain not_run. Data-free copy passed398 backend (2 cached-geometry skips),
45 frontend and14 software browser tests. Actual10-set/13-booklet dropdown handoff, four widths,
loading/recovery and source/geometry viewer checked. Source/scene data and all17 engine job rows unchanged.
Checkpoint the complete existing engine/source dependency closure plus dropdown and CI repairs; create
the stated-default private GitHub repository, then use the existing code-only deployment command.
Do not activate unverified alpha content or manufacture release approval.

Container preflight found the new catalogue import needs `config/sets.json` in the frontend build stage;
copy that explicit file before Vite builds. Adapt the existing live cloud smoke script to select the
native dropdown, compare all ten labels with the catalogue/API, and use real supported sets for UI
checks. Unsupported-set verification stays a read-only lookup. Verify the actual Cloud Build result
and production page before recording release completion.

Release complete: private GitHub code commit `d2b45cd9ef9c1c27d138c603fc643be79ecd993c` passed fresh CI;
Cloud Build `31d81269-2919-46c9-a61d-3803635dba6b` succeeded. Public revision
`guide2build-web-00006-voz` serves100% traffic and passed actual desktop/mobile browser checks.
All10 catalogue option/API identities and19 official booklet entries match; no tutorials are published.
Private preview returns403 without authentication and private API probes return404. The initial desktop
capture preceded image readiness; retain it, wait for all four landing images/fonts, and inspect the final
loaded captures. Final page/console errors and warnings are0. Save release receipts and push this final
documentation/diagnostic checkpoint; no further application deployment is needed for that checkpoint.
The13 unverified alpha candidate booklets remain available at the user's4175 local preview. Next work
is reconstruction accuracy; no new inference, human acceptance or physical verification was performed.

## Publish the retained alpha models — 4 October 2026
The user clarified that production should include the3D models, not only the website code. Prepare the
same13 frozen source-assisted alpha candidates for all10 sets with explicit unverified provenance.
Primary owns integration, release CLI/source pins/contracts, actual bundle/render/staging evidence,
GitHub/deployment and the ledger. Backend worker owns release/API categories and backend regressions;
web worker owns public alpha disclosures/viewer transport and its targeted frontend/browser cases;
independent reviewer owns read-only asset/provenance/release auditing. Preserve all model poses/jobs.

Add a distinct `unverified_alpha` immutable release category. Preserve strict reviewed-tutorial gates,
exact-version authenticated publication approval, byte/hash verification and compare-and-swap heads.
Package only canonical scene chunks, model-render previews and licensed individual geometry/notices.
Official PDFs/crops, private prompts/evidence, credentials and reconstruction/review routes remain private.
Verify current official-source pins against retained bytes and prepare actual renderer previews. Test
tampering, stale manifests, alpha-label downgrade, official links, large scene transport, navigation,
desktop/mobile, WebGL/part failures and rollback eligibility. Prepare a concrete13-bundle release index
and complete code/bundle/browser/staging checks before any required exact-hash approval request.
After authorization for those immutable hashes, publish assets/heads and verify the real production
plane plus all13 booklet openings and representative large/mobile flows. Record any real blocker;
never mark publication permission as human assembly acceptance or alpha as automatic accuracy success.
