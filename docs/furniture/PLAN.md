# Furniture Assembly Assistant — implementation plan

Approved 2026-10-25. Branch: `codex/ikea-assembly-assistant`; baseline: `2b59ca7`.

## Approved follow-up: full table animation

Extend the reviewed connection demonstration to four sequential screw/leg pairs with
cumulative assembly states, all nine instance labels, deterministic seeking and replay,
and an explicit upright finished-table view. Preserve the close-up and official diagram.
Corner order is an assistant presentation choice, not printed IKEA step numbering.
Validate intermediate corner counts, playback/pause/reset, label visibility, finished
geometry, mobile layout, reduced motion and source/WebGL fallbacks.

## Approved follow-up: labels and one connection animation

Add source-correct on-model names and screw number 115980, with explicit assistant-only
leg instance numbers. Link parts-list selection to the 3D labels/highlight. Implement
one source-informed screw-then-leg motion study in Three.js, with play/pause, repeat,
speed and timeline controls, a close-up/whole-table switch and a direct portal preview.
The two turning actions are booklet evidence; numeric turns, exact thread geometry,
insertion depth and timing remain illustrative. No physical/connector certification.
Retain deterministic sampled poses, pause hidden playback, reduced-motion/manual start,
and readable source/instructions when 3D fails. Validate real moving intermediate frames,
pause, seek, repeat, endpoint stability, label selection and desktop/mobile screenshots.

Ownership: animation worker owns viewport, connection component, motion sampler/tests and
connection CSS; primary owns portal integration, browser tests, documentation and QA.

## Scope
Deliver one complete local, English guided tutorial for IKEA LACK white 55 × 55 cm,
article 304.499.08 (Swiss catalogue), preserving the existing LEGO application.
Use official document evidence, authored explanations, and clearly schematic 3D.
No automatic reconstruction claim, public deployment, accounts, voice, photo analysis,
arbitrary uploads, paid inference, push or merge.

## Work sequence
1. Inspect and retain the official assembly documents and their actual hashes.
2. Implement isolated furniture contracts, bounded source preparation and read API.
3. Implement `/furniture`: lookup, variant confirmation, preparation, complete instructions,
   source comparison, schematic views, help, replay, navigation and scoped local resume.
4. Review every instruction against its diagram; retain missing geometric detail visibly.
5. Run backend/frontend checks and real-browser desktop/mobile tests plus LEGO regressions.
6. Record software, source coverage, agent review, human review and physical test separately.

## Ownership and isolation
Backend worker owns the furniture API package, config, preparation CLI and backend tests.
Frontend worker owns the furniture frontend directory and route dispatch in main.tsx.
Primary owns integration, execution records, source audit and browser validation.
All caches and evidence live under `var/furniture/` and `var/evidence/furniture/`.
Existing LEGO schemas, sources, fixtures and release configuration remain unchanged.

## Interface
Read-only `/api/v1/furniture/products`, product detail and `/tutorial` endpoints.
Allowlisted document PDF/page endpoints serve prepared, hash-checked assets; requests do
not initiate downloads. Dedicated typed furniture contracts use millimetres and original
document identity/page references. Missing assets yield explicit unavailable responses.

## Acceptance
All actions and warnings from the primary booklet are represented. Original unnumbered
diagrams remain distinguishable from our explanatory steps. Schematic geometry is never
presented as measured joinery. Unknown products, cache failures, navigation, resume,
keyboard, reduced motion and WebGL failure have meaningful checks. Inspect desktop and
mobile screenshots; preserve originals and notices. Human and physical review stay
`not_run` until a real person performs and records those actions.

## Stable workspace follow-up

Approved viewport-height shell, fixed navigation and shared viewer toolbar, independent
content scrolling, phone Instructions/3D/Official diagram tabs, scoped keyboard shortcuts
(Left/Right, Alt+R, focused-viewer Space), focus preservation and layout-bound tests.
Parent owns app shell/navigation/styles/evidence; viewer worker owns renderer layout
and shared control interface. No changes to assembly evidence or physical status.

## Forward-step autoplay
Start supported screw/leg animations once after forward navigation. Preserve fixed
controls, no autoplay on initial load/backward navigation/view switching, honor reduced
motion and hidden views. Screw step stops before the leg action; final care stays upright.

## Guided coach redesign

Prototype and inspect desktop/phone prepare, active connection and finish before
switching default. Eleven source-linked actions with independent viewed/confirmed state,
segment playback and human confirmation. Primary owns coach shell/types/progress/tests;
viewer worker owns new scene; backend worker owns action catalogue, isolated runtime and
release checks. Physical study/real devices/rights remain pending real evidence.

Coach implementation and local software checks completed; see `COACH.md` and `PROGRESS.json`.
Six prototypes were agent-reviewed before replacement. Physical study, human review,
real-device checks, dependency remediation and Docker runtime validation remain pending.

## Opt-in voice coach
User authorized reuse of existing environment OpenAI key. Add an on-screen, explicit-start
Realtime voice dialog with transcript, mute/end, source-grounded current-action context,
three-minute client limit and no assembly mutations. Server key never leaves backend;
local origin/peer checks, request/session caps and sanitized errors. Mock tests plus bounded short synthetic-audio live checks; retain actual audio/browser results separately.

Voice implementation: see `VOICE.md`. Two connection attempts failed before audio exchange;
read-only model access succeeded and provider reported credit_balance_exhausted. Further
live attempts stopped. No billing changes or secret writes.

