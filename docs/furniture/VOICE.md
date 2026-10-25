# Gemini voice coach — local pilot

The user requested Google Gemini instead of OpenAI. The current voice integration uses
`GEMINI_API_KEY` from the server environment, with no OpenAI fallback and no secret file
write. The earlier OpenAI credit failure is historical; see `VOICE_OPENAI_HISTORY.md`.

A small floating face opens optional, nonmodal voice details. Assembly playback and
navigation remain usable. Start conversation explicitly requests microphone access;
audio and transcripts are handled by Gemini Live. Connecting collapses the details into
a compact pill with microphone state, mute and End controls. Minimizing keeps the call
active; transcripts expand only on request.
The backend issues a one-use, 31-minute ephemeral token with a one-minute connection
window. The long-lived Gemini key never enters the browser. Tokens are bound to the
server-authored model, source-grounded instructions, audio-only generation and the allowlisted portal_control tool.

The browser uses a constrained Gemini WebSocket connection,16kHz mono PCM input and
24kHz PCM output, with a worklet for microphone capture. Playback queues are cleared on
interruption. Mute disables microphone transmission; End, leaving the tutorial, hidden-page,
cancellation, failure and the applicable client time limit release microphone/audio resources.
Transcripts stay in component memory until leaving or starting again.
The disclosure identifies Google Gemini before recording starts. This app does not store
microphone recordings; this does not describe Google's own processing/retention policies.

Changing actions sends context-only updates without starting a model response. Voice
can browse the eleven visible actions and operate playback/view/source controls using
portal_control. It can now record explicit spoken user confirmations and current checklist changes.
These are user reports, never verified assembly; see the spoken-progress follow-up.
The source-grounding prompt forbids invented torque, insertion depth, turn counts or
claims of seeing/certifying the table. Actual model adherence needs separate evaluation.

The local broker retains exact Origin/Host+loopback restrictions, source/revision checks,
request/response limits,5 attempts/minute and30/process limits, bounded timeout and sanitized
errors. These are not monetary caps. Voice remains disabled in the isolated public runtime.
A public voice release needs separate authentication, authorization and cost controls.

## Validation

Current evidence is recorded under `var/evidence/furniture-gemini/` and in `PROGRESS.json`.
A read-only model check returned200 for `models/gemini-3.8-live`, supporting
`bidiGenerateContent`. This is access evidence, not proof of a successful audio call.
Backend and browser transport tests use mocked upstream responses; synthetic live speech
results are recorded separately. Real-device microphone/echo/latency checks and human
assembly validation remain pending.

## Official implementation references

- [Live WebSocket protocol](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket)
- [Ephemeral authentication and configuration constraints](https://ai.google.dev/api/live)
- [Short-lived token workflow](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)

The REST request uses `bidiGenerateContentSetup` as specified by the API reference; the
SDK's `liveConnectConstraints` wrapper is not sent as a raw REST field.

## Recorded result (2026-10-25)

- Frontend typecheck,80 unit tests and production build passed.
-43 furniture backend tests passed, including18 voice broker cases.
-26 browser tests passed:12 mocked Gemini voice cases and14 assembly regression cases.
- One bounded live synthetic-speech call succeeded: token HTTP200,setupComplete, the
  question “Which screw do I need for this table?” was transcribed, and25 audio chunks
  arrived with the reply identifying four double-ended screws marked115980. End call
  returned the UI to microphone-off. Evidence: `live-check.json` and `live-reply.png`.
- Independent agent review found no blocking issue. The playback queue threshold can
  be exceeded by one bounded chunk; this is not a measured latency guarantee.
- No actual user's microphone was recorded. Real-device echo/latency, open-ended answer
  quality and physical assembly still require human validation. This single successful
  question does not establish general response accuracy.

## Floating companion follow-up (2026-10-25)

The modal is replaced by a small face/orb. Optional details have no backdrop or focus
trap; Escape minimizes them. Connected calls automatically collapse, with microphone
state, mute and End still visible. Navigation and animation remain active. Only focus
inside the companion suppresses tutorial shortcuts. Reduced motion disables its breathing
animation. Context changes clear queued audio and discard an active old response until
its interruption/completion boundary; they never confirm physical assembly.

Validation uses mocked transport/audio, not additional paid Gemini calls. Desktop,
phone, short-phone and short-landscape captures are under
`var/evidence/furniture-voice/mock-companion-*.png`; the actual local portal capture is
`var/evidence/floating-voice/portal-companion.png`. Agent inspection confirms the idle
orb occupies a small lower-right area and the optional details can be minimized. The
active pill necessarily occupies some canvas space on short screens; navigation remains
reachable. Real-device microphone and usability checks remain pending.

Final checks: typecheck,80 frontend unit tests and production build passed (existing
large-chunk warning).17 voice cases passed together; the new pending-response case and
existing active-response case then passed in a targeted rerun, covering18 distinct cases.
All14 assembly regression cases and4 instrumented layout cases passed. Runtime JSON
shows no console/page errors or unexpected failed requests. Context interruption before
any server transcription/output remains dependent on Gemini protocol ordering; no new
live context-switch test was performed.

## Voice navigation and authored scene context (2026-10-25)

The initial model prompt previously prohibited navigation. It now declares one bounded
portal_control function with validated commands and numbered steps1–11. Step3 means
Screw1; step4 means Leg1. Navigation invokes the same state transition as keyboard
browsing and never marks physical work complete. Play, pause, replay, whole table,
close-up, official diagram and close-panel are supported; unknown commands and invalid
arguments are rejected. Calls are bounded, deduplicated by ID and cancellation-aware.
A successful navigation response supplies destination context without interrupting the
model acknowledgement with a second client-content update.

Context contains the authored tutorial, action order, source document/page, parts, help,
warnings, current view/panel and playback state. get_context refreshes dynamic state.
Rotation facts are derived from the actual deterministic animation samplers: clockwise
from the free end toward the tabletop underside, with the opposite viewpoint reversing
appearance. These are schematic motion facts, not prescribed physical turns or depth.
The model receives structured scene and diagram descriptions/references, not live screen
pixels, document-image vision or camera input. This distinction remains explicit.

Evidence for this change is under var/evidence/voice-actions/. Human/physical assembly
and real-device microphone validation remain not_run.

Live verification used two bounded Gemini sessions with typed synthetic prompts and a
silent test microphone, not user microphone audio. Both navigated to step3 through the
real tool call. The second also returned: “The animation shows Leg 1 rotating clockwise,
viewed from the free end toward the tabletop underside.” It returned37 audio chunks;
confirmation remained0/11. The first harness stopped too early to evaluate its second
answer; its navigation result is retained separately. Two earlier startup checks made
zero token requests. See live-result.json, live-navigation-first.json and live-result.png.
This verifies these specific live interactions, not general instruction accuracy.

Protocol reference: https://ai.google.dev/gemini-api/docs/live-api/tools (manual
function-call responses). Only allowlisted portal callbacks execute; arbitrary OS keys,
code, browser navigation and physical-completion controls are not exposed.

