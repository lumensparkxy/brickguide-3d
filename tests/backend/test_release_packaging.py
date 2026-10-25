"""Release boundary tests: never package ambient caches or silently changed assets."""
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[2]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / f"tools/{name}.py")
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


@pytest.fixture
def release(tmp_path, monkeypatch):
    check = module("check_furniture_release")
    cache = tmp_path / "assets"
    folder = cache / "documents/pinned"
    folder.mkdir(parents=True)
    for name in ("source.pdf", "manifest.json", "page-000.png"):
        (folder / name).write_text("verified fixture")
    web = tmp_path / "web"
    (web / "assets").mkdir(parents=True)
    (web / "index.html").write_text("<html></html>")
    (web / "assets/app.js").write_text("export {}")
    doc = SimpleNamespace(sha256="pinned", page_count=1)
    monkeypatch.setattr(check, "search", lambda: [SimpleNamespace(article_number="123", documents=[doc])])
    monkeypatch.setattr(check, "source_health", lambda *args: {"status": "ready"})
    record = tmp_path / "release.json"
    record.write_text(json.dumps({"assets": check.file_hashes(cache), "frontend": check.file_hashes(web)}))
    return check, cache, web, record


def test_rejects_unrelated_cache_file(release):
    check, cache, web, record = release
    (cache / "credentials.txt").write_text("synthetic test only")
    assert check.validate(cache, web, record, True)["status"] == "unavailable"


def test_rejects_changed_frontend_after_record(release):
    check, cache, web, record = release
    assert check.validate(cache, web, record, True)["status"] == "ready"
    (web / "assets/app.js").write_text("changed")
    assert not check.validate(cache, web, record, True)["frontend_record_matches"]


def test_rejects_changed_manifest_after_record(release):
    check, cache, web, record = release
    (cache / "documents/pinned/manifest.json").write_text("changed")
    assert not check.validate(cache, web, record, True)["asset_record_matches"]


def test_rejects_symlink_web_asset(release):
    check, cache, web, record = release
    (web / "assets/leak").symlink_to(record)
    with pytest.raises(ValueError, match="Symlinks"):
        check.validate(cache, web, record, True)


def test_stage_is_allowlisted_and_refuses_overwrite(tmp_path, monkeypatch):
    prepare = module("prepare_furniture_release")
    cache = tmp_path / "cache"
    cache.mkdir()
    permitted = cache / "source.pdf"
    permitted.write_text("source")
    (cache / "unrelated.key").write_text("synthetic")
    monkeypatch.setattr(prepare, "asset_files", lambda root: [permitted])
    target = tmp_path / "stage"
    assert set(prepare.stage_assets(cache, target)) == {"source.pdf"}
    assert not (target / "unrelated.key").exists()
    with pytest.raises(FileExistsError):
        prepare.stage_assets(cache, target)


def test_frozen_backend_tampering_is_rejected(tmp_path):
    import hashlib
    verifier = module("verify_furniture_context")
    backend = tmp_path / "apps/api/src/server.py"
    backend.parent.mkdir(parents=True)
    backend.write_text("safe = True")
    inventory = {"apps/api/src/server.py": hashlib.sha256(backend.read_bytes()).hexdigest()}
    (tmp_path / "release.json").write_text(json.dumps({
        "source_files": inventory,
        "source_digest": hashlib.sha256(json.dumps(inventory, sort_keys=True).encode()).hexdigest(),
    }))
    assert verifier.verify(tmp_path)["status"] == "ready"
    backend.write_text("safe = False")
    with pytest.raises(ValueError, match="Frozen context changed"):
        verifier.verify(tmp_path)


def test_frozen_context_rejects_unrecorded_files(tmp_path):
    import hashlib
    verifier = module("verify_furniture_context")
    (tmp_path / "server.py").write_text("safe = True")
    inventory = {"server.py": hashlib.sha256((tmp_path / "server.py").read_bytes()).hexdigest()}
    (tmp_path / "release.json").write_text(json.dumps({
        "source_files": inventory,
        "source_digest": hashlib.sha256(json.dumps(inventory, sort_keys=True).encode()).hexdigest(),
    }))
    (tmp_path / "injected.py").write_text("unrecorded = True")
    with pytest.raises(ValueError, match="Frozen context changed"):
        verifier.verify(tmp_path)