## Gemini voice migration
User requested Google Gemini in place of OpenAI. Existing GEMINI_API_KEY detected and
reuse authorized by request. Replace provider broker with bounded ephemeral tokens and
browser WebSocket PCM transport; preserve current-action context and physical confirmation
boundaries. Validate mocked audio lifecycle and one bounded synthetic-speech live check.
No key persistence, deployment or billing changes. Parent owns integration/docs/evidence;
backend worker owns voice broker/tests; frontend worker owns audio transport/UI/tests.

Gemini migration completed locally:80 unit tests,43 backend tests,26 browser tests,
and one successful synthetic speech-to-audio live call. See `VOICE.md`. Real-device
audio and human assembly validation remain not_run. No deployment or billing change.

## Floating voice companion
Replace modal voice UI with always-present, dot-like floating companion. No backdrop,
focus trap or automatic animation pause. Collapsed active calls retain mic/mute/end
controls; optional compact details/transcript panel. Preserve session through action
changes and send explicit context-only update without confirming physical work.
Primary owns Coach integration, evidence/docs; UI worker owns VoiceCoach/styles;
backend worker owns mock browser regression updates. Browser plugin skill absent;
use repository Playwright and CUA for visible portal handoff. No new paid calls needed.

## Voice controls and scene context
User requests spoken navigation and answers grounded in displayed motion. Add a bounded
portal_control function using the same navigation/playback handlers as UI controls,
without physical confirmation. Steps map to the visible eleven actions. Supply current
structured scene state, source page references, authored help and sampled rotation facts.
Do not claim pixel vision or inspection of the user's actual table. Validate invalid,
duplicate and cancelled calls, state transitions, context and rotation separately.

## Explicit spoken progress
User authorizes spoken physical-completion reports and checklist operations. Add narrowly
scoped progress commands with explicit statement and stable action targets. Reporting
legs1–3 confirms those connections only and advances to Screw4, independent of currently
viewed Action6. Checkbox requests apply only to the current checklist. Bare navigation,
animation completion and silence never confirm work. Keep final prerequisite gates and
label results user-confirmed; provide undo and progress context. Validate persistence,
stale targets, malformed commands, final gates and legacy navigation.

## Hands-free guided assembly
Add explicit opt-in voice mode: explain one authored action including its checklist,
wait for a spoken completion, record that user report, select the next unconfirmed
action and play its supported animation. Final confirmation retains prior-action gates.
Mode pause/resume/stop, turn-scoped confirmation protection, reduced-motion, hidden-page
cleanup and ordinary conversation remain supported. Bound hands-free sessions and report
provider disconnect limits honestly. Validate full11-action traversal without touch,
checklist scope, no automatic physical confirmation, navigation and cancellation.

## Finish support and neutral palette — implementation
- Replace warm UI/scene colours with shared neutral tokens and finish-preserving materials.
- Verify and catalogue Swiss white, black-brown and white stained oak effect LACK 55 cm articles.
- Bind tutorial, documents, progress and voice to article identity; stop voice on variant switch.
- Validate real API, browser views, progress isolation, playback and existing regressions.
- Human/physical validation remains not_run; local branch only.

Finish follow-up completed locally: source review, implementation, 524 backend tests,
105 frontend tests, 89 unique furniture browser cases and 17 LEGO software browser
cases verified. Final evidence and remaining physical/device gates: FINISHES.md and
VALIDATION.md. No deployment or publication performed.

Routing follow-up: canonical /ikea and /lego; preserve old /furniture and / links,
including query/hash state, and add /ikea to the isolated furniture entrypoint.
Routing verified: canonical and alias routes retain deep-link query/hash and survive reload.
Browser errors: none; isolated furniture entrypoint aliases and backend checks passed.

## Project homepage and explicit routes
Implement technical showcase at /; retain only /ikea and /lego product routes.
Remove /furniture frontend/server alias, render unknown-page guidance, update live links
and current docs/tests. Keep API namespaces and local progress unchanged. Validate real
screenshots, responsive layout, lazy loading and routing before recording completion.

Project homepage completed and visually inspected.105 frontend tests,10 furniture
backend coach tests,14 homepage/legacy browser cases,17 LEGO software cases and
3 coach keyboard/resume/reduced-motion cases passed. /furniture is removed, not
redirected. Details and screenshots: docs/PROJECT_HOME.md, var/evidence/project-home/.

## Floating voice companion
Bright headset character, compact floating presentation, pointer/touch dragging with
click suppression, viewport bounds and keyboard Shift+arrow movement. Reset position
in the existing panel. Preserve explicit microphone start and all voice lifecycle rules.

Nandi Pocket: replace the floating headset icon with the selected orange seated-bull
asset, name the UI/provider coach Nandi, and animate idle/listening/audio playback
with reduced-motion support. Preserve dragging and microphone controls.

Nandi pet presentation: remove launcher shell and circular glow; enlarge transparent
artwork to96px desktop/80px phone, with compact short-height rules. Restore stopped
Vite frontend on loopback5173; existing API8000 stays running. Check drag and viewport
clearance before marking complete.

Nandi expression follow-up: retain the selected orange bull, add registered expression
frames for blinking, ear/tail movement and speaking, drive mouth openness from scheduled
output PCM energy rather than microphone input. Verify motion, cleanup and reduced motion.
