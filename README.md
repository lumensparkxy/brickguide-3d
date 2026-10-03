# Guide2Build 3D — Version I

**Set number → official instruction booklet → reconstructed assembly → interactive Three.js tutorial.**

This local prototype retrieves official instructions, prepares durable jobs, and displays versioned
PDF-assisted assembly candidates with individual LDraw geometry. Runtime automatic reconstruction is
disabled. A candidate is not a verified build: see [current validation](docs/execution/VALIDATION_REPORT.md)
for source coverage, outstanding geometry findings and actual test evidence.

## Start in Codex

Open this folder as the project root and paste the prompt in **[docs/prompts/BUILD_V1.md](docs/prompts/BUILD_V1.md)**.
For a shorter launch, use:

> Read AGENTS.md and docs/00_START_HERE.md, then execute docs/prompts/BUILD_V1.md end to end. Implement, test, and verify Version I. Continue beyond planning and the four-step checkpoint to the full selected booklet, unless a concrete blocker prevents it. Preserve source provenance and never claim automatic reconstruction or human verification without evidence.

[Start here](docs/00_START_HERE.md) · [Specification](docs/01_PRODUCT_SPEC.md) · [Architecture](docs/02_ARCHITECTURE.md) · [Current status](docs/14_SCAFFOLD_STATUS.md)

## Run locally

Prerequisites: Python 3.11+, Node 22.12+ (or a compatible newer LTS), npm, and uv.
Real dependency lockfiles are included. No system-wide package installation or API key is required.

```bash
uv sync --extra dev
npm install
uv run python tools/doctor.py
uv run python tools/prepare_reference.py  # first setup: official PDF + parts + labelled authored candidate
uv run python tools/dev.py
```

Frontend: http://127.0.0.1:5173 · API: http://127.0.0.1:8000/api/v1/health
The launcher starts the API, SQLite worker and frontend on loopback; Ctrl-C stops all three.
Enter **30669**, choose **Alternate aeroplane — booklet 02**, then prepare the official source or
open the available candidate for review. Candidate warnings remain visible throughout navigation.

The catalogue also includes official booklets for nine additional sets. **Prepare booklet** downloads
and renders their source pages; it does not create the missing 3D assemblies. All 19 registered booklets
across ten sets have passed local source preparation. See [source preparation limits and evidence](docs/execution/LARGE_SOURCE_PREPARATION.md).

```bash
uv run python tools/check.py          # local unit/API/schema and frontend checks
npm run test:e2e                      # install Playwright Chromium first
uv run python tools/fetch_guide.py --set 30669 --guide alt-02
```

Fetching requires external network access. Official PDFs and individual part assets remain in ignored
`var/`; source images are not bundled with code. A fresh installation needs source and part preparation.
`prepare_reference.py` performs this bounded download and recreates the shipped authored candidate,
verifying source and every geometry dependency hash. It does not run a vision model. The worker never
invents a missing reference or substitutes one for an automatic conversion.

For sandboxed Codex execution on this Mac, `uv` required approved execution outside the sandbox.
Use `UV_CACHE_DIR=.cache/uv` to keep its download cache local. Once installed, `.venv/bin/python tools/dev.py`
also starts the app; permission to bind local ports is still required in a restricted sandbox.

## Docs-only installation

Copy the supplied `docs/` directory into an empty repository. The same launch prompt works:
it first runs `python3 docs/bootstrap/materialize.py` to create missing project files.
The materializer never overwrites an existing file and reports conflicts. Reopen Codex after
materialization when needed for newly created project-local agents/configuration to be discovered.
The build can still proceed in the current session by reading the role and skill files explicitly.

## Boundaries

- First supported source: set 30669, official alternate booklet `30669_02_BI_Build_Alt.pdf`.
- First geometry checkpoint: main steps 1–4. Final V1 target: all main steps in that booklet.
- No PDF-upload requirement, RAG requirement, text-to-new-design, shopping, accounts or public hosting.
- Local development only by default. Public hosting requires authentication, job isolation and a rights review.
- Codex uses `.codex/config.toml`; `project.toml` is this repository's own project manifest.
