"""Connector provenance failures and original synthetic landmark fixtures."""
from copy import deepcopy
import hashlib
import json

import pytest

from guide2build.engine import connectors


@pytest.fixture
def fixture_catalogue(tmp_path, monkeypatch):
    root = tmp_path / "geometry"
    content = {"parts/1.dat": ("Part", b"0 Original synthetic test part\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 test.dat\n", ["p/test.dat"]),
               "p/test.dat": ("Primitive", b"0 Original synthetic primitive\n3 16 0 0 0 1 0 0 0 1 0\n", [])}
    records = {}
    for reference, (kind, data, dependencies) in content.items():
        path = root / reference
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        records[reference] = {"sha256": hashlib.sha256(data).hexdigest(), "classification": kind,
                              "url": "https://library.ldraw.org/library/official/" + reference,
                              "dependencies": dependencies}
    # Official-shaped URLs are synthetic provenance-boundary fixtures only; no download or accuracy claim.
    (root / "provenance.json").write_text(json.dumps({"resources": records, "file_map": {"test.dat": "p/test.dat"}}))
    pins = [[p, r["sha256"]] for p, r in sorted(records.items())]
    metadata = {"schema_version": "1.0", "scope": "Original synthetic test fixture", "metadata_status": "synthetic",
                "tolerance_ldu": .05, "limits": {}, "unsupported": ["other parts"], "parts": [{
                    "part_id": "1", "geometry_ref": "parts/1.dat", "geometry_sha256": records["parts/1.dat"]["sha256"],
                    "closure_sha256": hashlib.sha256(json.dumps(pins, separators=(",", ":")).encode()).hexdigest(),
                    "closure_file_count": 2, "evidence_resources": pins, "connectors": [
                        {"connector_id": "stud:0:0:0", "kind": "stud", "position_ldu": [0, 0, 0],
                         "landmark": {"landmark_id": "stud:0:0:0:tip", "position_ldu": [0, 4, 0]}},
                        {"connector_id": "socket:0:-8:0", "kind": "socket", "position_ldu": [0, -8, 0]}]}]}
    path = tmp_path / "metadata.json"
    path.write_text(json.dumps(metadata))
    monkeypatch.setattr(connectors, "METADATA", path)
    return root, metadata, path


