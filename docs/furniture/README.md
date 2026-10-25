# Furniture Assembly Assistant

Local guided assembly for IKEA LACK white 55 × 55 cm, article **304.499.08**.
This branch adds `/ikea` beside the LEGO app at `/lego` and the project showcase at `/`.

## Run locally

From the repository root, prepare the pinned official documents:

```sh
uv run python tools/prepare_furniture.py
```

The command uses verified local originals when present, otherwise downloads the three
explicit official URLs. It renders the pages and writes a content-addressed cache under
`var/furniture/`. If IKEA changes the bytes, preparation stops for source review.
Nothing is fetched or reconstructed in response to a browser API request.

Start the API and frontend in separate terminals:

```sh
PYTHONPATH=apps/api/src uv run uvicorn guide2build.main:app --host 127.0.0.1 --port 8000
```

```sh
npm run dev
```

Open [the local furniture assistant](http://127.0.0.1:5173/ikea).
Search for `LACK` or `304.499.08`, check the white 55 × 55 cm variant, then open its guide.
The authored tutorial needs no inference service, worker, API key or account. Optional voice
uses the server-side `GEMINI_API_KEY` and requires available API credit. Keep services on loopback.

## What it provides

- Eleven source-linked coach actions: preparation, parts, eight screw/leg actions and final checks.
- Explicit user confirmation, separate viewing progress, and revision-isolated local resume.
- The earlier five-stage workspace remains available via `experience=legacy`.
- Original official pages, full PDFs, direct manufacturer links and hardware identification.
- Schematic 3D views, rotate/zoom/reset, clickable part labels, navigation and source-bound local resume.
- One-action autoplay with stable Play/Pause, Replay and Done controls; secondary speed and seeking.
- Persistent part labels, numbered corner markers and an upright finished-table view.
- Contextual help, explicit missing-source states and readable instructions without WebGL.

Overall size is documented; component thickness, offsets and fastener details are schematic.
The 3D view does not certify a connection, physical strength or the assembled furniture.
The source register explains these boundaries in [SOURCES.md](SOURCES.md).

## Check

```sh
uv run python tools/check.py
npm run test:e2e -- tests/e2e/furniture-coach.spec.ts tests/e2e/furniture.spec.ts tests/e2e/furniture-animation.spec.ts tests/e2e/furniture-full-assembly.spec.ts --project=reference
```

The furniture browser suite requires the prepared local documents. Its main tutorial flow
uses the real backend; explicit failure tests simulate unavailable images/WebGL. Existing
LEGO browser tests retain their original scopes and distinguish mocks from reference tests.
Evidence is ignored under `var/evidence/furniture/`; implementation status is in
[PROGRESS.json](PROGRESS.json), with measured results in [VALIDATION.md](VALIDATION.md).

## Next validation gate

Have a person assemble this exact product using the tutorial. Record article/variant,
tutorial revision, misunderstood instructions, mistakes, requests for help and completion.
Revise based on those observations before claiming proven practical usefulness.
Human review and physical assembly remain `not_run` until actually performed.

This is an independent local assistant, not an IKEA service. No publication or redistribution
approval is implied by local source preparation; source documents retain their original notices.

## Connection animation

[Open the connection preview](http://127.0.0.1:5173/ikea?product=30449908&step=attach-legs).
See [ANIMATION.md](ANIMATION.md) for motion boundaries and measured validation.

## Workspace and shortcuts

The tutorial uses a viewport-height workspace. Instructions, source pages and model
part details scroll independently; the viewer and navigation keep their positions.
Phones offer Instructions, 3D illustration and Official diagram tabs. On short screens
the viewer toolbar uses a side column to retain model space.

- Left/Right: previous/next tutorial step.
- Alt+R: replay the current step and show the model.
- Space: play/pause while the viewer surface has keyboard focus.

Sliders, selects, editable fields, tabs and dialogs retain native key behavior. Buttons
retain Space activation. Keyboard help is available in the navigation dock. Step changes
retain navigation focus and announce the new step; only instruction scrolling resets.

Forward navigation automatically starts visible assembly animations, except with reduced
motion enabled. Pause and Replay stay available. Initial load/backward navigation stay
static; the final care step retains the upright table.

## Guided coach and release preparation

See [COACH.md](COACH.md) for current behavior and validation, [PRODUCTION.md](PRODUCTION.md)
for isolated packaging and unresolved release gates, and [PILOT_STUDY.md](PILOT_STUDY.md)
for the unrun five-person physical study. These records do not certify public readiness.

## Optional voice coach

Talk to coach opens the current-action voice panel. See [VOICE.md](VOICE.md) for behavior,
privacy boundaries and the current Gemini validation status. Voice does not confirm physical assembly.

Project overview: [local showcase](http://127.0.0.1:5173/). The former `/furniture`
page has been removed; use `/ikea`. API and storage namespaces remain unchanged.
See [project routing](../PROJECT_HOME.md).
