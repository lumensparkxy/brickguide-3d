# Security

The unauthenticated development API and reconstruction engine are intended for loopback
use. Do not expose them directly to the Internet. The public demo uses a separate limited
API entrypoint and saved release bundles.

Keep credentials out of source, prompts, model outputs, screenshots and Git history.
Official PDFs and model output are untrusted input. Preserve path, source-host, resource,
identity and provenance checks when modifying the pipeline.

Please report suspected vulnerabilities privately through this repository's GitHub
Security tab using **Report a vulnerability**. Do not put credentials, private source
files or exploit details into a public issue. If private reporting is unavailable, contact
the repository owner through the contact information on their GitHub profile first.

This is an experimental project without a guaranteed security-response SLA. Source
availability and passing tests are not a security certification.
