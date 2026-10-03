import hashlib
import pytest
from guide2build.engine.validation import EvidenceFile, ValidationBundle


def test_validation_evidence_root_confined_and_hash_bound(tmp_path):
    folder = tmp_path / "bundle"
    folder.mkdir()
    outside = tmp_path / "outside"
    outside.write_bytes(b"data")
    sha = hashlib.sha256(b"data").hexdigest()
    with pytest.raises(ValueError, match="escapes"):
        EvidenceFile(path="../outside", sha256=sha).verify(folder)
    (folder / "good").write_bytes(b"data")
    assert EvidenceFile(path="good", sha256=sha).verify(folder).name == "good"
    with pytest.raises(ValueError, match="hash"):
        EvidenceFile(path="good", sha256="a"*64).verify(folder)


def test_independent_bundle_requires_rendered_review_not_boolean_assertion():
    with pytest.raises(ValueError):
        ValidationBundle.model_validate({"candidate_sha256": "a"*64, "source_index": {},
            "connector_report": {"status": "pass"}, "assembly_report": {"status": "pass"}})
