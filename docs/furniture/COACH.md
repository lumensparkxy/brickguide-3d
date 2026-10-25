# Guided assembly coach — local implementation

Revision: `lack-30449908-coach-v2`. Branch: `codex/ikea-assembly-assistant`.
This is an authored, source-linked, schematic tutorial. It is not automatic reconstruction
or verified physical assembly. No deployment, push, merge or publication was performed.

## Delivered behavior

The default `/ikea` experience now guides preparation, identification, then one
screw and one leg per corner, followed by final checks (11 actions). Each action retains
an official document/page reference and component instance identities. The official
screw hardware ID is 115980; instance/corner numbers are assistant labels. Existing
five-step instructions remain available with `experience=legacy` for regression comparison.

The current action autoplays once, holds its endpoint, and waits for explicit **Done,
next**. Reduced motion starts paused. Panels and hidden documents pause playback.
Back/arrow browsing and animation completion never confirm physical work. Required
checklists must be checked before confirmation; the final screen returns to any earlier
unconfirmed action before allowing final confirmation. The upright final view and care
checks distinguish the user's confirmation from inspection or certification.

Back, Play/Pause, Replay and Done remain in one dock. Instructions and checklists scroll
inside their panel. The model remains alongside instructions on desktop and beneath them
on phones. Official diagram, Parts, Need help and secondary controls open native modal
panels. Review checklist makes the offscreen checklist reachable on shorter screens.
Left/Right browse, Alt+R replays, and Space plays/pauses only on the focused viewer;
native form/dialog keys and button Space remain native. On-model labels remain visible.

Progress uses `furniture:coach:v2:<article>:<source hash>:<tutorial revision>` with separate
viewed action, confirmed action IDs and checklist state. Old viewing progress is not
migrated into confirmations. Navigation updates the deep link so ordinary reload resumes
that action. Corrupt/blocked storage degrades gracefully, with unsaved status in the dock.

## Prototype and visual review

Before default replacement, all six prototype screenshots were captured and inspected:
`var/evidence/coach-redesign/prototype-{desktop,phone}-{prepare,leg-2,final-checks}.png`.
The prototype route used `coach=preview` and did not write confirmation progress. Agent
review found that phone checklists needed an explicit discovery control; Review checklist
was added before the default switched. This was agent visual review, not user approval
or a usability study.

Final rendered inspection covers desktop 1440×900, phone 390×844, short phone390×568,
and zoom-layout equivalent720×450. The independent reviewer found and rechecked a short
phone clipping bug: the short-height two-column override is now limited by a narrower
single-column override. All four support controls fit at390×600. Screenshots and browser
console/HTTP evidence are in `var/evidence/coach-redesign/`; the 16-view capture recorded
zero page exceptions and zero HTTP responses >=400. Browser zoom-equivalent emulation
is not actual Safari/device or assistive-technology validation.

## Software verification

- `npm run check`: TypeScript, 76 unit tests and production build passed. The existing
  large Three.js bundle warning remains; this is not real-phone performance evidence.
- Backend regression:495 passed. Two subsequently added isolated-service cases also
  passed in the10-test coach suite. See `PRODUCTION.md` for exact run boundaries.
- Browser results: recorded in `coach-browser.log`, `legacy-browser.log`, and
  `browser-retry.log`. Two suites initially collided in Playwright's shared trace folder;
  the three affected teardown cases passed on serial rerun. Product assertions did not fail
  in those cases. Final coverage:14 coach cases and21 legacy furniture cases passed.
  The LEGO software browser project also passed all17 tests. See `PROGRESS.json`.
- Deterministic tests cover action segment boundaries and cumulative geometry. Coach
  browser cases cover11-action confirmation, skipped-final guard, reload, playback,
  reduced motion, keyboard focus/conflicts, WebGL fallback, source failure/retry,
  blocked storage, loading slots and stable layouts at five viewport sizes.
- Independent agent review completed after the short-phone fix with no remaining blocker.
  This does not substitute for human source review or physical testing.

## Release gates

Isolated service/container inputs, read-only source health, safe local error reporting,
support route and release/rollback procedures are prepared in `PRODUCTION.md`.
Actual-cache isolated-service smoke and release-input hashing passed. Docker is unavailable
on this host, so container build/run remains untested. npm/Python audits ran and have
unresolved findings; no dependency upgrades were bundled with this redesign.

`PILOT_STUDY.md` provides the five-person study and observation template. Human source
review, observed physical assembly, real iPhone/Android accessibility/performance,
source-delivery permissions, public operations ownership and deployment remain pending.
Physical validation is `not_run`; no speed or broad usability claim is established.
