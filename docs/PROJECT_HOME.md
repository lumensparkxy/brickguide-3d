# Project homepage and public page routes

The combined local portal has three page routes: `/` (technical project showcase),
`/ikea` (furniture coach) and `/lego` (LEGO experience). Trailing slashes are accepted.
`/furniture` is removed; it and other unknown frontend paths show a not-found page
with navigation to the supported experiences. There is no compatibility redirect.

The isolated furniture server intentionally keeps `/` → `/ikea`, serves `/ikea`, and
returns HTTP 404 for the removed `/furniture` route. API names remain under
`/api/v1/furniture`; filesystem modules and article/source/revision progress keys
are unchanged. Existing product/action queries work at `/ikea`.

The showcase loads independently of API availability. Both product apps and their
styles load lazily; home starts neither a WebGL renderer nor microphone/voice code.
It contains the two demo entrances, source-to-viewer architecture, the LEGO-to-IKEA
journey, engineering lessons and the separate validation gates. Content deliberately
does not imply automatic PDF reconstruction or completed human/physical verification.

## Screenshot assets

`apps/web/public/images/project/ikea.webp` and `lego.webp` are optimised captures of
actual local interfaces, not generated concept art. IKEA uses the finish-validation
capture of the upright oak table; LEGO uses the existing source-linked authored
candidate tutorial capture. Both are 1200 × 750 WebP images (about 40 KB each).
Their source captures remain in ignored `var/evidence/furniture-finishes/` and
`var/evidence/theme-consistency/`. The page labels the screenshots and schematic
status. No deploy/publication or change to physical-review status is included.

## Validation

Frontend type checking, 105 unit tests and build passed (existing large chunk warning).
The 10 furniture coach backend cases passed, including `/ikea`, isolated root redirect,
and removed-route HTTP 404. Browser evidence is in `var/evidence/project-home/`:
root independence from APIs/Three.js, demo navigation and return links, removed and
unknown routes, deep-link hash/article/action preservation, persisted confirmations,
keyboard focus and responsive layouts. Screenshots cover 1440×1000, 390×844 and
720×450 (the CSS viewport equivalent of 1440×900 at 200% browser zoom). This does not
claim actual-device or screen-reader certification.

Visual inspection: neutral colour hierarchy; readable hero and section headings;
real screenshot framing; four-stage architecture and separate voice layer; mobile
stacking, reachable footer and visible focus. Historical validation/evidence records
retain their original paths; current usage docs and tests use the explicit routes.

Final browser results: 14 homepage/legacy cases, 17 LEGO software cases and 3 coach
keyboard, full-sequence/resume and reduced-motion cases passed. Product-home links
were also exercised on phone layouts with no horizontal overflow.
