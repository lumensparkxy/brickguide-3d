# Local voice coach

Status: implemented and mock-tested; **live speech is blocked by API credit availability**.
The user authorized reuse of the existing `OPENAI_API_KEY` environment variable. No secret
was printed, persisted, or returned to the browser. No deployment occurred.

The coach has a visible Talk to coach button. Its dialog is contextual to the current
action, pauses the animation, and requests microphone access only after Start conversation.
The browser sends/receives audio through WebRTC; the server exchanges an SDP offer using
its environment key. Native speech replies, input/output transcripts, mute, end, permission
recovery and audio-playback recovery are wired. Closing, unmounting, hiding the document,
connection failure, or a three-minute timer tears down tracks and the peer connection.
Late microphone permission resolution after cancellation also stops the returned tracks.
Transcripts exist only in component memory; the app does not persist microphone audio.
The provider processes audio as disclosed before starting; this is not a claim about the
provider's retention policy.

The server prompt contains the curated tutorial and current action. It instructs the
model to stay within source evidence, admit unknowns and never infer torque, insertion
depth, turn counts or physical completion. No function tools or navigation/confirmation
handlers are exposed to the model. This is a generative assistant, not guaranteed factual
output; real response quality still needs evaluation once API credit is available.

`POST /api/v1/furniture/voice/session` validates the current tutorial revision/action,
verified source cache, JSON/SDP sizes, exact local Origin/Host and loopback peer. It has
bounded timeouts, no automatic retries, five attempts/minute and30/process limits, and
500 output tokens per response. These limits are not a dollar cap. The three-minute
limit is client-side; this local prototype is not a hardened public metering gateway.
The isolated production service rejects voice calls. Public voice would require a
separate authenticated, authorized and metered design; no public exposure was added.

## Evidence

- Frontend TypeScript,76 unit tests and production build passed.
-42 furniture backend tests passed, including17 voice cases. Upstream failures are
  sanitized, and credit/quota failures return an actionable503 rather than secret-bearing
  provider messages. Diagnostic logs contain only status and allowlisted error codes.
-25 browser tests passed:11 mocked voice cases and14 assembly coach regression cases.
  Independent agent review found no blocking code issue. Actual speech remains unverified.
- Voice browser tests use mocked WebRTC, microphone streams and session responses.
  Their transcripts/screenshots are test fixtures, not evidence of a real conversation.
- Two short live connection attempts were made with a synthetic microphone stream;
  no actual user microphone was recorded. Neither reached a connected session.
- A read-only models request returned200 and listed `gpt-realtime-2.1`. The second call
  diagnostic returned upstream429 with `credit_balance_exhausted`. This establishes
  the credential/account blocker, not working speech-to-speech output.
- Restore available API credit/quota on the configured account before a live retest.
  No billing changes were made. Real microphone, interruption, speech accuracy and
  spoken-answer quality remain unverified.

Evidence: `var/evidence/furniture-voice/` (backend/frontend logs, browser fixtures,
`provider-access.json`, `live-attempt-1.json`, `live-check.json`, actual idle panel
`portal-voice.png`). No secret or raw SDP is included in evidence.

Implementation follows the official [Realtime WebRTC unified interface](https://developers.openai.com/api/docs/guides/voice-webrtc#connecting-using-the-unified-interface).
