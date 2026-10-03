# Start here — Guide2Build 3D, Version I

## The brief in one sentence
Enter a LEGO set number, obtain its official instructions behind the scenes, reconstruct the assembly
from the booklet, and follow the original sequence in an interactive Three.js viewer.

**Do not use a completed community model. Do not create a PDF-upload interface. Do not build Version II.**

## Your two installation paths

**Full scaffold:** extract the project archive and open the `guide2build-3d` folder in Codex.
It already contains the root configuration, code starter, tests and this documentation.

**Only docs:** copy this entire `docs/` folder into a fresh project. Run the same launch prompt below.
Its first action is to execute `python3 docs/bootstrap/materialize.py` when the root scaffold is absent.
The bootstrap uses bundled files, has no network dependencies and never overwrites existing files.
It reports conflicting files for review. It creates `.codex/`, `.agents/`, `AGENTS.md`, `project.toml`,
Python/JavaScript manifests, starter code, tools and tests. Do not copy just this Markdown file.

### Paste this in Codex

```text
Read docs/00_START_HERE.md. If the root scaffold is absent, run
python3 docs/bootstrap/materialize.py, then read AGENTS.md.
Execute docs/prompts/BUILD_V1.md end to end. Implement, test and verify
Version I, using the official PDF and individual part geometry only.
Continue beyond the first four steps to the full selected booklet unless
there is a concrete blocker. Preserve source evidence, uncertainty and
corrections. Never substitute a completed community model or fake success.
```

A longer, explicit task contract is in `docs/prompts/BUILD_V1.md`. Either prompt initiates the same work.
This is an execution contract, not a guarantee that every model ambiguity can be resolved without review.

## Read order for the agent

| File | Why it matters |
|---|---|
| `01_PRODUCT_SPEC.md` | Product scope, user journey and completion categories. |
| `02_ARCHITECTURE.md` | Components, storage, processing and boundaries. |
| `03_RECONSTRUCTION_SPEC.md` | The difficult work: turning visual instructions into actual assemblies. |
| `04_DATA_CONTRACTS.md` | Instance identity, poses, subassemblies, source evidence and revisions. |
| `05_API_SPEC.md` | Current starter routes and target processing/review routes. |
| `06_UI_UX_SPEC.md` | Set-number workflow, viewer, correction and non-success states. |
| `07_IMPLEMENTATION_PLAN.md` | Ordered milestones and dependency gates. |
| `08_ACCEPTANCE_TESTS.md` | Testable completion requirements and honest evidence. |
| `09_CODEX_RUNBOOK.md` | Agent execution, compatibility, approvals and restart recovery. |
| `10_SECURITY_AND_RIGHTS.md` | Source/asset safety and local-only publication boundary. |
| `11_DEPLOYMENT_AND_OPERATIONS.md` | Local start, persistence and reproducibility. |
| `12_SOURCES_AND_DECISIONS.md` | External references and source-specific facts. |
| `13_BACKLOG.md` | Agent-ready implementation work, with dependencies. |
| `14_SCAFFOLD_STATUS.md` | What this delivered starter does and does not contain. |
| `15_PART_CATALOGUE.md` | Permitted individual geometry and connector metadata. |

## Default decisions — do not ask the user to decide these again

Use a local React/TypeScript/Vite frontend and a Python/FastAPI backend. Use Three.js directly for rendering.
Use SQLite and the local filesystem for persistent conversion jobs and assets once implemented.
Target set 30669 / alternate booklet 02. Verify the first four main steps, then extend to the complete booklet.
Use individual LDraw shapes; derive every assembly placement from the official guide.
Use npm and uv, generate genuine lockfiles at the first successful dependency installation,
and run on loopback by default. No database server, vector database, cloud account or API key is needed to start.

The runtime vision provider defaults to disabled. Codex may use its own available image tools to author
an evidence-backed reference during development. This is **PDF-assisted authoring**, not evidence that
the deployed app can automatically convert PDFs. A real provider adapter is a separate integration and acceptance gate.

## When an approval or clarification is justified
Missing external access, unavailable credentials, ambiguous assembly evidence that cannot be resolved,
content-use restrictions, a non-empty repository conflict, paid services or destructive operations.
Do not repeatedly ask permission to choose filenames, create local tests, or follow the already selected architecture.

The final handoff must tell us what works, the exact source coverage, what required correction, what remains
unverified, and which commands and evidence substantiate those statements.
