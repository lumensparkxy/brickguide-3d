# LACK finishes and neutral interface

The local furniture portal supports the Swiss LACK 55 × 55 × 45 cm articles:

| Finish | Article | Assembly source | Care source |
|---|---|---|---|
| White | 304.499.08 | AA-2606170-1 (legacy AA-207276-4 retained) | AA-2205802-3 |
| Black-brown | 801.042.68 | AA-207276-4 | AA-2205802-3 |
| White stained oak effect | 703.190.28 | AA-207276-4 | Exact official product page |

Both newly downloaded assembly sheets have SHA-256
`5f8ae60c8e7ac6707df08bcc49b2a5322839153f40c317948d70ab9e5f446025`.
The black-brown care PDF has SHA-256
`83a707fcef7cf10bc1417cbb82d638372188f8f0cda7137ca009de9001cc8545`.
These match the existing cached documents byte for byte. The agent reviewed the screw
115980 callout (4×), protective covering and screw-then-leg close-ups. This supports
reuse of the authored eleven-action sequence and schematic geometry, not physical validation.
Each article retains its own pinned URLs and references despite content-addressed cache reuse.

Oak care uses its official product-page wording (cloth dampened in mild cleaner, then dry
cloth). Its final action uses a product-only source instead of inventing a care PDF/page.
The newer white booklet's no-sitting warning is not presented as a warning sourced from
the other articles' linked booklet; their 10 kg limit links to their own product pages.

## Behaviour and contracts

`Product` adds `family_id` and `finish` (`id`, `name`, `base_color`, `wood_effect`).
Source references may have null document/page only when linked to that article's exact
product URL. Existing document routes accept `article_number` (default white), and voice
session requests include it. The server validates article, action and revision together.

The header selector changes the actual article and restores that article's progress;
confirmations are never transferred. A switch unmounts the previous voice coach, stopping
microphone tracks, queued audio, socket, pending requests and timers. A visible notice
explains why voice must be started again. White's revision and local-storage key remain
unchanged. Existing deep links still work.

Interface tokens are scoped to furniture. Neutral lighting preserves white, dark brown,
and pale oak model finishes throughout motion. Active connections use outlines/rings;
model colours do not imply progress. Procedural grain and colours are approximate
instructional appearances, not calibrated reproductions of IKEA finishes.

## Verification

Evidence is kept locally in `var/evidence/furniture-finishes/`; see `source-review.json`
for exact source URLs and review findings. Browser captures cover preparation, active
connection and final checks for each finish on desktop and phone. Runtime logs distinguish
real local API/assets from mocked voice transport. No new paid Gemini session was used.
Human source review, real-device accessibility and physical assembly remain `not_run`.
No deployment, publication, push or merge is included.
