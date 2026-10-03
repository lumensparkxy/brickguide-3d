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
