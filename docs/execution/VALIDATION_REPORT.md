# Version I implementation and validation — 2 October 2026

## Outcome

A runnable local application now supports set lookup, official-source preparation, persistent assisted jobs,
and an interactive, synchronized **PDF-assisted candidate** for all 12 printed main steps.
**Full Version I acceptance is not achieved.** The reference remains `needs_review`; runtime automatic
reconstruction is unavailable, and the first-four geometry/connector gate has not passed. No human or
physical verification is claimed.

| Dimension | Actual outcome |
|---|---|
| Scaffold/environment | Passed: real Python/npm installs and lockfiles; doctor; baseline 37 tests. |
| Local software E2E | Passed in the tested Chromium scope: real backend/source/geometry, candidate viewing, durable assisted job, correction contracts and UI. Not every acceptance item is complete. |
| PDF-assisted reference | Candidate represents 12/12 main steps, 16 microsteps, 32 physical instances, 18 candidate part designs. No main step has full geometry acceptance. |
| First four | Source-aligned candidate, 8 microsteps and 11 physical instances; 14 declared contact-frame coincidences pass. Hidden sockets and narrow-phase intersections remain unchecked. |
| Automatic conversion | Blocked/not run. No configured/authorized runtime provider. API returns 503 `provider_unavailable`; it does not replay the reference as an automatic result. |
| Human review | Not run; automated and declared local corrections cannot establish human acceptance. |
| Physical build | Not run. |

## Environment and reproducibility

macOS 26.6.2 arm64; Python 3.11.14; Node 22.14.0; npm 11.4.1; uv 0.9.2;
Codex CLI 0.158.0; Playwright Chromium 153.0.8010.12. No Git metadata exists in this folder,
so there is no branch/commit or GitHub issue mapping. No push, PR, publication, cloud resource or paid inference.

The sandbox denied uv cache access, then uv crashed in macOS system configuration even with a local cache.
Approved execution outside the sandbox completed installation. Loopback server/browser commands also needed
approved execution outside the sandbox. Normal local terminal startup uses the commands below.
An npm optional-peer resolver failure during the upgrade was repaired; the standard `npm install --cache
.cache/npm` was subsequently verified successful with zero audit vulnerabilities. No global installation.

## Official source and geometry

- Set **30669**, alternate booklet **02**, 8 pages and 12 printed main instructions.
- Official PDF: https://www.lego.com/cdn/product-assets/product.bi.additional.extra.pdf/30669_02_BI_Build_Alt.pdf
- Actual SHA-256: `6cb3e669fef3662dfd498cba0e631f1d9ec082c2bf8c0fb0a0febe303680a6b6`.
- Actual downloaded length: 2,386,631 bytes.
- Bytes/receipt: `var/sources/30669/alt-02/source.pdf`, `source.receipt.json`.
- Rendered pages: `var/public/pages/<source-hash>/`; page manifest records pixel sizes, hashes,
  renderer pypdfium2/5.13.0, scale 1.5 and top-left coordinates after page rotation.
- Geometry: 18 individual physical-part roots, **134 reachable part/primitive files plus one LDConfig**.
  `config/parts-30669-alt-02.json` pins origins/hashes. `var/public/ldraw/provenance.json` retains
  dependency relationships and actual notices. No complete community model or assembly sequence was obtained.
- Material-file notices are preserved as supplied; a missing file-specific license line is not invented.

## Reference revisions, source coverage and uncertainty

Current revision: **`pdf-assisted-30669-alt02-v3`**. All placements are labelled `pdf_assisted_authoring`.
Every instance has source evidence and pose rationale in `var/observations/30669-alt-02.json`.
The current scene and seven specific unresolved findings are in `var/reconstructions/30669/alt-02/`.
The API also retains generic candidate-mapping findings; 40 total items are currently returned.

Main steps 3 and 4 each preserve the booklet's two internal callout stages and attachment, with stable
physical IDs and zero newly counted pieces on attachment. Step 5's yellow inset is a single tapered-plate
orientation cue, not a connected subassembly; it stays visible in the source crop and real-part thumbnails.
No fictitious detached connected group was added for that inset.

Real rendered comparison caused two explicit correction rounds affecting **13 distinct physical instances**:

1. v1 → v2: seven instances corrected for actual transparent colour code, canopy origin, transverse tail
   jumpers, slope orientation and tailplane placement.
2. v2 → v3: six wing-subassembly instances corrected so main step 3 attaches the far wing and main step 4
   the near wing, matching the source sequence.

Original authored snapshots are retained in `config/reference-30669-alt-02-v1.json` and `-v2.json`.
Exact prior/new values, reasons and source references are in the `config/reference-corrections-*-v2.json`
and `-v3.json` logs; ignored revision archives and immutable SQLite revisions are also retained.
This is a corrected authored reference, **not unassisted reconstruction accuracy**.

