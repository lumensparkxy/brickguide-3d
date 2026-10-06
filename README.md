# Guide2Build 3D

**Explore illustrated LEGO instructions as an interactive, step-by-step 3D assembly.**

[Try the live alpha](https://guide2build-web-i2tso5lznq-ew.a.run.app/) ·
[How reconstruction works](docs/03_RECONSTRUCTION_SPEC.md) ·
[Engine guide](docs/execution/ENGINE.md) ·
[Release status](docs/OPEN_SOURCE_RELEASE.md) · [MIT license](LICENSE)

Guide2Build combines a Python reconstruction engine with a React, TypeScript and Three.js
viewer. The engine uses official instruction booklets and individual LDraw part geometry
to propose parts, poses and subassemblies. The viewer lets you rotate, zoom, follow the
instruction sequence and replay the pieces flying into place.

The public demo serves **13 saved alpha booklets across 10 sets**. It does not run a new
AI reconstruction when you select a set. Automatic reconstruction is a separate, opt-in
local CLI workflow. Saved authored references, automatic proposals and corrected results
retain separate provenance.

> **Working alpha.** Reconstruction errors and missing steps remain. Software tests,
> attractive renders and completed processing do not prove attachment correctness or
> physical buildability. Human review and physical assembly validation remain incomplete.

## What is included

- **3D viewer:** step navigation, camera controls, replay, full-build playback, phone layout
  and reduced-motion support. Unverified fly-in paths are labelled visual previews.
- **Reconstruction engine:** official-source indexing, individual-part lookup, model proposals,
  deterministic checks, resumable jobs, corrections, source comparisons and explicit findings.
- **Project context:** specifications, architecture, data contracts, agent instructions, skills,
  tests and an implementation prompt. The specifications describe intended behavior; release
  records describe what has actually been demonstrated.

No completed community model is used as a reconstruction shortcut. Official PDFs, downloaded
parts, private model calls, credentials and run databases are kept out of Git.

## Run locally

Requirements: Python 3.11+, Node.js 22.12+ (or a compatible newer LTS), npm and uv.

```sh
git clone https://github.com/lumensparkxy/brickguide-3d.git
cd brickguide-3d
uv sync --extra dev
npm ci
uv run python tools/doctor.py
uv run python tools/dev.py
```

Open http://127.0.0.1:5173. The API is at http://127.0.0.1:8000/api/v1/health.
The launcher starts the local API, worker and frontend; Ctrl-C stops them. This setup
requires no model API key and makes no paid inference calls automatically.

To prepare the initial **authored reference** for set 30669 / alternate booklet 02:

```sh
uv run python tools/prepare_reference.py
```

This explicitly downloads the allowlisted official booklet and individual part dependencies,
checks their hashes and recreates the labelled reference. It does not run a vision model.
The source files and parts are cached under ignored `var/` and retain their own terms.
See [source and asset notices](THIRD_PARTY_NOTICES.md).

## Run the reconstruction engine

The local batch engine is separate from the default web worker and public demo. It requires
your own authenticated Codex CLI, a model available to your account, and an explicit usage
budget. It can incur model usage charges. Choose a bounded set/booklet job and follow the
[engine runbook](docs/execution/ENGINE.md); use `tools/engine.py --help` to inspect commands.
Do not treat a completed run as a verified reconstruction.

## Check the software

```sh
uv run python tools/check.py          # backend, schema, lint, frontend tests and build
uv run python tools/check.py --quick  # selected development checks; not the release gate
npx playwright install chromium
npm run test:e2e -- --project=software
```

The software browser suite uses labelled synthetic fixtures and runs without downloading
manuals or calling models. The separate `reference` project requires prepared source/parts.
CI checks software behavior; it does not certify reconstruction accuracy.

## Work with a coding agent

Start with [AGENTS.md](AGENTS.md) and [docs/00_START_HERE.md](docs/00_START_HERE.md).
The implementation contract is [docs/prompts/BUILD_V1.md](docs/prompts/BUILD_V1.md).
Project roles and reusable skills are in `.codex/agents/` and `.agents/skills/`.
Inspect the current release state before asking an agent to continue the original build plan.

## Structure

| Path | Purpose |
|---|---|
| `apps/web/` | React / TypeScript / Three.js viewer |
| `apps/api/src/guide2build/` | Python API, source retrieval and reconstruction engine |
| `packages/contracts/` | Schemas and labelled fixtures |
| `config/` | Curated sources, individual parts and authored reference metadata |
| `docs/` | Product specifications, runbooks and historical execution records |
| `var/` | Ignored local sources, assets, jobs and evidence |

Cloud deployment is optional and is not part of local setup. The deployment configuration
contains example placeholders; configure your own resources and release authority before
using cloud tools. Historical operational records and commit metadata may mention the
maintainer's deployment; they do not grant access to it. No live model outputs or cloud
credentials are supplied with the code.

## License and contributing

Original project code and documentation are [MIT licensed](LICENSE). Dependencies, fonts,
source manuals and individual part assets retain their own licenses and notices. See
[third-party notices](THIRD_PARTY_NOTICES.md), [contributing](CONTRIBUTING.md) and
[security reporting](SECURITY.md).

Independent prototype. Not affiliated with or endorsed by the LEGO Group.
LEGO is a trademark of the LEGO Group.
