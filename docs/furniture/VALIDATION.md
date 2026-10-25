# Furniture pilot validation — 25 October 2026

Branch: `codex/ikea-assembly-assistant`, based on `2b59ca7`. Changes are local and
uncommitted. No push, merge, deployment or publication occurred.

## Delivered behavior

The `/furniture` portal finds and confirms LACK white 55 × 55 cm (304.499.08), then
provides all five authored explanatory stages, synchronized official source pages,
schematic Three.js illustrations, hardware identification, warnings, contextual help,
camera controls, highlight replay and source/revision-scoped local progress.
The API is read-only and separate from the LEGO API. Three PDFs/six pages are pinned,
cached and hash-checked. Human and physical checks remain `not_run`.

## Results

| Dimension | Outcome and evidence |
|---|---|
| Furniture software E2E | Passed: 5 Playwright tests against real local API and prepared source assets, with explicit image/tutorial/WebGL failure injection tests. `var/evidence/furniture/browser-tests.log` |
| Backend regression | 485 passed, 2 optional retained-geometry tests deselected because their old local cache was unavailable as cloud placeholders. `full-check.log` |
| Frontend regression | 54 tests passed across 9 files, including 6 furniture contract/progress tests. Typecheck and Vite build passed. `full-check.log` |
| Schema and lint | Existing generated schemas current; Ruff passed; `git diff --check` passed. |
| LEGO browser software | 16 existing tests passed; includes lookup, preparation, playback, public portal, review, phone and WebGL failure. `lego-browser-regressions.log` |
| Source preparation | Three original PDFs, six rendered pages. Repeated preparation reused verified content-addressed cache. `preparation.json`, document manifests under `var/furniture/documents/` |
| Instruction/source coverage | Agent checked the complete English diagram, quantities, safety and care content. Five stages are explanatory subdivisions of an unnumbered assembly sheet. `SOURCES.md`, `SOURCE_REVIEW.json` |
| Automatic reconstruction | Not in scope. This is authored PDF-assisted guidance with schematic geometry. |
| Human review / physical assembly | Both `not_run`. No measured CAD, connector validity, strength or physical success claim. |

## Browser inspection

Chromium via repository Playwright; desktop 1440 × 1000 and phone viewport 390 × 844.
Browser plugin was unavailable; regular Playwright was used. All five tutorial stage
screenshots were visually compared with their referenced source. Browser title/content,
source image loads, camera rotation, zoom/reset, contextual help, keyboard step selection,
next/previous, final state, reload/resume and reduced motion were exercised. The primary
flow captured no JavaScript or console errors. Deliberate failure tests are reported
separately and do not imply a clean network during injected failures.

Reviewed captures under `var/evidence/furniture/`: `desktop-landing.png`,
`desktop-step-1.png` through `desktop-step-5.png`, `phone-source.png`, `phone-model.png`.
The small source panel opens a full-size original PDF. The phone switches between
diagram and 3D; fixed bottom navigation remains available while the content scrolls.

Corrections verified during review: proper 2021 care notice; separate warning-page
provenance; four-part hardware layout with actual highlight targets; one animation-frame
chain; per-network-chunk download budget checks; action-aware guide retry; official PDF
fallback; persistent safety limits; hover contrast and phone navigation fixes.

## Commands and bounded exclusions

Preparation:

```sh
uv run python tools/prepare_furniture.py
```

The complete unfiltered check was attempted but blocked reading the retained LEGO
`var/public/ldraw/provenance.json` cloud placeholder. The completed software check used:

```sh
PYTHONPYCACHEPREFIX="$PWD/var/furniture/pycache" \
PYTEST_ADDOPTS='-k "not test_available_individual_cache_matches_all_pilot_metadata_pins and not test_available_pilot_external_studs_follow_individual_dat_transforms"' \
uv run python tools/check.py
```

Final furniture browser check:

```sh
npm run test:e2e -- tests/e2e/furniture.spec.ts --project=reference
```

