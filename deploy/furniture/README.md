# Isolated furniture release package

This package serves the read-only `/ikea` experience. Public voice and LEGO job APIs
are absent. It does not package the combined project homepage or certify physical
assembly, source redistribution permission, or public readiness.

## Prepare a frozen candidate

From the repository root, after checks finish and source edits stop:

```sh
.venv/bin/python tools/prepare_furniture_release.py --output var/releases/furniture-candidate-001
.venv/bin/python tools/check_furniture_release.py --cache var/releases/furniture-candidate-001/assets --web-dist var/releases/furniture-candidate-001/web --release-record var/releases/furniture-candidate-001/release.json --strict-cache
```

Preparation builds the frontend and records source-file, lockfile, frontend and curated
asset SHA-256 values, Git commit/tree and dirty state. It snapshots the exact source
files into `context/`. Existing candidates are never overwritten. Only curated PDFs,
page images and manifests enter `assets/`; ambient caches, backups, credentials and
unrelated files are excluded. Do not use `var/furniture` directly as a build context.
Human review and rights clearance must refer to this candidate's actual revision.

## Build and exercise the image locally

Docker with BuildKit/buildx is required. No container runtime is installed by these
scripts. Base-image multiarchitecture manifests are pinned by digest. A digest pins
bytes; it is not a vulnerability certification. Scan the resulting OS/runtime image
before public deployment.

```sh
docker buildx build --load --metadata-file var/releases/furniture-candidate-001/image-metadata.json -f var/releases/furniture-candidate-001/context/deploy/furniture/Dockerfile --build-context furniture-assets=./var/releases/furniture-candidate-001/assets -t furniture-coach:candidate-001 var/releases/furniture-candidate-001/context
docker image inspect furniture-coach:candidate-001 --format '{{.Id}}' > var/releases/furniture-candidate-001/image-id.txt
FURNITURE_IMAGE="$(cat var/releases/furniture-candidate-001/image-id.txt)" docker compose -f deploy/furniture/compose.yaml up -d
curl --fail http://127.0.0.1:8080/api/v1/furniture/health
curl --fail http://127.0.0.1:8080/ikea
```

The Docker build first verifies the complete frozen source inventory (including backend
code) and copies subsequent build inputs only from that verified stage. It then checks
exact staged assets and rebuilt frontend hashes against the
candidate record. It fails closed if regenerated frontend output differs; investigate
toolchain/platform differences and retain both outputs rather than bypassing the check.
Inspect the actual browser on port 8080, including diagrams, imagery, source failures,
phone layout and navigation. Confirm LEGO job and voice-session requests return 404.
Record container health, image ID, browser evidence and image scan results alongside
`release.json`; do not replace `container_validation: not_run` without execution.

The compose service binds only loopback, runs as UID 10001 with a read-only root,
drops Linux capabilities, limits resources and bounds local logs. No key, host data
mount or Docker socket is supplied. HTTPS, host routing, public support and monitoring
are hosting decisions that remain outside this local package.

## Rollback rehearsal

Keep both the previous tested image ID and its complete candidate directory. Set
`FURNITURE_IMAGE` to the previous immutable ID and run the same compose `up -d` command;
then repeat health and browser smoke checks. Image and source cache travel together.
A successful deployment/rollback must be recorded from real execution, not this recipe.

## GitHub Actions validation (no deployment)

`.github/workflows/furniture-container.yml` builds on the dedicated
`codex/furniture-container-ci` branch and supports manual dispatch once the workflow
is present on the repository default branch. It has only `contents: read` permission,
no registry login/push, no deployment step, and no provider or cloud credentials.
Normal software CI continues independently using frozen Python/npm lockfiles.

The ephemeral runner downloads the exact allowlisted official documents, checks
source hashes, generates a frozen candidate, builds the digest-pinned Dockerfile,
and scans all OS/library vulnerabilities. HIGH/CRITICAL findings (including unfixed
ones), scanner failures, smoke failures or browser failures fail the job. The image
runs non-root with a read-only filesystem, dropped capabilities, bounded resources,
and a loopback port. Container smoke checks bind the running image ID to the built
image ID; Playwright uses `FURNITURE_CONTAINER_TEST=1` so it cannot silently start a
native substitute server. Restart recovery is tested; it is not a deployment rollback.

Only explicitly allowlisted release metadata, image identity, scan JSON and text test
reports are uploaded with seven-day retention. Manuals, rendered pages, browser
screenshots/traces, source caches and the Docker image remain on the ephemeral runner;
no image or source-document distribution is part of this workflow. The Gemini key is
not needed. To enable public voice later, its separate authentication/cost/security
work and runtime secret provisioning must be completed first.

GitHub execution results are recorded in `docs/furniture/GITHUB_CONTAINER_CI.md`.