Remaining findings: hidden first-four contacts; angled nose-tile origin; clear versus pale-blue canopy colour;
canopy contact/origin validation; jumper underside mould variant; and tailplane half-stud centring/contact.
LDraw code 40 was verified as transparent brown and replaced with candidate clear code 47; codes 39 and 43 remain
explicit alternatives. Fourteen developer-authored matching connector frames do not validate all connection
families, collision geometry, placement paths or physical strength. Global connector/geometry checks remain
`not_run` in the scene. These unresolved checks block acceptance even where the silhouette appears aligned.

## Implemented application and checks

- Curated set/guide validation; malformed and unsupported states; official source links; no upload UI.
- Atomic, bounded source download; preserved hash versions; redirect/type/signature/encoding controls;
  per-guide concurrent-write lock; isolated PDF rasterization with time/CPU/file/page/pixel limits.
  macOS memory control is a sampled RSS watchdog, not a hard address-space guarantee.
- WAL SQLite queue, transactional leases, events, cancellation, retry and source/reference-aware idempotency.
  Source hashes are checked before current-guide reads. Historical immutable revisions remain accessible.
- Typed corrections with expected revision, idempotency, actor/source/reason/prior-value audit, and structural
  revalidation; source-specific findings survive corrections. Reviewed and draft scene pointers are separate.
- Runtime scene/status validation; synchronized original crop/3D/parts; thumbnails from actual geometry;
  stable BOM; detached callouts and rigid attachment replay; seek, keyboard navigation, camera controls,
  reduced motion, responsive tabs, revision-scoped progress, named asset errors and WebGL fallback.
- Viewport cleanup disposes geometry/materials/listeners and stops its animation loop.

Independent review reproduced and repaired: unreceipted DAT files receiving official provenance;
root-only validation overlooking tampered primitives; compressed response allocation before byte checks;
and malformed job error objects crashing React. Regression tests cover those relevant boundaries.
Browser testing additionally found and repaired missing LDConfig, missing Three.js conditional-line material,
incorrect camera direction, and phone navigation overlapping camera controls.

## Actual test evidence

| Command/procedure | Result | Scope/evidence |
|---|---|---|
| `UV_CACHE_DIR=.cache/uv uv sync --extra dev` | Passed | Project-local .venv and real uv.lock. |
| `npm install --cache .cache/npm` | Passed | Real package-lock; final audit zero vulnerabilities. |
| `UV_CACHE_DIR=.cache/uv uv run python tools/doctor.py` | Passed | `var/evidence/setup/doctor.txt`. |
| `UV_CACHE_DIR=.cache/uv uv run python tools/check.py` | Passed | 78 Python tests; schema current; Ruff; TypeScript; 12 frontend tests; production build. `var/evidence/check-final.txt`. |
| `npm run test:e2e` | Passed | 9 Chromium tests, including real source/backend and clearly separate synthetic UI fixtures. All 16 source labels/crops/new-piece totals asserted. The final CSS phone refinement passed 2 targeted real integration tests, then the complete 9-test suite passed again; log: `var/evidence/browser-final.txt`. |
| Actual camera/replay checks | Passed | PNG changes after rotate/zoom/pan; reset restores baseline; detached and attached replay return exact settled pixels. |
| Real assisted worker | Passed, result `needs_review` | `var/evidence/integration/real-worker.json`: revision v3, six persisted events, duplicate submission same job, explicit source findings. v1/v2 results retained separately. |
| `uv run python tools/prepare_reference.py` | Passed on cached local assets | Reproduces labelled authored candidate after source/dependency hash checks. `var/evidence/integration/prepare-reference.txt`; this is not automatic inference. |
| Source/asset safety regressions | Passed | Concurrent writes, changed source, malformed/encoded PDF, invalid scale, traversal, missing/tampered dependencies/materials and missing receipts. |
| Durable recovery/cancellation | Passed in deterministic tests | Expired lease recovery, stale worker rejection, retained checkpoints, cancellation/retry. Actual process termination mid-render was not exercised. |
| Correction workflow | Passed in API and isolated browser tests | Immutable old revision, conflict, prior-value audit, invalid mapping, source finding retention; no fake human review of the target. |

Tests with synthetic scenes verify software only; they never constitute target reconstruction evidence.
Final warnings: Starlette's httpx test-client deprecation and a lazy Three.js viewer chunk above Vite's 500-kB
warning threshold. Neither warning was suppressed. The chunk is approximately 548 kB minified / 141 kB gzip.

## Browser evidence and performance limits

Desktop 1440×900 and phone 390×844 tested. Browser tool entry also inspected in the Codex in-app browser.
The standalone Browser plugin was not installed; the repository Playwright suite supplied repeatable testing.

- `var/evidence/browser/`: lookup, source found, early build, detached/attached callout, review, final candidate,
  phone layout and performance record.
- `var/evidence/browser/steps/`: all 16 source/render comparisons; `revision.json` identifies revision v3.
- `var/evidence/browser-v1/`: preserved pre-correction browser evidence.
- `var/evidence/reconstruction/`: `agent-inspection-v3.json` records actual inspection of all 16 browser states with a changes-requested decision; enlarged original panels, authoring comparisons and bounded check outputs.
  Offline painter images have occlusion artifacts; actual Three.js screenshots are the browser comparison evidence.

