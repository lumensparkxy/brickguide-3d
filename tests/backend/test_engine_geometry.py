import hashlib
import json
import pytest
from guide2build.engine.geometry import merge_verified_cache_receipts


def test_selected_closure_keeps_unused_verified_seed_receipts(tmp_path):
    shared, private = tmp_path / "shared", tmp_path / "private"
    shared.mkdir()
    (private / "parts").mkdir(parents=True)
    data = b"individual part test fixture"
    (private / "parts/3022.dat").write_bytes(data)
    record = {"url": "https://library.ldraw.org/library/official/parts/3022.dat",
              "sha256": hashlib.sha256(data).hexdigest()}
    (shared / "provenance.json").write_text(json.dumps({"resources": {"parts/3022.dat": record},
                                                       "file_map": {"3022.dat": "parts/3022.dat"}}))
    (private / "provenance.json").write_text('{"resources":{},"file_map":{}}')
    assert "parts/3022.dat" in merge_verified_cache_receipts(private, shared)["resources"]
    (private / "provenance.json").write_text('{"resources":{},"file_map":{}}')
    (private / "parts/3022.dat").write_bytes(b"tampered")
    with pytest.raises(ValueError, match="hash"):
        merge_verified_cache_receipts(private, shared)