def test_metadata_hashes_bind_root_and_complete_dependency_closure(fixture_catalogue):
    root, metadata, _ = fixture_catalogue
    actual, parts = connectors.load_connector_catalogue(root, ["parts/1.dat"])
    assert actual == metadata and len(parts) == 1
    primitive = root / "p/test.dat"
    primitive.write_bytes(b"changed primitive geometry")
    with pytest.raises(ValueError, match="hash mismatch"):
        connectors.load_connector_catalogue(root)
    manifest = json.loads((root / "provenance.json").read_text())
    manifest["resources"]["p/test.dat"]["sha256"] = hashlib.sha256(primitive.read_bytes()).hexdigest()
    (root / "provenance.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="metadata hash pin differs"):
        connectors.load_connector_catalogue(root)


def test_wrong_classification_origin_dependencies_and_symlink_fail(fixture_catalogue):
    root, _, metadata_path = fixture_catalogue
    path = root / "provenance.json"
    manifest = json.loads(path.read_text())
    for key, value, message in [("classification", "Model", "provenance"),
                                ("url", "https://example.com/model.dat", "provenance"),
                                ("dependencies", [], "receipt mismatch")]:
        changed = deepcopy(manifest)
        changed["resources"]["parts/1.dat"][key] = value
        path.write_text(json.dumps(changed))
        with pytest.raises(ValueError, match=message):
            connectors.load_connector_catalogue(root)
    path.write_text(json.dumps(manifest))
    original = metadata_path.read_text()
    other = metadata_path.with_name("metadata-copy.json")
    other.write_text(original)
    metadata_path.unlink()
    metadata_path.symlink_to(other)
    with pytest.raises(ValueError, match="Unsafe"):
        connectors.load_connector_catalogue(root)


def test_visible_landmarks_are_distinct_from_mating_origins_and_sockets(fixture_catalogue):
    root, _, _ = fixture_catalogue
    pose = {"position_ldu": [3, 4, 5], "quaternion_xyzw": [0, 0, 0, 1]}
    assert connectors.world_connector(pose, "parts/1.dat", "stud:0:0:0", root) == [3, 4, 5]
    assert connectors.world_landmark(pose, "parts/1.dat", "stud:0:0:0:tip", root) == [3, 8, 5]
    with pytest.raises(ValueError, match="visible landmark"):
        connectors.world_landmark(pose, "parts/1.dat", "socket:0:-8:0", root)
    with pytest.raises(ValueError, match="Unknown connector"):
        connectors.world_connector(pose, "parts/1.dat", "internal-stud", root)
    with pytest.raises(ValueError, match="Unsupported connector metadata"):
        connectors.world_connector(pose, "parts/2.dat", "stud:0:0:0", root)


def test_real_catalogue_has_no_internal_13547_socket_or_tile_top_stud():
    metadata = json.loads((connectors.ROOT / "config/individual-connectors.json").read_text())
    parts = {p["part_id"]: p for p in metadata["parts"]}
    slope = parts["13547"]
    assert [f["position_ldu"] for f in slope["connectors"] if f["kind"] == "socket"] == [[0, -16, 0]]
    assert [f["connector_id"] for f in slope["connectors"] if f["kind"] == "stud"] == [
        "stud:0:-8:0", "stud:0:-8:20", "stud:0:0:40", "stud:0:0:60"]
    assert all(f["kind"] == "socket" for f in parts["25269"]["connectors"])
    assert all("landmark" not in f for p in parts.values() for f in p["connectors"] if f["kind"] == "socket")


def test_available_individual_cache_matches_all_pilot_metadata_pins():
    root = connectors.ROOT / "var/public/ldraw"
    if not (root / "provenance.json").exists():
        pytest.skip("Optional retained individual geometry evidence is not bundled with tests")
    _, parts = connectors.load_connector_catalogue(root)
    assert set(parts) == {f"parts/{part}.dat" for part in [
        "3022", "13547", "35044", "3020", "3710", "25269", "11477", "15573", "18980", "22385",
        "3023", "3023b", "3040b", "3068b", "32028", "3623", "6636", "78443", "78444"]}


def test_pilot_asymmetric_receivers_do_not_use_bounds_or_internal_supports():
    metadata = json.loads((connectors.ROOT / "config/individual-connectors.json").read_text())
    parts = {p["part_id"]: p for p in metadata["parts"]}
    # 11477's original origin is lower than its supported rear seating plane.
    assert parts["11477"]["bounds_ldu"][0][1] == 0
    assert [f["position_ldu"] for f in parts["11477"]["connectors"]] == [[0, 8, -10]]
    assert parts["11477"]["limitations"]
    # The jumper top really is offset from both conventional underside receivers.
    assert [(f["kind"], f["position_ldu"]) for f in parts["15573"]["connectors"]] == [
        ("stud", [0, 0, 0]), ("socket", [-10, -8, 0]), ("socket", [10, -8, 0])]
    assert [f["position_ldu"] for f in parts["3040b"]["connectors"] if f["kind"] == "socket"] == [
        [0, -24, 0], [0, -24, 20]]
    # An official moved-part wrapper preserves its local geometry, not its root hash.
    assert parts["3023"]["connectors"] == parts["3023b"]["connectors"]
    assert parts["3023"]["geometry_sha256"] != parts["3023b"]["geometry_sha256"]
    assert parts["3023"]["canonical_geometry_alias"] == "parts/3023b.dat"


@pytest.mark.parametrize(("part_id", "excluded"), [
    ("11477", ["socket:0:0:10", "stud:0:0:0"]),
    ("15573", ["socket:0:-8:0", "stud:10:0:0"]),
    ("18980", ["socket:50:-8:10", "socket:-50:-8:10"]),
    ("22385", ["socket:0:-8:20", "socket:10:-8:20", "stud:0:0:0"]),
    ("32028", ["socket:0:-8:16", "stud:0:0:16"]),
    ("78443", ["socket:10:-8:50", "socket:10:-8:30"]),
    ("78444", ["socket:-10:-8:50", "socket:-10:-8:30"]),
])
def test_pilot_cutouts_rails_and_unreviewed_contacts_remain_unsupported(part_id, excluded):
    metadata = json.loads((connectors.ROOT / "config/individual-connectors.json").read_text())
    part = next(p for p in metadata["parts"] if p["part_id"] == part_id)
    for identifier in excluded:
        with pytest.raises(ValueError, match="Unknown connector"):
            connectors.connector(part, identifier)


def test_available_pilot_external_studs_follow_individual_dat_transforms():
    """Compare metadata to pinned primitive transforms, including mirrored wing roots."""
    from guide2build.engine.geometry import stud_mesh_frames
    root = connectors.ROOT / "var/public/ldraw"
    if not (root / "provenance.json").exists():
        pytest.skip("Optional retained individual geometry evidence is not bundled with tests")
    manifest = json.loads((root / "provenance.json").read_text())
    _, parts = connectors.load_connector_catalogue(root)

    def read(reference, record):
        data = (root / reference).read_bytes()
        assert hashlib.sha256(data).hexdigest() == record["sha256"]
        return data

    new_parts = {"11477", "15573", "18980", "22385", "3023", "3023b", "3040b", "3068b", "32028",
                 "3623", "6636", "78443", "78444"}
    for reference, part in parts.items():
        if part["part_id"] not in new_parts:
            continue
        # The mesh-context helper does not recurse through official moved-Part aliases.
        # Verify the alias is an identity wrapper before checking its canonical Part.
        mesh_reference = part.get("canonical_geometry_alias", reference)
        if mesh_reference != reference:
            references = [line.split(maxsplit=14) for line in read(reference, manifest["resources"][reference]).decode().splitlines()
                          if line.startswith("1 ")]
            assert len(references) == 1
            assert list(map(float, references[0][2:14])) == [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
            assert manifest["file_map"][references[0][14]] == mesh_reference
        frames, truncated = stud_mesh_frames(mesh_reference, manifest, read)
        assert not truncated
        external = {tuple(f["position_ldu"]) for f in frames if f["primitive"] in {"p/stud.dat", "p/stud2.dat"}}
        declared = {tuple(f["position_ldu"]) for f in part["connectors"] if f["kind"] == "stud"}
        assert declared == external, reference
        assert all("landmark" not in f for f in part["connectors"] if f["kind"] == "socket")