Measured values are in `var/evidence/browser/performance.json`. The observed cached load is 1.619 seconds;
requestAnimationFrame cadence 46.04 FPS; reopened renderer geometry counts 55, 55, 55.
This is a local headless Chromium sample, not a calibrated GPU/orbit benchmark, complete GPU-memory leak test,
or cross-device performance guarantee. Safari, a physical touch device and actual physical construction were
not tested. Browser fixtures cover unavailable WebGL/missing geometry/processing failures without faking the target.

## Exact local startup

From this folder:

```sh
uv sync --extra dev
npm install
uv run python tools/doctor.py
uv run python tools/prepare_reference.py  # first setup or rebuilding the authored candidate
uv run python tools/dev.py
```

Open **http://127.0.0.1:5173**, enter **30669**, and open **Alternate aeroplane — booklet 02**.
API health: **http://127.0.0.1:8000/api/v1/health**. The launcher starts API, worker and web server;
Ctrl-C stops their process groups. `UV_CACHE_DIR=.cache/uv` keeps uv's cache project-local.
After setup, `.venv/bin/python tools/dev.py` is an equivalent startup path when sandboxed uv itself fails.

```sh
uv run python tools/check.py
npx playwright install chromium
npm run test:e2e
```

## Remaining work / next executable action

Inspect the source-specific review findings alongside the saved v3 comparisons. Complete independently
supported connector metadata and narrow-phase intersection checks, resolve the remaining source ambiguities,
and use revisioned corrections for any changes. Do not promote the current candidate solely because its
software tests pass. A real authorized provider adapter, clean-source automatic evaluation and cost budget
are separate unfinished work; no automatic accuracy percentage can currently be reported. Human and physical
verification require actual external actions and remain `not_run`.

## Camera controls follow-up — 2 October 2026

User reported incorrect toolbar behavior while Reset view worked. Live-browser reproduction confirmed
that Zoom in moved the camera inside the final assembly. Both rotate and zoom handlers used a chained
Vector3 mutation which copied the orbit target into camera.position before calculating the offset;
the offset was therefore zero. Earlier screenshot-change checks missed this: a broken view also changes pixels.

Repair in `apps/web/src/camera.ts` and `components/AssemblyViewport.tsx`:
- Capture the camera-to-target vector before modifying the camera; preserve distance/elevation during rotation.
- Apply reciprocal zoom factors with model-relative minimum/maximum distances, shared with scroll zoom.
- Pan camera/target together by 10% of visible width, using the current camera orientation; add toolbar tooltips.
- Clear pending drag inertia using OrbitControls' public update API before buttons and reset, retaining the current
  displayed position. Reset retains the original framing and can cancel a moving drag.

Verification:
- `npm run check`: 18 frontend tests pass (6 new numerical camera regressions), TypeScript and production build pass.
  Evidence: `var/evidence/camera-check.txt`. Existing bundle-size advisory remains.
- Dedicated real-part browser regression passes: all six buttons, inverse pairs, 24 rotation clicks, 30 clicks at
  each zoom direction/limit, post-drag rotation, scroll then zoom/pan, and reset after a right-drag. Zoom limits
  stop additional motion; the model does not collapse or disappear. Evidence: `var/evidence/camera-browser.txt`.
- Rendered silhouette measured 35,874 pixels at reset, 54,384 after one zoom-in and 23,794 after zoom-out;
  pan changes horizontal centroid by about 69 pixels in the 692-pixel-wide canvas. Both rotations retain a
  bounded, visible model. Measurements and screenshots: `var/evidence/camera-controls/`.
- Live in-app browser also exercised all six controls and reset after reloading current code. A tab open during
  development retained the old handler until reload; users should refresh once to load the repair.
- Test development exposed an initial wait that completed before the lazy viewport mounted, capturing a temporary
  part thumbnail; now waits for the visible canvas and completion of geometry loading. The default 30-second
  test timeout was insufficient for the stress sequence under parallel rendering; this test allows 90 seconds.

This repair concerns camera interaction only. Source reconstruction, human review and physical verification
retain their previously documented incomplete status. No Python/backend changes were made in this follow-up.

Final combined rerun: `npm run test:e2e` — **10 passed in 47.2 seconds**, including existing
navigation, replay, persistence, mobile layout and error-state tests. Evidence: `var/evidence/camera-browser-full.txt`.

## Review panel usability follow-up — 2 October 2026

User correctly identified the repeated warning list as confusing. The API generated one default mapping
finding for each of the 32 physical instances; the UI discarded the displayed identities and rendered the
same message 32 times. The technical editor also lacked a clear explanation of its audience and purpose.

