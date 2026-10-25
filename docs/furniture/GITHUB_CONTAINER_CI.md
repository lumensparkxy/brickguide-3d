# GitHub container validation

User authorized GitHub Actions build and container testing on 25 October 2026,
with deployment separate. The dedicated branch is `codex/furniture-container-ci`.
The existing furniture source, its dependency remediation and packaging must be
committed with the workflow because they were previously local-only changes.
Main and the deployed service are not changed by the branch push.

Workflow: `.github/workflows/furniture-container.yml`.

The build uses frozen source, lockfiles and source-document hashes. Official PDFs
are downloaded only on the ephemeral runner. The actual image is tested with
restricted container settings, HTTP checks, 36 Chromium browser cases and a restart.
The vulnerability gate fails HIGH/CRITICAL findings, including unfixed findings,
and fails incomplete scanner execution. No registry push, cloud authentication,
provider key, inference call, deployment or public manual/image artifact is included.

Local validation: actionlint 1.7.12 passed; 25 smoke/packaging unit tests passed;
Ruff and diff whitespace checks passed. The smoke helper also passed all 21 HTTP
assertions against the built native app via TestClient. Docker execution is not
claimed from those local checks. The executed results are recorded below.

Only metadata and text reports are retained for seven days. Existing screenshots and
traces are deliberately excluded because they may contain official manual crops.
A restart pass is not a production rollback. Human, physical, rights, real-device,
public voice and actual deployment gates remain separate.

## Real-run findings and corrections

- Run `40239946870` exposed missing furniture JSON imports in the Docker frontend
  stage; `6ea07f5` copies the verified furniture configuration before typechecking.
- Run `40240252895` built the image, then exposed a startup connection-reset race
  and 65 HIGH findings (63 Debian 12 package findings and two vendored Python
  build-tool findings). The strict vulnerability gate rejected that image.
- `796931d` moves the Python stages to digest-pinned Debian 13 and removes system
  pip/setuptools/wheel plus uv from the final runtime after installing the locked
  app. Readiness polling now retries transient startup errors within a bounded
  60-second window. No vulnerability finding was suppressed or severity lowered.
- Full scan evidence from the rejected image is retained locally under
  `var/evidence/github-container-ci/run-40240252895/` and in the seven-day GitHub
  metadata artifact. The original failure remains visible in GitHub run history.

## Final executed checkpoint

Tested code commit: `796931d735b461d0291f75f64eded6279df11ff8`.

- [Container run 40240643751](https://github.com/lumensparkxy/brickguide-3d/actions/runs/40240643751): **failed only at the vulnerability gate**. Build, scan execution, hardened smoke, all 36 browser tests, and restart checks completed successfully.
- [Software run 40240643815](https://github.com/lumensparkxy/brickguide-3d/actions/runs/40240643815): **passed**. 549 backend tests passed and two optional retained-cache tests skipped; 111 frontend tests and 17 software browser tests passed, along with schema/lint/build. Local backend coverage was 551 passed.
- Initial smoke: 31/31 passed. Restart: 31/31 passed. Browser: 36 passed, zero failures/errors/skips. Browser runtime was the actual container, not a native fallback.
- Image ID: `sha256:f97822e761beb6308fad0ff8363af296b04112825efa90eb6b308f41868eca67`. This is a runner-local Docker image ID, not a published registry digest.
- Source digest: `b53347a110aa4b86b66ddf44504543efcc9d10cd0ef9c378ebcb14a3c464efce`; GitHub candidate recorded a clean working tree.
- Scan: 164 total package findings, including 44 HIGH findings across eight distinct CVEs. The report supplies no fixed version for those HIGH findings. No finding was suppressed.
- Metadata-only artifact retention: seven days. Downloaded reports are retained at `var/evidence/github-container-ci/run-40240643751/`; compact result: `var/evidence/github-container-ci/result.json`.

The blockers concern Debian util-linux-related packages, acl, ncurses, systemd-related
libraries and perl. Several are package-level duplicates of the same CVE; 44 findings
does not mean 44 distinct vulnerabilities. Runtime restrictions limit exposure but do
not erase scan findings or satisfy the configured gate. Distroless Python was reviewed
as an alternative: its official package list still includes affected libuuid/ncurses/
libtinfo libraries and requires a Python 3.13-compatible build. No unsupported runtime
rebuild or scan-policy exception was introduced to force a green result.

Next release engineering gate: resolve these upstream findings or complete an explicit,
evidence-backed security triage through a separately reviewed policy change. Do not
deploy the rejected image. The current workflow remains fail-closed. Source rights,
human/physical/device verification, public voice controls, hosting/support and an actual
deployment/rollback rehearsal remain separate. No merge to main, registry publication,
provider-secret setup, or deployment occurred. A final documentation-only checkpoint
uses `[skip ci]`; tested executable/image inputs remain bound to the commit above.
