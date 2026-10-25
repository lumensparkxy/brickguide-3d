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
claimed from those local checks. GitHub results will be added after the real run.

Only metadata and text reports are retained for seven days. Existing screenshots and
traces are deliberately excluded because they may contain official manual crops.
A restart pass is not a production rollback. Human, physical, rights, real-device,
public voice and actual deployment gates remain separate.