Final validation:82 frontend unit tests, typecheck and build passed (existing large
chunk warning);19 backend voice tests passed;39 browser tests passed (25 voice and
14 assembly regressions). Review found and fixed stale batched state and late tool
execution from a suppressed prior response, with regressions for both. Runtime evidence
for the captured mock navigation reports no console/page/network failures.

## Explicit spoken progress follow-up (2026-10-25)

The earlier navigation-only restriction is superseded by the user's request to confirm
work aloud. report_completed_legs records explicit identified legs and their screw
connections; it never checks preparation or final safety items. In the ordered guide,
“I completed all 3 legs, move next” means legs1–3 and advances to the fourth connection,
not the next numeric action after the currently viewed Action6. The model states its
interpretation; nonsequential ambiguity requires clarification. Four legs remain the
actual product inventory.

set_checklist changes only the current action's checklist, requires an explicit user
statement and stable action ID, and can also clear it. confirm_current retains the same
checklist and prior-action gates as the Done button. Bare next, silence and playback
completion remain browsing only. Unsupported arguments and stale action targets fail
without progress changes. Context includes check text, checked state and confirmation
IDs. Voice changes have a visible status and Undo; the same local progress storage is
used. These records are user-confirmed, not physical inspection or human source review.

Validation evidence: var/evidence/voice-progress/.

Validation:94 frontend unit tests, typecheck and build passed (existing chunk-size
warning);44 furniture backend tests and43 browser cases passed (14 coach,29 voice).
Independent review fixes retained meaningful Undo on no-op repeats, selected an already
screwed connection's remaining leg, and made failed final confirmation explicit even
when its corrective navigation succeeded.

Two bounded live Gemini sessions used typed synthetic requests and a silent test
microphone. From Action6, “I completed all 3 legs, move to the next step” produced
report_completed_legs([1,2,3],advance=true), six connection confirmations and Action9.
The model said one leg remains. A subsequent checkbox request in that multi-request
harness timed out; it is not recorded as passed. A separate session beginning at
preparation passed the exact “Check the checkboxes done” request: set_checklist ticked
the two current boxes, leaving0 actions confirmed. This validates each requested
operation, not every multi-turn timing condition. Raw results and screenshots are in
var/evidence/voice-progress/. No actual user microphone was recorded.

## Hands-free coaching follow-up (2026-10-25)

An explicit hands-free mode adds explanation → wait for spoken confirmation → next
unfinished action. It does not infer physical completion from animation or silence.
Checklist confirmation applies only after the current checks have been explained and
confirmed; final prerequisite gates remain. This records the user's report, never a
physical inspection. Ordinary conversation remains available separately.

The hands-free client deadline is30 minutes from its initial connection; ordinary
conversation remains3 minutes. Tokens allow31 minutes with a one-minute connection
window and one use. Planned provider renewals use bounded fresh sessions within the
original deadline, keeping current tutorial progress. Hidden-page/end/error cleanup
still stops capture. Provider interruptions are not a guarantee of uninterrupted service.
Official token/session timing reference:
https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens

