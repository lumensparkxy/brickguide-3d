import json
from types import SimpleNamespace
import pytest
from guide2build.engine.contracts import PageIndex, strict_schema
from guide2build.engine.provider import ProviderFailure
from guide2build.engine.runner import run_once, validate_candidate
from guide2build.engine.store import EngineStore


@pytest.fixture
def source(monkeypatch, tmp_path):
    import guide2build.engine.runner as runner
    digest = "a" * 64
    monkeypatch.setattr(runner, "cached_receipt", lambda *args: {"sha256": digest})
    monkeypatch.setattr(runner, "render_pages", lambda *args, **kwargs: [{}]*8)
    return tmp_path, digest


class Unavailable:
    def call(self, *args):
        raise ProviderFailure("authentication_required", "login required")


def test_provider_auth_pauses_all_jobs_and_keeps_source_checkpoint(source):
    root, digest = source
    store = EngineStore(root)
    job = store.enqueue("30669", "alt-02", {"model": "test"})
    assert run_once(store, Unavailable())
    result = store.get(job["id"])
    assert result["state"] == "blocked"
    assert result["checkpoint"]["source_sha256"] == digest
    assert result["error"]["code"] == "authentication_required"
    assert store.claim("another") is None
    assert (store.root / "jobs" / job["id"] / "source-receipt.json").is_file()


class BadOutput:
    def __init__(self):
        self.calls = 0

    def call(self, *args):
        self.calls += 1
        return {"panels": "invalid", "uncertainty": []}


def test_malformed_output_has_three_attempts_and_never_candidate(source):
    root, _ = source
    store = EngineStore(root)
    job = store.enqueue("30669", "alt-02", {"model": "test"})
    provider = BadOutput()
    run_once(store, provider)
    assert provider.calls == 3
    assert store.get(job["id"])["error"]["code"] == "proposal_rejected"
    assert "candidate" not in store.get(job["id"])["checkpoint"]
    assert store.provider_pause() is None


def test_strict_index_rejects_bad_bounds():
    with pytest.raises(ValueError):
        PageIndex.model_validate({"panels": [{"section": "main", "number": 1, "label": "one",
            "bbox": [0, 0, 2, 1], "kind": "main"}], "uncertainty": []})
    schema = strict_schema(PageIndex)
    assert schema["additionalProperties"] is False
    assert "number" in schema["$defs"]["Panel"]["required"]


def test_model_cannot_self_certify_or_rewrite_prior_checkpoint(monkeypatch):
    import guide2build.engine.runner as runner
    digest = "a"*64
    source = SimpleNamespace(source_sha256=digest, page_index=0)
    scene = SimpleNamespace(set_number="30669", guide_id="alt-02", source_sha256=digest,
        sources=[source], status="candidate", geometry_check="not_run", connector_check="pass",
        physical_build_check="not_run", instances=[], steps=[])
    monkeypatch.setattr(runner, "scene_type", lambda: SimpleNamespace(model_validate_json=lambda _: scene))
    with pytest.raises(ValueError, match="self-certify"):
        validate_candidate(json.dumps({}), {"set_number": "30669", "guide_id": "alt-02"}, digest, 8)


def test_continuation_booklet_blocks_without_validated_predecessor(tmp_path):
    store = EngineStore(tmp_path)
    job = store.enqueue("10316", "booklet-02", {"model": "test", "revision": "campaign"})
    provider = BadOutput()
    assert run_once(store, provider)
    result = store.get(job["id"])
    assert result["state"] == "blocked"
    assert result["error"]["code"] == "prior_booklet_required"
    assert provider.calls == 0


def test_exact_panel_provenance_rejects_in_range_wrong_page(scene_data):
    from guide2build.core.models import SceneManifest
    from guide2build.releases.models import adapt_v1
    scene = adapt_v1(SceneManifest.model_validate(scene_data),
                     "https://www.lego.com/en-us/service/building-instructions/30669", 10)
    for part in scene.instances:
        part.origin = "vision_proposal"
        part.mapping_status = "candidate"
    scene.geometry_check = scene.connector_check = scene.physical_build_check = "not_run"
    with pytest.raises(ValueError, match="exact requested"):
        validate_candidate(scene.model_dump_json(), {"set_number": scene.set_number, "guide_id": scene.guide_id},
                           scene.source_sha256, 10, panel={"number": 1}, page_index=9)