The panel now describes its optional reviewer/correction purpose, defaults to findings for the current
instruction, and supports All instructions. The real v3 revision retains **40 records**, displayed as
**9 grouped topics** when showing all instructions. Grouping uses kind, message and status; distinct
messages/statuses are never collapsed together or resolved. Individual record IDs, piece IDs, part/colour
values and source-page links remain expandable. Mapping findings with empty step_ids link to the step
that introduces that physical instance. Inspect links navigate the synchronized source/assembly and
select the relevant piece in the correction editor. Multi-piece details and Advanced corrections are
collapsed initially. Whole-assembly status remains separate from successful structural validation.

Loading, load failure with Retry, and a genuinely empty response have separate states. The empty state
explicitly does not establish verification. No backend findings, poses, source evidence, review status,
correction semantics or immutable revision records were changed.

Validation commands and evidence:
- `npm run check`: frontend numerical/grouping tests, TypeScript and production build.
  `var/evidence/review-check.txt`.
- `npm run test:e2e -- tests/e2e/review.spec.ts tests/e2e/viewer.spec.ts`: real v3 40-record/9-topic counts,
  32 separately expandable mapping records, final-step-to-first-step navigation, selected physical piece,
  current-instruction filtering, desktop/phone layout, load-failure retry, plus existing synthetic
  correction conflict/draft retention, new revision, navigation, persistence, and error-state checks.
  `var/evidence/review-browser.txt`. Synthetic fixtures prove UI behavior, not reconstruction accuracy.
- Rendered screenshots inspected: `var/evidence/review-panel/current-instruction.png`, `all-topics.png`,
  and `phone.png`. Screenshots show the actual candidate; all original reconstruction limitations remain.

Test development: exact getByLabel matching included nested select-option text, so the browser assertion
uses the accessible combobox role. The failure fixture originally answered only its first request with an
error, but React StrictMode performs a development remount; it now retains failure until explicit Retry.
Neither issue represents a fabricated service failure or a change to source findings.

Final review follow-up results: **21 frontend tests pass**, TypeScript/build pass (existing bundle-size
advisory remains), and **6 targeted browser tests pass in 6.7 seconds**. No Python changes or backend test rerun.

## Stable Next/Previous positions — 2 October 2026

Reproduced the reported 11 → 12 transition (printed main steps 7 → 8). At a 1440×1100 browser viewport,
Next and Previous moved from y=852.59375 to y=909.15625: **56.5625 pixels downward**. The extra part-list
rows expanded the grid. Shared piece poses were unchanged in the underlying snapshots.

The workspace now has stable row heights at desktop/tablet sizes and a stable active-panel height on
phones. Guide and parts panels scroll independently and can receive keyboard focus. Long content remains
available without stretching the workspace and moving navigation. Phone 3D height adapts inside its pane.
This change does not alter assembly snapshots or existing camera behavior.

Verification:
- Exact button rectangles match at **y=854 px** through 11 → 12 → 11 after repair at 1440×1100.
- All 16 instructions checked at widths 1440, 900 and 390; document-space button positions stay constant.
  Phone Guide/Pieces/3D tab switches also retain navigation position. No horizontal page overflow.
- `npm run check`: **21 frontend tests pass**, TypeScript and production build pass; existing bundle advisory.
- `npm run test:e2e -- tests/e2e/navigation.spec.ts tests/e2e/integration.spec.ts tests/e2e/viewer.spec.ts`:
  **7 tests pass in 28.6 seconds**, including real-source navigation/replay/persistence, phone viewport bounds,
  correction conflict handling and error states.
- Evidence: `var/evidence/navigation-check.txt`, `navigation-browser.txt`, and `navigation-position/`.
  `before-repair.json` preserves original movement; `positions.json` records repaired rectangles.
  Instruction 11/12 and desktop/tablet/phone captures retained. Desktop instruction 12 and phone screenshots
  visually inspected. Source reconstruction and acceptance limitations remain as previously recorded.

## Full-build playback — 3 October 2026

Added a separate **Play full build** button below the ordinary navigation, available at every instruction.
It restarts at the first snapshot and plays every instruction in order, using 1.8-second placement
animations and a 1-second hold per completed instruction. The existing Replay remains a 700 ms replay
of the current instruction. Pieces introduced together in one instruction animate together; existing
rigid subassembly attachments remain rigid. Motion is a visual aid, not a verified physical insertion path.

Full playback uses one camera framing covering all snapshot positions and the placement approach area.
Source crop, parts list, instruction selection and saved progress follow the current snapshot. Pause
freezes animation time and advancement; Resume continues, Stop settles the current snapshot. Next,
Previous, keyboard navigation, seeking or current-instruction Replay end full playback. Opening review
pauses it; a hidden tab also requests pause. Geometry loading/errors disable starting full playback.
Reduced motion uses completed snapshots with the hold between instructions, without moving pieces.
Finishing playback does not change candidate, review, geometry or physical verification status.

Verified with real source and local geometry:
- Full 16-instruction run, including both subassembly attachment steps, observed in order. Run duration
  46,724 ms including the tested pause; no page errors. Source crop/step IDs and introduced-piece quantities
  checked at each step. Reset final camera then pixel-compare with the manually selected final snapshot:
  exact match. Reload retains the final instruction and does not restart autoplay.
