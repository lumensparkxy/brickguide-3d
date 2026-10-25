"""Authored coach contracts and isolated packaging checks; no physical claims."""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from guide2build.furniture import catalog, health
from guide2build.furniture.models import Tutorial
from guide2build.furniture.public import create_app
from guide2build.furniture.source import SourceUnavailable


def test_action_sequence_and_segments():
    tutorial = catalog.tutorial()
    assert tutorial.revision == "lack-30449908-coach-v2"
    expected = ["prepare", "identify"] + [f"{kind}-{i}" for i in range(1, 5) for kind in ("screw", "leg")] + ["final-checks"]
    assert [a.id for a in tutorial.coach_actions] == expected
    animated = [a for a in tutorial.coach_actions if a.animation]
    assert animated[0].animation.start == 0
    assert animated[-1].animation.end == 1
    for previous, following in zip(animated, animated[1:]):
        assert previous.animation.end == following.animation.start
    for i in range(4):
        assert animated[i * 2].animation.end == (i + .44) / 4
        assert f"leg-{i+1}" in animated[i*2+1].component_instances
    assert len(tutorial.steps) == 5
    assert tutorial.review.human_review == tutorial.review.physical_build == "not_run"
    legacy = tutorial.model_dump()
    del legacy["coach_actions"]
    assert Tutorial.model_validate(legacy).coach_actions == []


@pytest.mark.parametrize("edit", [
    lambda d: d["coach_actions"][0]["source"].update(page_index=99),
    lambda d: d["coach_actions"][0].update(component_instances=["unknown"]),
    lambda d: d["coach_actions"][1].update(id="prepare"),
    lambda d: d["coach_actions"][2]["animation"].update(end=0),
    lambda d: d["coach_actions"][2].update(animation=None),
])
def test_invalid_coach_evidence_rejected(edit):
    candidate = catalog.tutorial().model_dump()
    edit(candidate)
    with pytest.raises(ValidationError):
        Tutorial.model_validate(candidate)


def test_health_is_read_only_and_redacted(tmp_path, monkeypatch):
    calls = []
    def verified(cache, document_id, page_index=None, article_number="30449908"):
        calls.append((document_id, page_index))
        if page_index == 1:
            raise SourceUnavailable("private path should never escape")
    monkeypatch.setattr(health, "verified_asset", verified)
    with TestClient(create_app(tmp_path, tmp_path)) as client:
        response = client.get("/api/v1/furniture/health")
        assert response.status_code == 503
        assert response.json()["status"] == "unavailable"
        assert "private" not in response.text
        assert "AA-2606170-1" in response.text
        assert len(calls) > 3


def test_isolated_routes_and_spa(tmp_path):
    (tmp_path / "index.html").write_text("<html>Furniture</html>")
    with TestClient(create_app(tmp_path, tmp_path)) as client:
        assert client.get("/ikea").status_code == 200
        assert client.get("/furniture").status_code == 404
        assert client.get("/", follow_redirects=False).headers["location"] == "/ikea"
        assert client.get("/support").json()["status"] == "local_pilot"
        assert client.get("/api/v1/sets").status_code == 404
        assert client.post("/api/v1/jobs").status_code == 404
        assert client.get("/api/v1/furniture/health").status_code == 503
        assert client.get("/api/v1/furniture/products").status_code == 200


def test_isolated_error_reporting_redacts_exception(tmp_path, caplog):
    app = create_app(tmp_path, tmp_path)

    @app.get("/test-error")
    def fail():
        raise RuntimeError("secret-token-and-private-path")

    with TestClient(app) as client:
        response = client.get("/test-error?secret=query-value")
    assert response.status_code == 500
    assert response.json()["detail"]["code"] == "internal_error"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "furniture_request_error" in caplog.text
    assert "secret-token" not in response.text + caplog.text
    assert "query-value" not in response.text + caplog.text


def test_missing_frontend_and_method_boundaries(tmp_path):
    with TestClient(create_app(tmp_path, tmp_path)) as client:
        assert client.get("/ikea").status_code == 503
        assert client.post("/api/v1/furniture/products").status_code == 405
        assert client.get("/api/v1/furniture/documents/unknown/pdf").status_code == 404
        assert client.get("/docs").status_code == 404
        assert client.get("/api/v1/jobs").status_code == 404