Existing software regressions:

```sh
PYTHONPYCACHEPREFIX="$PWD/var/furniture/pycache" npm run test:e2e -- \
  tests/e2e/booklet-preparation.spec.ts tests/e2e/chunked-playback.spec.ts \
  tests/e2e/public-portal.spec.ts tests/e2e/starter.spec.ts \
  tests/e2e/viewer.spec.ts tests/e2e/public-alpha.spec.ts --project=software
```

The live LEGO ten-set readiness audit and retained-geometry browser suite were not
completed; they rely on older local source/geometry state outside this pilot. No new
LEGO reconstruction correctness or production-runtime claim follows from these tests.
Safari, actual touch hardware, full screen-reader testing and physical assembly were not run.

## Environment recovery and preservation

macOS marked installed dependencies and 108 unchanged tracked files as `dataless`.
Process sampling and open-file inspection showed stalled reads, not test assertions.
Original dependencies, Python bytecode caches and placeholders were moved into ignored
`var/furniture/dependency-backup/`; no originals were deleted. Locked dependencies were
restored with `uv sync --frozen --extra dev` and `npm ci --cache var/furniture/npm-cache`.
The local npm cache avoided a root-owned global cache without changing system permissions.
Unchanged tracked placeholders were restored from their exact Git blobs, with a manifest
in `hydrated-tracked-files.json`. Lockfiles, LEGO catalogue and generated contracts remain
byte-identical to baseline.

An initial LEGO browser test timed out writing over an old cloud-placeholder screenshot.
The old evidence targets were preserved under `dependency-backup/prior-evidence` and the
rerun passed. Initial timeout trace/log are retained in this pilot's evidence directory.

Non-failing warnings: existing FastAPI/Starlette test-client deprecation; Vite shared
Three.js chunk size above 500 kB; Playwright colour-environment warning. Dependency install
reported four audit advisories (three moderate, one high) in the existing locked tree;
dependencies were not upgraded as part of this isolated local feature.

## Next evidence gate

Observe a person assembling this exact LACK variant using the tutorial. Record their
revision, points of confusion, mistakes, assistance requests and completion before making
claims about improved assembly time, fewer errors or demonstrated practical usefulness.

## Neutral palette and three-finish follow-up (2026-10-25)

Implemented and source-checked white 30449908, black-brown 80104268 and white stained
oak effect 70319028 on the local IKEA branch. See FINISHES.md for source differences,
exact downloaded hashes, approximate material rendering and article-scoped progress/voice.

Checks retained in `var/evidence/furniture-finishes/`:

- `.venv/bin/python tools/check.py`: passed; 524 backend tests, schema drift and Ruff checks,
  frontend checks/build (100 frontend tests at that checkpoint).
- Final `npm run check`: passed with 105 frontend tests and the existing >500 kB chunk warning.
- Initial furniture browser regression: 84/87 passed. Three old assertions assumed a
  single result or document URLs without article identity; these were corrected to test
  the selected white article and article-qualified links without dropping resume checks.
- Final targeted browser run: 17/17 passed (all five legacy portal tests and twelve
  finish-specific tests). Includes real-source lookup/deep links, independent progress,
  failed-source retry, mocked voice resource cleanup/article binding, 320px selector,
  rendered label contrast and desktop/phone source panels.
- Twenty final screenshots: preparation, active connection and finished table for each
  finish at desktop/phone sizes, plus narrow oak header and three-finish catalogue.
  Retained runtime evidence contains no page errors, console errors or failed requests
  for the six normal article/viewport capture cases.
- Selected opaque palette pairs meet 4.5:1 text contrast. This is not a full accessibility
  audit or proof of real-device assistive technology support.

No new live paid voice inference, deployment, publication, push or merge. Human source
review and physical assembly remain not_run. Geometry/finish rendering remains schematic.

LEGO compatibility: `npx playwright test --project=software` passed 17/17. Across the
initial regression and corrected targeted run, all 89 unique furniture cases passed.