- During a mid-animation pause, screenshot stayed identical for 700 ms and the instruction stayed fixed.
- Phone: Stop cancels motion and timers; seeking cancels advancement; ordinary Replay still works;
  restarting begins at instruction 1; Next exits full playback. No horizontal overflow.
- Reduced-motion playback advances without animation and pauses on its current instruction.
- Missing geometry and unavailable WebGL keep full playback disabled.
- `npm run check`: **21 frontend tests pass**, TypeScript and production build pass. Existing bundle-size
  advisory remains. `var/evidence/full-build-check.txt`.
- `npm run test:e2e -- tests/e2e/full-build.spec.ts tests/e2e/viewer.spec.ts`: **7 passed**.
  `var/evidence/full-build-browser.txt`. The complete real-source test took 50.6 seconds including setup/reload.
- Evidence: `var/evidence/full-build/complete-run.json`, paused/callout/attachment/final/phone screenshots.
  Attachment and phone captures visually inspected. Tab-hide pause is implemented but not separately
  exercised by these tests. No automatic reconstruction or physical assembly acceptance is implied.

Related regression rerun: `npm run test:e2e -- tests/e2e/integration.spec.ts tests/e2e/navigation.spec.ts`
— **3 passed in 22.0 seconds**. Existing source/parts sync, callout Replay, progress persistence, phone
viewport bounds and stable Next/Previous positions remain verified. Evidence: `var/evidence/full-build-regression.txt`.

## Compact status — 3 October 2026

Removed the large candidate banner at the user's request. Origin/review status remains a small label
beside the title; coverage, authorship, human acceptance and physical status moved to the existing
collapsed Source, revision and checks section. No source/review data or verification states changed.

`npm run build`: TypeScript and production build pass; existing bundle-size advisory remains.
`npm run test:e2e -- tests/e2e/integration.spec.ts tests/e2e/viewer.spec.ts`: **6 passed in 14.9 seconds**.
Updated tests explicitly verify the compact label, absence of the old banner and retained expanded details.
Actual desktop and phone renders inspected. Evidence: `var/evidence/compact-status-build.txt`,
`var/evidence/compact-status-browser.txt`, and `var/evidence/compact-status/{desktop,phone}.png`.

## Source-aware placement animation — 3 October 2026

The user's instruction 9 report was correct: printed step 5 (official PDF page 4) puts the two red
plates beneath the white wings. The former universal +60 Y starting offset animated those plates
through the model. A callout arrow points to the destination; it must not be interpreted as a literal
physical insertion trajectory. All official step panels on pages 2–7 were inspected during this repair.

Implemented source/revision-bound, agent-authored presentation annotations in
`config/placement-30669-alt-02-v3.json`. These are source-assisted display directions, not automatic
reconstruction or verified physical assembly paths. Changed source/revision/active identities or unknown
steps fall back to in-place highlighting. Snapshot coordinates, source evidence and review status are unchanged.

`placement.ts` checks a proposed straight, axis-aligned approach against the real loaded part bounds.
The swept bounds cannot intersect an existing part beyond their final contact envelope. If that conservative
broad-phase check rejects an approach, the entire active group highlights at its final pose. It does not
try another guessed direction. This may reject physically possible routes through hollow geometry.
It does not prove narrow-phase clearance, connector engagement, physical feasibility, or final-pose validity.
Known underside annotations use -60 Y starts and move upward. Group members share the same offset and
retain final orientation; there is no unreviewed rotation or interpolation across the existing main assembly.

Actual 16-instruction browser audit:
- Instruction 9 translates from below. Red pixels' centroid moves from y=302.57 in an approach capture
  to y=273.93 at rest; the settled red-pixel count/centroid exactly match the initial final-state capture.
  Approach and final renders visually inspected side by side.
- Instructions 2, 5 and 8 use the blocked-approach fallback. This is conservative uncertainty, not a
  physical collision verdict. Instructions 1, 3 and 6 show starting pieces in place. Remaining steps
  translate from their source-assisted upper approach. Individual outcomes retained in `placement/audit.json`.
- Both ordinary Replay and full-build playback use the same policy. Unknown direction shows
  “Shown in place — follow the guide for attachment.” Initial pieces show “Start with the highlighted pieces.”
- Full 16-instruction playback, pause/resume, stop, manual cancellation, reduced motion and final snapshot
  equality pass. Full playback framing includes approach space above and below. Physical/candidate status
  remains unchanged.

Validation:
- `npm run check`: **26 frontend tests pass**, including lower-vs-upper travel, intervening obstacle,
  whole-group rejection, unsupported diagonal travel and source/revision pinning. TypeScript/build pass;
  existing bundle advisory remains. `var/evidence/placement-check.txt`.
- `npm run test:e2e -- tests/e2e/placement.spec.ts tests/e2e/full-build.spec.ts --workers=1`:
  **4 passed**. Complete playback test 50.3 seconds; all-step motion audit 17.4 seconds.
  `var/evidence/placement-browser.txt` and `var/evidence/placement/`.
