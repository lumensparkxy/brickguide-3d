# Furniture release candidate — 25 October 2026

The current candidate is a read-only furniture service at `/ikea`, with the three
LACK finishes and authored coach revision `lack-30449908-coach-v2`. It excludes the
combined project homepage, LEGO APIs and public voice-session creation. Local voice
in the development app is unchanged. No deployment or publication has occurred.

## Security and runtime changes

The previous npm and Python findings are remediated. Fresh audits report zero known
vulnerabilities for the npm graph, installed Python dev/cloud environment, and exact
locked production-only Python dependencies. Patched versions include Vite 6.4.5,
Vitest 4.1.12, fast-uri 3.1.9, Pillow 13.0.0, certifi 2026.10.23 and OpenTelemetry API
1.45.1. Raw reports and exact commands are retained under
`var/evidence/production-hardening/dependencies/`. This supersedes the earlier open
package findings; it is not an OS/container-image vulnerability scan.

The isolated server omits the voice-session route and API schema endpoint. Its
read-only voice status explicitly reports disabled, even if a provider key exists
in the environment. CSP, anti-framing and Permissions-Policy headers restrict this
release to same-origin resources and deny microphone/camera access. Favicon and Nandi
images are served correctly. Error responses redact exception details. Source assets
remain pinned, root-confined and hash-checked; no request downloads or renders a PDF.

## Package and local verification

Use [the packaging runbook](../../deploy/furniture/README.md) for exact preparation,
container build, hardened local startup and rollback commands. Do not use the old
whole-cache Docker build command: ambient cache and backup files must not enter images.

Preparation builds the frontend, stages only curated source files, freezes source
inputs, and records Git state plus source, lockfile, asset and frontend hashes.
Uncommitted work is explicitly recorded; a dirty working tree is not represented as
an exact Git release commit. Keep the complete candidate and its release record.
Base images are pinned to verified registry digests. Compose uses a non-root user,
read-only root, dropped capabilities, resource limits and loopback-only exposure.

Local verification and exact candidate identity are recorded in
[the hardening report](PRODUCTION_HARDENING.md). Browser checks exercise the built
frontend and isolated server, not Vite. Native frozen-candidate checks exercise source
corruption/missing-file failures and recovery. Docker/Podman remain absent locally, but GitHub has now built and exercised the image.
All 36 container browser tests and 31 smoke plus 31 restart checks passed. The image
scan blocks release on 40 HIGH package findings across eight CVEs with no fixed versions
reported. See [GitHub container results](GITHUB_CONTAINER_CI.md). Actual deployment
rollback remains **not run**.
The existing frontend chunk-size advisory and TestClient deprecation are retained.

## Remaining deployment gates

| Gate | Required evidence / decision | Current state |
|---|---|---|
| Container | Resolve scanner findings; actual deployment rollback | GitHub build/browser/restart passed; scan blocks 40 HIGH package findings |
| Source review | Human checks exact coach revision and action/source links | not_run |
| Physical pilot | Five first-time users under PILOT_STUDY.md | not_run |
| Devices | Actual iPhone/Safari and Android/Chrome; microphone only if voice is later enabled | not_run |
| Accessibility/performance | Human screen-reader/zoom/contrast review and real-phone performance | Automated subset only |
| Rights | Permission/appropriate basis to distribute the bundled manuals and rendered pages | unresolved |
| Scope | Confirm furniture-only public pilot; combined homepage/LEGO or public voice need separate packaging/security work | pending decision |
| Hosting/operations | Target/domain/TLS, support contact, monitoring and incident owner | not configured |
| Public voice | Authenticated authorization, enforceable spending controls and provider/privacy review | Disabled in this candidate |
| Deployment | Approval for exact tested candidate after the remaining gates | not performed |

Do not treat user checkboxes, an animated completed table, agent review or software
passes as human source review or physical assembly evidence. Existing LEGO alpha
publication records are separate from this furniture candidate.
