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

## Security follow-up — 26 October 2026

The official Python `3.11-slim-trixie` tag still resolves to the pinned digest
`b7a9e5f6a93d6d4a31f129bbd4bdee69efccb6ded0fb230d78aafaf37af98377`.
Live Debian Security Tracker review confirms no Trixie fixed version for any of
the eight blocking CVEs. An independent agent review reached the same conclusion.

| Source package | Findings in previous image | Upstream status and decision |
| --- | ---: | --- |
| util-linux | 36 | Four CVEs: [76642](https://security-tracker.debian.org/tracker/CVE-2026-76642), [78408](https://security-tracker.debian.org/tracker/CVE-2026-78408), [78409](https://security-tracker.debian.org/tracker/CVE-2026-78409), [78410](https://security-tracker.debian.org/tracker/CVE-2026-78410). Fixes in unstable/testing, not stable. Remove unused non-Essential mount package only; retain Protected login. |
| acl | 1 | [54369](https://security-tracker.debian.org/tracker/CVE-2026-54369): Trixie vulnerable; retain library required by coreutils. |
| ncurses | 4 | [69720](https://security-tracker.debian.org/tracker/CVE-2025-69720): infocmp overflow; no Trixie fix. Retain Essential tools and Python-linked libraries. |
| systemd | 2 | [16742](https://security-tracker.debian.org/tracker/CVE-2026-16742): systemd-homed issue; scan reports related libraries. No suppression based on source-package attribution. |
| perl | 1 | [9538](https://security-tracker.debian.org/tracker/CVE-2026-9538): Archive::Tar allocation issue; stable fix postponed. Retain Essential perl-base. |

The first attempt (run `40385830089`, commit `ced16cb`) stopped during APT simulation:
`login` is marked `Protected: yes` in Debian's exact source-package control metadata,
although it is not Essential. The guard was narrowed to mount only; no protection was
overridden. Software CI `40385829920` passed for that attempt.

The build now simulates an APT purge of only `mount`, rejects Essential/Protected
packages or any additional removals/installations, then uses the package manager
without force flags or autoremove. It checks dependency consistency and imports Python
extensions that rely on system libraries. Package metadata remains intact for scanning.
CI retains an installed-package/version inventory alongside the full scan report.
No unstable repositories, private backports, CVE ignores or severity changes were added.

Local validation: 36 targeted packaging/removal/smoke-helper tests passed, Ruff passed,
workflow actionlint passed, and `git diff --check` passed. GitHub results follow below.

### Executed follow-up result

Tested code: `9434db7afc4c9c66bbc62b49471d161f26830354` (clean tree).

- [Container run 40386411228](https://github.com/lumensparkxy/brickguide-3d/actions/runs/40386411228): build, scan execution, 31 hardened smoke checks, all 36 browser cases and 31 restart checks passed. Only the strict vulnerability gate failed.
- [Software run 40386411230](https://github.com/lumensparkxy/brickguide-3d/actions/runs/40386411230): passed; 560 backend tests passed, two optional cache tests skipped, 111 frontend tests and 17 software browser tests passed.
- Scan: 158 package findings (60 LOW, 57 MEDIUM, 40 HIGH, one UNKNOWN, zero CRITICAL). Still eight distinct blocking CVEs and no reported fixed versions. Removing mount eliminated four HIGH package findings, not four distinct CVEs. No findings were suppressed.
- APT's actual plan and operation removed only mount. Installed-package inventory confirms mount is absent. Dependency consistency and Python extension imports passed.
- Runner-local image ID: `sha256:50eb61a3645bf6eff75f19f23f71b70327e52594c5270ebf60d6b7f23a515b86` (not a published registry digest).
- Source digest: `2ffc4467437dbbb8f87d56c552da25567e0934065504d51fcc93ed1148ccda16`.
- Downloaded metadata: `var/evidence/github-container-ci/run-40386411228/`. Remote retention remains seven days.
- The long setup delay was an Ubuntu browser-dependency download: 22.8 MB took 14 minutes 52 seconds. It completed successfully; tests were not bypassed.

The image remains rejected for production. Further remediation requires supported
Debian fixes or a separately scoped, compatibility-tested runtime replacement; mixing
unstable packages, forcibly removing protected dependencies, and scan exceptions were
not used. No user credential or policy waiver is needed for this completed investigation.
No deployment, registry publication, merge to main, provider key or inference occurred.