- Test development: element-screenshot stability waits missed the 700 ms Replay while rendering in
  parallel. The motion capture now uses a page screenshot clipped to the viewport immediately after
  Replay. The old full-playback assertion expected the starting pieces to fly; it now explicitly checks
  the in-place policy, while the red-piece test checks visible travel. Final-state equality remains required.

Final related regression: `npm run test:e2e -- tests/e2e/integration.spec.ts` — **2 passed in 12.7 seconds**.
Source synchronization, callout final snapshots, camera controls, navigation, persistence and phone layout
remain verified. Evidence: `var/evidence/placement-regression.txt`.

## Open Studio redesign — 3 October 2026

Implemented the user's selected second concept: compact header, single left instruction/source/parts rail, large pale model stage, floating camera toolbar and one bottom navigation dock. Twelve main-step buttons preserve all sixteen microsteps and detached/attachment callouts. Phone panels retain common instruction context, keyboard tab navigation and stable controls. Review stays beside the model on wide desktops and uses a native modal dialog at overlay widths, with Escape, focus restoration and dismissal when inspecting a finding.

Real source crops, real individual LDraw geometry and material names remain authoritative. The generated concept is visual guidance only. No assembly identities, poses, source hashes, review events or provider behavior were changed. The renderer uses refined lighting, reduced ordinary edge opacity, per-part framing and a subtle presentation-only shadow receiver excluded from assembly bounds. Shadows are cached, and unchanged/paused/hidden views no longer redraw continuously; damping and playback still tick.

Validation on final code:
- Existing `.venv/bin/python tools/check.py`: 78 Python tests, generated-schema freshness, lint, 26 frontend tests, TypeScript and production build pass. `var/evidence/open-studio/full-check.txt`.
- Final `npm run check`: 26 frontend tests, TypeScript and production build pass. `var/evidence/open-studio/frontend-final-check.txt`. The existing large Three.js bundle advisory remains.
- Final `npm run test:e2e -- --workers=1`: **18 passed in 2.3 minutes**, no skips. Includes all real instructions, source/BOM synchronization, callouts, camera stress, playback/pause/stop/reduced motion, exact final snapshots, reviewer conflict/retry, responsive layout, grouped main steps and keyboard/modal semantics. `var/evidence/open-studio/browser-verified.txt`.
- Manual live inspection: desktop at 1488×1056, phone at 390×844, source and parts panels, detached callout, wide/overlay review; Inspect closes phone review and exposes its instruction. Final browser error/warning log empty. Independent code recheck closed all three prior P2 review/tab findings.
- Design comparison: selected-reference.png and desktop-final.png at matching 1488×1056; phone-callout-final.png, phone-guide-final.png and phone-pieces-final.png confirm final mobile spacing and legibility. Earlier rejected screenshots are retained and identified in `design-qa.md`.

Test repair evidence: the first broad run had two global timeouts and a 700ms replay screenshot arriving after motion had ended. Long-run timeout budgets were adjusted; navigation rectangle reads batched; placement uses the browser clock to capture a known 100ms rendered frame. Exact pixel assertions remain. Floating overlay UI is hidden only for renderer-only PNG comparisons. After the dirty-render gate, camera stress fell from 2.7 minutes to 17.9 seconds in this local run; this is test timing, not a general GPU benchmark. Final complete suite is green.

This validates the implemented UI and software flows. Assembly remains `needs_review`; automatic reconstruction accuracy, human acceptance, connector/physical validity and physical testing are unchanged. Safari, real-device touch and a complete screen-reader audit were not run. No deployment or publication performed.

## Brick Playground landing — 3 October 2026

Implemented the first selected landing concept: yellow hero, colourful brick-plane illustration, prominent
set-number search, direct supported-plane shortcut, and three illustrated workflow steps. The shortcut
resolves the real catalogue entry and alt-02 guide through existing APIs, retains unavailable-reconstruction
preparation, and never manufactures a scene. Results and errors receive focus; returning from the tutorial
focuses the found set, while entering the tutorial resets page scroll.

Four individually generated decorative images were converted to WebP (556,990 bytes total); originals
and selected reference remain in ignored evidence. Visible labels distinguish artwork from source/model
evidence. Inter is self-hosted under a landing-only font alias with its OFL license. No new dependency,
tutorial renderer/style change, assembly edit or external runtime font request was introduced.

Validation:
- `npm run check`: 26 frontend tests, TypeScript and production build pass.
  `var/evidence/landing-playground/check-final.txt`. Final CSS build also passes (`build-final.txt`).
- `npm run test:e2e -- tests/e2e/landing.spec.ts tests/e2e/starter.spec.ts tests/e2e/integration.spec.ts --workers=1`:
  8 passed in 19.2 seconds. Covers valid/malformed/unsupported lookup, direct example, unavailable-scene
  preparation, retry/cancel, result/error focus, return, all 16 real tutorial instructions, source/BOM,
  camera/callout/review, reload and resume. `browser-final.txt` in the same evidence directory.
