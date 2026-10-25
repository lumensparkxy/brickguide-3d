# Production hardening evidence — 25 October 2026

Scope: dependency remediation and a locally tested furniture-only release candidate.
No push, deployment, source publication, credential creation, or paid inference was
performed. Existing user work is preserved. The package does not include the combined
homepage or LEGO runtime, and voice session creation is absent in the public app.

## Candidate

`var/releases/furniture-candidate-20261025-002/`

- Source digest: `556c19e5e848ed37f9dd1ac150ef568f6dc73bcb6779ae7d0326072465fd628a`.
- Release record SHA-256: `d73b2c304db0879ad6026629f0e5bded175984fc68f3d1cfbd3afb563bbf152c`.
- 168 frozen source files; 12 curated asset files; 30 frontend files.
- Git base `2b59ca7`, with dirty working state recorded explicitly. This is not a
  claim that the current candidate is reproducible from that commit alone.
- Image digest: absent. Container validation: **not_run**.
- Candidate-001 is retained as an earlier checkpoint; use candidate-002.

The staged context contains source/configuration/lockfiles, not ambient caches or
secrets. The previous whole-cache copy would have included npm caches and dependency
backups under `var/furniture`; the new allowlist excludes them. The Docker verification
stage rejects source drift, missing/extra files and changed inventory hashes. Later
stages copy code only from verified inputs. Final checks compare staged documents and
rebuilt frontend hashes with the release record. Node, Python and uv bases are pinned
to actual registry digests. No operating-system vulnerability pass is claimed.

## Verification

All relative evidence paths below are under `var/evidence/production-hardening/`.

| Check | Result | Evidence |
|---|---|---|
| npm audit, full graph | 0 known vulnerabilities | `dependencies/npm-after.json` |
| Python audit, installed dev/cloud graph | 0 known vulnerabilities | `dependencies/python-after.json` |
| Python audit, exact locked production graph | 0 known vulnerabilities | `dependencies/python-production-after.json` |
| Frozen source inventory | Passed, 168 files | `packaging/context-check-002.json` |
| Frozen assets/frontend equality | Passed for all three finishes | `packaging/candidate-check-002.json` |
| Frozen native service | 23 checks passed, including corruption/missing-source recovery | `packaging/frozen-native-smoke-002.json` |
| Packaging regression | 7 passed, including backend tampering and extra-file rejection | `packaging/tests-002.log` |
| Production browser | 36 unique cases passed across initial runs and targeted correction | `production-browser.log`, `production-regression.log`, `production-loading-rerun.log` |
| Final Python/frontend/schema/lint | 533 backend + 111 frontend tests; schema, lint and build passed | `final-check.log` |
| Homepage and LEGO compatibility | 26 passed on fresh isolated servers | `compatibility-fresh.log` |
| Container build, image scan, container rollback | Blocked: Docker/Podman unavailable | `packaging/status-002.json` |
| Human/physical/device review | not_run | Existing pilot protocol and PRODUCTION.md |

One initial browser failure was a development-only loading-test interceptor matching
`FurnitureViewport.tsx` rather than the production `FurnitureViewport-<hash>.js`.
The interceptor now handles both formats, without weakening the loading/geometry
assertions. The targeted production rerun passed. The initial failure log is retained.

## Browser QA

Flow: `/ikea` → select supported finish → open guide → browse the complete sequence
→ inspect official diagram → reload/resume. The built service was started fresh at
`http://127.0.0.1:8088`, with no reused Vite server. Desktop 1440×1000 and phone
390×844 production captures were visually inspected; wider regression includes
320px, landscape and zoom-equivalent layouts. Browser plugin was unavailable; the
repository Playwright workflow was used. Chromium viewport emulation is not real
Safari/iPhone/Android hardware testing.

| Required browser check | Result |
|---|---|
| Correct URL/title and meaningful content | Passed |
| No framework overlay | Passed |
| Console/network health | Dedicated complete-sequence cases recorded no errors or failed HTTP requests |
| Rendered images and source diagrams | Passed; Nandi/favicon now served by release runtime |
| Interaction proof | Every coach action, source dialog and resume exercised |
| Failure recovery | Unknown product, missing source image/tutorial retry, WebGL unavailable passed |
| Release boundary | Voice status disabled; voice POST, jobs, sets, OpenAPI and `.env` unavailable |
| CSP and permissions | Browser runs passed under final same-origin CSP; microphone denied |

An initial compatibility run reused a pre-update Vite process and encountered blank
pages. It was stopped; fresh backend/Vite servers on 8012/5184 passed all 26 cases.
The retained `compatibility-browser.log` is the interrupted attempt, not a success.
The original repository Vite preview was subsequently restarted on 5173 with Vite 6.4.5.
The test-owned production and compatibility servers stopped after their suites.

Existing regression tests that stub voice transport remain simulated; they are not
live inference evidence. The public runtime cannot create voice sessions, regardless
of configured local credentials. Explicitly disabled release copy replaces the
misleading suggestion to configure the local server.

Screenshots: `production-1440.png`, `production-390.png`. Other detailed regression
captures retain their existing `var/evidence/furniture-*` locations. Trace output is
under `browser-results/` and may be replaced on each targeted run; logs are retained
separately. No claim of measured physical accuracy or production load capacity follows.

## Reproduce

```sh
.venv/bin/python tools/check.py
npx playwright test --config playwright.production.config.ts
.venv/bin/python tools/verify_furniture_context.py var/releases/furniture-candidate-20261025-002/context
.venv/bin/python tools/check_furniture_release.py --cache var/releases/furniture-candidate-20261025-002/assets --web-dist var/releases/furniture-candidate-20261025-002/web --release-record var/releases/furniture-candidate-20261025-002/release.json --strict-cache
```

Use [deploy/furniture/README.md](../../deploy/furniture/README.md) for container commands.
Set `PYTHONDONTWRITEBYTECODE=1` when importing code from a frozen context for native
checks; bytecode caches would change its exact inventory. Do not overwrite a candidate.

## Remaining input and work before deployment

1. Provide a Docker-capable environment, or authorize installing a local runtime.
   Then build/run/scan the actual image and exercise rollback. This is an engineering
   gate, not something user approval can substitute for.
2. Confirm whether the first launch is this furniture-only pilot without voice.
   Public voice needs authentication, authorization, enforced cost controls and
   provider/privacy review; a combined site needs its own runtime packaging.
3. Resolve the right to distribute the pinned manuals and rendered source pages.
4. Identify hosting/domain/TLS, public support contact and incident/monitoring owner.
5. Perform the exact-revision human source review, physical pilot and real-device
   accessibility/performance checks. No agent or checkbox can supply these results.
6. Approve deployment of the final tested image after these gates are closed.

The remaining large JavaScript chunk advisory and TestClient/httpx deprecation are
recorded; neither was silently removed. The public project-home link currently returns
to furniture because the isolated service redirects `/` to `/ikea`; the combined
homepage is intentionally outside this package and needs a launch-scope decision.
