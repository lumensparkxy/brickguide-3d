# Contributing

Start with [AGENTS.md](AGENTS.md), the [product specification](docs/01_PRODUCT_SPEC.md)
and the [release status](docs/OPEN_SOURCE_RELEASE.md). Keep changes small and preserve
unrelated work. Contributions are welcome through pull requests.

Run the full `uv run python tools/check.py` gate and the relevant software browser tests.
For viewer changes, inspect actual rendered behavior, including phone layouts and reduced
motion. Report which checks were run and what remains unverified.

Reconstruction changes must retain official-source evidence, stable physical instance IDs,
uncertainty, original proposals and corrections. Do not import finished community models,
substitute generic geometry or describe an authored reference as an unaided model result.
A schema or image match alone is not a physical-assembly correctness claim.

Keep manuals, downloaded parts, model-call logs, credentials, job databases and private
run evidence under ignored local paths. Never commit them. Include bounded synthetic
fixtures for tests and retain third-party notices.

By submitting original code or documentation, you agree that your contribution may be
distributed under this repository's MIT license. Third-party assets retain their own terms.