- Focused responsive/shortcut rerun: 3 passed in 3.8 seconds (`responsive-final.txt`).
- Browser widths 1199, 768, 390 and 320: no horizontal overflow; images load, search stays visible and
  How it works reaches the explanation. Manual desktop/tablet/phone, lookup response and tutorial entry
  inspected. Final captured browser error/warning log empty.
- Paired comparison with the chosen reference passed. Fixed initial headline/image crowding, tablet
  cropping and small-phone caption overlap. `design-qa.md` records iterations and intentional differences.

Limits: viewport-emulated Chromium only; Safari, physical phone touch and full screen-reader audit not
run. Existing Three.js bundle advisory remains. Backend/Python implementation unchanged and its tests
were not rerun for this frontend-only slice. Source coverage, reconstruction accuracy, human acceptance,
connector/physical verification and automated provider status remain unchanged. No deployment/publishing.

## Yellow-blue consistency and substep fixes — 3 October 2026

Applied the selected Brick Playground palette and self-hosted font across the tutorial header,
instruction context, navigation, mobile tabs, reviewer heading and preparation workflow. Neutral
source/model surfaces and actual LDraw colours remain legible. Find my set now opens a compact
native booklet dialog with a yellow heading and blue tutorial action, bounded phone scrolling,
keyboard focus wrapping, Escape/close and focus restoration. Malformed/unsupported lookup errors
remain inline. Dismissed asynchronous work cannot reopen the tutorial, disable the next lookup or
overwrite its error; server-side preparation remains resumable.

Reproduction found a 52.8px downward shift in Step 3's substep buttons/source panel at 1440px,
caused by longer Attach copy. Invisible, aria-hidden sibling text now reserves the actual required
height without truncating instructions; phone context also reserves room. Part 1/Part 2/Attach use
shared immutable snapshot bounds for framing and lighting, preserving manual orbit between siblings.
The attachment's true geometry still moves to its authored pose; its camera no longer jumps.

Replay was firing, but starting-pieces/blocked-approach steps had only a subtle 700ms outline.
These now give two visible pulses over 1.8s on the actual part surfaces plus explanatory status.
Original part materials/poses are restored exactly. The conservative path guard remains intact;
translated replay remains 700ms and full-build timing remains 1.8s per instruction. Reduced-motion
mode stays still and explains the result. Replay is disabled until geometry is ready.

Evidence and final check counts are recorded in PROGRESS.json and var/evidence/theme-consistency/.
No assembly/source data, human-review status, provider setup or physical-test status was changed.

Checks:
- Existing `.venv/bin/python tools/check.py`: 78 backend tests, schema freshness, lint, 26 frontend
  tests, TypeScript and build passed (`check.log`). `uv` could not access its global cache in the
  sandbox; the already-installed project virtual environment ran the same check script.
- Final `npm run check`: 26 frontend tests, TypeScript and production build passed (`frontend-final.log`).
- Full browser run: 23/26 passed. Three older test assumptions were corrected: wait for Replay to
  enter playing before waiting for idle; select visible instruction copy rather than hidden sizing
  paragraphs; assert Replay disabled when the synthetic fixture deliberately has no geometry.
  All seven tests in the three affected files then passed (`updated-regressions.log`). All 26 unique
  browser tests have passed, with no skipped coverage. Original failure log retained.
- New checks: desktop/phone dialog focus cycle, Escape/restoration, 320px fit; delayed-request
  dismissal; exact substep/panel/control rectangles across 1440/900/390/320px for Steps 3 and 4;
  actual camera frame stability/manual orbit; rendered replay pulses, exact final PNG restoration,
  reduced motion. Existing all-16 motion-outcome and full-build checks pass.
- Manual live inspection: final popup, Step 3/Attach, replay status, desktop review and 390×844
  phone Attach. Final browser error/warning log empty. Screenshots in theme-consistency directory.
- Independent code review found the pending-dismiss issue; corrected and independently rechecked.

Limitations: Chromium viewport emulation, not physical-device/Safari or complete screen-reader testing.
Existing Three.js large-chunk build advisory remains. No deployment or publication performed.

## Ten-set release audit — 3 October 2026

See TEN_SET_RELEASE_REPORT.md and TEN_SET_SOURCE_MATRIX.md for the complete measured matrix.
Actual app/API audit: one candidate available, nine unsupported; zero accepted tutorials; automatic
conversion503provider_unavailable. Selected3simple/3medium/4complex sets were all exercised. Four
selected official PDFs downloaded/rendered176pages; six rejected by the existing20MiB cap. No source
limit/catalogue/provider was changed and no missing model was substituted.

Production-preview native Apple M3/Metal: desktop59.86 actual render submissions/s, GPU mixed-workload
p951.617ms, cold-HTTP workflow2.395s/warm0.922s. Phone emulation on the same GPU59.73/s and GPU p951.248ms;
physical phones untested. All16microsteps exercised, five reopen cycles stable, disposal counts0/0,
and stationary idle0render submissions. Software fallback desktop26.68/s misses30FPS; report separates
that SwiftShader result from native GPU. VRAM bytes/utilization not measured. Performance is one32-piece
candidate, not evidence of large-set rendering or reconstruction correctness.