Hands-free narration uses a bounded2,048-token output allowance. The earlier500-token
allowance truncated the first live preparation explanation; its incomplete confirmation
was rejected and no progress was recorded. Invalid/failed current-action Done requests
now explicitly reset readiness and require a complete re-explanation plus a fresh Done.
The audio queue fails closed above its60-second limit instead of silently discarding
queued instruction audio. Audible readiness requires running audio and an empty output
queue, not merely a provider turn-complete message.

A second live attempt completed its narration but Gemini twice omitted the optional
checklist boolean from the generic control call; both calls were rejected without
confirmation. Hands-free confirmation now has a separate hands_free_done function
with action_id,user_statement,checks_confirmed all required. Other portal operations
remain on portal_control. The strict tool path, malformed-call repair and all11 actions
passed13 targeted browser cases after this change.

Final hands-free evidence:100 frontend unit tests, typecheck and build passed (existing
chunk warning);46 furniture backend tests passed. A55-case browser regression run
passed before the final live-driven fixes, followed by13 targeted final hands-free
cases including all11 actions, strict dedicated-tool arguments and recovery.

The third bounded live session passed the entire11-action tutorial through generated
“Done” speech:11 confirmations, zero retries, one token request, no page errors, and
no clicks between actions. Preparation, inventory and final-check checklist flags were
true; the eight connection actions used false. Final care was narrated and the upright
table showed11/11 user confirmations. The test ended the call and closed its synthetic
audio context. It recorded no actual user microphone and did not assemble a real table.
Live result, transcript/calls and screenshots: var/evidence/hands-free/live-result.json,
live-waiting.png and live-complete.png. Two earlier live failures remain separately
recorded; they were not counted as successful confirmations. Actual phone audio,
physical assembly and human usability validation remain not_run.

## Article binding

The session offer includes `article_number` (white remains the backwards-compatible
server default). Source health, revision/action validation and initial Gemini context
all resolve that article. Client context includes the selected finish and article.
Changing the header finish selector ends the old session and discards its pending
commands/audio before opening the other article's progress. Starting voice again
creates a session bound to the newly selected article; confirmations never migrate.

## Floating helper positioning

The bright headset icon can be dragged with mouse or touch. Movement beyond six
CSS pixels suppresses the button click. Shift+arrow keys move a focused launcher;
Reset position in the panel restores its default corner. The whole companion, including
expanded details, is clamped within the viewport on movement, resize and panel opening.
Position lasts for the mounted tutorial session. Explicit microphone start, cleanup and
confirmation semantics are unchanged. Reduced motion disables the decorative float.
Eleven targeted browser tests and 105 frontend tests passed; screenshots/logs are in
`var/evidence/voice-floating/`. Short-height layouts use a compact icon to keep the
viewer usable. Testing used mocked voice transport, not new paid inference.

## Nandi Pocket

The user selected the orange seated bull (concept6). The transparent generated artwork
is stored at `apps/web/public/images/nandi/pocket.png`. Nandi is named in the panel and
Gemini system instruction. Idle bob and listening tilt animate the whole character;
a nod and glow follow the audio queue while it is playing (not claimed lip sync).
Reduced motion disables all decorative animation. Dragging and explicit microphone
start are preserved. Tests:10 browser checks plus audio-state follow-up,22 backend voice
cases,105 frontend unit cases and build passed. Evidence: `var/evidence/nandi/`.

Nandi now floats without a button shell or circular speaking glow. Artwork is96px on
desktop and80px on standard phones, with smaller short-height layouts to leave the
viewer and controls accessible. Speaking emphasis uses the character shadow. Six
mouse/touch and viewport-clearance browser cases passed after short-phone adjustment.
Evidence: `var/evidence/nandi-pet/`.

### Nandi expressions

The expression atlas replaces whole-body bob/tilt with idle blinks, ear wiggles and
short tail swishes. Two mouth frames respond to 30ms RMS windows of scheduled output
PCM using the audio clock, not microphone activity. Silence, interruption, suspended
playback and end clear the mouth; this is audio-reactive animation, not phoneme lip
sync. Reduced motion, hidden pages and dragging use a neutral frame. Missing artwork
falls back to the original Pocket image. Intervals and listeners clean up on unmount.

`expressions.png` is generated transparent artwork based on the selected Pocket PNG:
3×3 row-major neutral, half-blink, blink, ears-up, ears-down, tail-out, tail-in,
small-mouth, open-mouth. Generated asset ID: exec-7d72df02-7e67-44ec-a63c-a3049e60bb49.
No external character assets were imported.

Validation: 111 frontend unit tests, TypeScript and production build passed. Eight
browser cases passed: expression lifecycle, reduced motion, mouse/touch dragging,
and model/navigation clearance across four viewport sizes. Desktop and phone
screenshots inspected in `var/evidence/nandi-expressions/`; runtime error evidence
in `var/evidence/floating-voice/`. Voice transport was mocked; no paid live inference
was performed. Human and physical assembly validation remain unchanged.
