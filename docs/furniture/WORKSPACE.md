# Stable workspace validation

Implemented locally on the IKEA branch, 2026-10-25. The landing page and LEGO UI are
unchanged. No API or stored-progress schema changes were needed.

## Behavior

A fixed-height shell reserves header, safety notice, viewer area and navigation space.
Desktop instructions/source and viewer supporting details scroll in their own panels.
Phone tabs select Instructions, 3D illustration or Official diagram without moving the
navigation. All three viewer modes share one toolbar/controller; unsupported playback
slots remain disabled. Loading/error states retain the viewer/control space.

Arrow shortcuts navigate tutorial steps. Alt+R replays the current step. Space only
controls playback on the focused viewer surface. Handlers ignore repeated keys, input
composition, unrelated modifiers and native control/dialog keyboard events. Step changes
preserve focus and document scroll, announce the title, and reset instruction-panel scroll.

During review, corrected rapid Space toggles to read live playback state; corrected
controlled-input synchronization so seek input cannot revert to an old progress value;
reconciled whole-table leg identities with the full animation's shared corner ordering.
Added tab-panel semantics to the Instructions tab and retained schematic dimension notes.

## Evidence

Evidence is local under `var/evidence/furniture-workspace/`. Layout tests compare canvas,
shared toolbar and navigation rectangles across five steps with a two-CSS-pixel tolerance.
They also cover panel expansion, focus, document overflow, native keys, errors and loading.
Screenshots include desktop 1440×1000, phone 390×844, short landscape 844×390 and 720×450
(the CSS viewport equivalent of a 1440×900 window at 200% zoom; not a claim of a separate
browser-menu zoom measurement). Rendering and keyboard behavior were also inspected
in the open in-app browser.

Human review and physical assembly remain not_run. Software tests do not establish
physical assembly correctness. Source evidence and review limitations remain in SOURCES.md.

The rapid navigation/replay test also exposed an intermediate renderer-mode change
that could consume replay before the intended view mounted. View mode now derives
synchronously from the current step; the keyboard scenario passed five consecutive
runs (`keyboard-stress.log`). Failure placeholders announce a settled error rather
than remaining marked busy. Independent agent review findings on instance identity
and tab-panel semantics were corrected before final validation.

## Final measured result

- `npm run check`: TypeScript, build and 61 frontend tests passed.
- Four furniture browser specs: 19 tests passed in 2.3 minutes. This includes the
  complete animation playback, all original furniture regressions, stable bounding
  boxes, keyboard conflicts, focus retention, source/WebGL failures and loading slots.
- Keyboard transition stress: five consecutive passes.
- Desktop, phone, short landscape and zoom-equivalent viewport screenshots inspected.
- `git diff --check` passed. Existing build chunk-size advisory remains.

Logs: `frontend-check.log`, `browser-tests.log`, `keyboard-stress.log`.
Screenshots: `desktop-finished.png`, `phone-finished.png`, `landscape-finished.png`,
`zoom-equivalent-finished.png`, matching `*-instructions.png`, and `errors.png`.
The in-app portal was left open on the finished-table step. No push, merge or publication.

## Forward-step autoplay follow-up

Moving forward with Next, Right arrow or step selection starts the visible supported
animation once. Screw insertion defaults to its close-up and ends before leg attachment;
leg assembly uses the full table animation. Care remains the completed upright view.
Initial loads, backward navigation, view switches and reduced-motion users remain static.
Hidden model panels/document suppress autoplay without starting later on visibility change.
Pause, replay and fixed toolbar geometry remain intact. Controller registration is tagged
with step identity so a stale renderer cannot consume the new step's play request.

Validation: `npm run check` passed 61 frontend tests, TypeScript and build. Autoplay,
workspace and close-up browser suites passed all 13 tests. Verified Next-to-Pause behavior
in the open portal; evidence is in `var/evidence/furniture-autoplay/`, including
`next-autoplay.png`, `browser-tests.log` and `frontend-check.log`.