Checks:78 Python +26 frontend tests; schema/lint/typecheck/build pass;27 browser regressions pass.
Two opt-in benchmark cases are skipped in normal suites and passed separately in bothsoftware/native
profiles (four runs). Evidence:var/evidence/ten-set-release. Full-source/model/human/physical acceptance
remains unchanged and blocked as recorded. No production deployment/publication performed.

## Bounded ten-set source preparation — 3 October 2026

Authorized limits and reliability changes completed. The current catalogue resolves all ten selected
sets and19observed official booklets. Fresh worker jobs using private source snapshots prepared all
2,231pages; finalpage API checks passed19/19, including indices above249. Real42171 cancellation retained
25verified pages; retry completed360pages without rewriting the first retained page.

Configurable256MiB/1000-page budgets retain24MP/page,150MP/batch,1.5GiB child memory and60CPU/90wall seconds.
Source checksums, cancellation, lease heartbeats, output quotas and manifest-only page access remain
bounded. Three independent review findings were fixed:static access bypass, initial source identity
race, and changed-source resume poisoning. Reviewer independently reproduced their resolution.

`.venv/bin/python tools/check.py`:108backend tests,27frontend tests, schema/lint/typecheck/build pass.
Full browser suite:28passed,2opt-in performance cases skipped; final wording recheck:1passed. Actual
booklet selection/prepared state inspected on desktop and mocked mobile lifecycle tested/inspected.
Evidence and per-set totals:[LARGE_SOURCE_PREPARATION.md](LARGE_SOURCE_PREPARATION.md), with raw receipts,
source outcomes, livejobs, cancellation events, browser results and screenshots in
`var/evidence/large-source-pipeline/`. Original smaller-limit audit is preserved separately.

Source preparation is passed; nine new3Dreconstructions remain unavailable. Existing30669candidate
and all assembly acceptance fields are unchanged. No new GPU workload, automatic-conversion accuracy,
human acceptance, physical-build result or public production release is claimed.

## Actual ten-set construction attempts — 3 October 2026
Fresh PDF-assisted construction was attempted for 3 small, 3 medium and 4 large sets. Eleven partial candidates passed structural/provenance checks and actual native-GPU browser rendering; all remained incomplete and needs_review. Zero complete or accepted tutorials, zero unassisted automatic conversion runs. The final browser pass was 11/11; the software check passed 108 backend and 27 frontend tests plus lint/schema/typecheck/build.

Native Apple M3 orbit rendering was 59.83–59.97 frames/s, HTTP-cold prepared-candidate loading 0.929–1.618 seconds, and sampled mixed-workload GPU p95 0.904–3.106 ms. Scope is only 3–66 real pieces per candidate; full-set GPU/VRAM and full 100-page construction latency are not established. Source-versus-render review found real assembly failures despite renderer passes.

Full outcomes, denominators, overlapping authoring intervals, exact evidence and blockers: [TEN_SET_CONSTRUCTION_BENCHMARK.md](TEN_SET_CONSTRUCTION_BENCHMARK.md). Production catalogue and existing30669alt02 scene unchanged.

## Cloud/batch checkpoint — 3 October 2026

See [CLOUD_RELEASE_REPORT.md](CLOUD_RELEASE_REPORT.md) for the current implementation, exact cloud endpoints, 19-booklet inventory and incomplete acceptance gates.

159 backend +34 frontend +31 browser tests pass; three opt-in benchmarks skipped. The full browser suite used isolated artifacts after earlier overlapping runs collided. A real source-panel collapse during Part/Attach was repaired; no physical assembly claim follows from layout tests. Exact frozen-snapshot playback assertions remain.

Public Cloud Run desktop/phone browser checks pass, private preview rejects anonymous traffic, authenticated proxy works, persisted requests were read back from the dedicated requests database, and no PDF or crop bytes were requested by the public UI. Existing Krishi spec/generation and default Firestore configuration are unchanged. Website code is live; zero tutorials are approved/published.

Fresh automatic pilot:2/12 main steps,5 pieces,16 model calls/781.253 active seconds including development retries. Complete-set latency and native-GPU measurements remain unestablished. The deterministic assembly-checker registry is empty and fails closed; all other18 jobs stay queued behind the pilot gate. This does not meet full reconstruction or end-to-end accepted-content pipeline acceptance.

### Resume and context-input repair

Verified actual restart from the saved two-panel checkpoint. First call reproduced attachment/tile ambiguity; second used bounded hash-checked Subpart definitions and preceding-page context. It still blocked on attachment offset/height, so no additional panel or tutorial success is claimed.161backend tests, schema drift check and changed-file Ruff checks passed; frontend was unchanged. A wrapper/subpart tamper-and-budget regression and resumed cross-page image-order regression cover the repair. Raw calls and final metrics are retained in `var/evidence/engine-resume-result.json`; no cloud deployment/publication was performed for these local engine changes.
