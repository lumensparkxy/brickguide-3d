# Open-source release — 6 October 2026

This release publishes the engine, viewer, specifications and agent setup under MIT.
Application source is taken from the tested production snapshot
`3348d94493f421f5cb8a35f7ab66a56e99bbc351`; duplicate generated `dist 2` output is excluded.
The snapshot ID is a local release provenance record, not a promised public Git commit.
Public packaging adds documentation, licensing, ignore rules and example cloud settings.
The current primary development workspace contains later unrelated work that is not
implicitly included in this snapshot.

The live demo serves 13 saved alpha booklets across 10 sets. The 31134/booklet-01 shuttle
has 72 viewer snapshots and 148 physical instances; 47 of 48 numbered main steps are
represented. Main step 39 remains unresolved and other reconstruction findings remain.
These coverage counts are not an accuracy score. Human review and physical assembly
validation have not been performed.

The production gate passed 1,405 backend tests (3 skipped), 54 frontend tests, schema,
lint, typecheck and build. Both production aliases were checked in Chromium for opening
and step fly-in, Replay, identical settled frames, full-build controls, phone layout and
reduced motion. This verifies software behavior, not source or mechanical correctness.
Fresh publication checks passed the same 1,405 backend tests (3 skipped), 54 frontend tests
and all 20 software browser tests. The synthetic storage fixture now uses the configured
test origin so isolated local ports can be tested. Synthetic PNG fixtures are fixed
as exact bytes so image compression does not change prompt-golden hashes across platforms. Application runtime files match the
production snapshot byte for byte. GitHub Actions provides a fresh hosted check.

The default web runtime does not perform fresh model reconstruction. The separate local
CLI engine uses authenticated model access and retains its proposals and findings. The
public repository contains no preauthenticated model access or private run database.

Historical execution documents are retained as dated records. They can reference ignored
local evidence paths and deployment identifiers, and some early documents describe the
initial local-only scope. Use the root README and this release record for current setup
and publication scope. The original `BUILD_V1.md` is an implementation contract, not a
statement that all reconstruction acceptance criteria have passed.
