# Part labels and screw-and-leg animation

Implemented locally on 2026-10-25 using Three.js. No Blender dependency.

## Labels and source boundary

The official diagram identifies double-ended screw **115980**. Tabletop and legs
use plain-language names; Leg 1–4 distinguish assistant instances and are not IKEA
part numbers. Selecting a leg label highlights that instance; selecting the component
list highlights its group. Original instructions remain available beside the model.

The connection demonstration follows the diagram: align and turn the screw into
the tabletop, then align and turn the leg onto the exposed screw. The leg is shortened
for visibility and labelled as a partial view. Geometry, thread profile, motion path,
rotation count and insertion depth are illustrative, not manufacturing specifications
or tightening instructions. Source references remain in SOURCES.md.

## Interaction

Play/pause, replay, half speed, deterministic seeking and phase shortcuts expose each
stage. Orbit, zoom and reset remain available. Playback begins only on request and
pauses when the mobile official-diagram tab or the document becomes hidden. Switching
tutorial steps resets playback. Reduced-motion users begin with a static view.
WebGL failure leaves the instructions and official diagrams accessible.

## Measured validation

- `npm run check`: TypeScript, build and 58 frontend tests passed.
- `npm run test:e2e -- tests/e2e/furniture-animation.spec.ts tests/e2e/furniture.spec.ts --project=reference`: 8 tests passed.
- Browser checks exercise visible motion, stable pause, seeking, reproducible replay
  endpoint, instance/group labels, speed, navigation reset, keyboard operation,
  reduced motion, mobile hidden-view pause, document failure and WebGL fallback.
- Desktop and 390 × 844 mobile screenshots inspected. Independent agent review
  prompted camera-fit, replay-remount and label/control-overlap fixes before final checks.
- The recorded Chromium preview reported no captured errors. Full software and prior
  LEGO regression results remain separately recorded in VALIDATION.md; backend code
  was not changed for this follow-up.

Evidence is local and ignored under `var/evidence/furniture-animation/`: frontend-check.log,
browser-tests.log, desktop-screw.png, desktop-leg.png, desktop-seated.png,
phone-screw.png, preview.png, screw-and-leg.webm and recording.json.

This completes the requested local animation slice. Agent review does not establish
physical accuracy. Human review and physical assembly remain `not_run`.

## Full-table extension

The full assembly mode repeats the screw-then-leg demonstration at four corners,
retaining earlier connections and the same physical instance IDs. The official
unnumbered diagram supplies the repeated operation and quantity; corner order and
animation timing are assistant presentation choices. All four legs use full schematic
lengths in this mode. A protective surface appears beneath the inverted tabletop.

The 48-second sequence supports pause, replay, half speed, seeking and connection
shortcuts. Fixed numbered corner markers use projected leader lines to link the model
to persistent labels for the tabletop, four screws and four legs. Seated screw labels
remain present and say “Inside connection”; hidden hardware is not drawn through wood.

Finished table explicitly switches the complete assembly to upright orientation without
inventing a handling animation. One group transform preserves instance identities:
assembly y0..450 becomes upright y450..0. Schematic feet meet y0 and tabletop top y450.
The final care stage opens this finished view. The single-connection close-up and static
whole-table view remain available.

Independent agent review covered cumulative transforms, finished geometry, source
boundaries and label layout. A hover contrast issue found in screenshots was fixed.
Full extension evidence is in `var/evidence/furniture-full-assembly/`; physical assembly
and human review remain `not_run`.

Final extension validation (2026-10-25): `npm run check` passed TypeScript, build
and 61 frontend tests. The three furniture browser specs passed all 11 tests,
including full 48-second playback to the four-connection endpoint, cumulative actual
mesh positions after seeking, selection, navigation, phone reduced-motion/manual
playback, source-tab pause and WebGL fallback. Captured console/page errors and HTTP
failures were empty. Desktop and mobile viewport evidence was inspected; the open
portal was left on the finished table. The build retains the existing large-chunk
advisory. No backend or LEGO source/route code changed in this follow-up.

Evidence: `frontend-check.log`, `browser-tests.log`, `browser-errors.json`,
`desktop-24.png`, `desktop-49.png`, `desktop-74.png`, `desktop-100.png`,
`finished-table.png`, `phone-finished.png`, `phone-finished-viewport.png`,
`phone-assembly.png`. Full-page phone captures may include the sticky navigation at
the capture scroll position; the viewport capture separately confirms model framing.
