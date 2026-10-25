"""Furniture isolation, source integrity and contract regressions (no live network)."""
import hashlib
import json
import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from guide2build.furniture import catalog, source
from guide2build.furniture.api import create_router
from guide2build.furniture.models import Tutorial


def client(root):
    app = FastAPI()
    app.include_router(create_router(root))
    return TestClient(app)


def test_catalogue_lookup_and_unsupported(tmp_path):
    with client(tmp_path) as web:
        for query in ("LACK", "304.499.08", "30449908", ""):
            response = web.get("/api/v1/furniture/products", params={"q": query})
            assert response.status_code == 200
            assert len(response.json()["products"]) == (3 if query in ("LACK", "") else 1)
        assert web.get("/api/v1/furniture/products?q=unsupported").json() == {"products": []}
        assert web.get("/api/v1/furniture/products/11111111").status_code == 404
        assert web.get("/api/v1/furniture/products/not-an-article").status_code == 422
        assert web.get("/api/v1/furniture/products/304.499.08").status_code == 200


def test_missing_cache_returns_safe_error(tmp_path):
    with client(tmp_path) as web:
        for path in ("products/30449908/tutorial", "documents/AA-2606170-1/pages/0", "documents/AA-2606170-1/pdf"):
            response = web.get("/api/v1/furniture/" + path)
            assert response.status_code == 503
            assert str(tmp_path) not in response.text
        assert web.get("/api/v1/furniture/documents/unknown/pdf").status_code == 404
        assert web.get("/api/v1/furniture/documents/AA-2606170-1/pages/4").status_code == 404
        assert web.get("/api/v1/furniture/documents/AA-2606170-1/pages/-1").status_code == 404


@pytest.mark.parametrize("url", [
    "https://www.ikea.com.evil.test/ch/en/a.pdf", "http://www.ikea.com/ch/en/a.pdf",
    "https://user:secret@www.ikea.com/ch/en/a.pdf", "https://127.0.0.1/a.pdf",
    "https://www.ikea.com/ch/en/assembly_instructions/../secret.pdf",
    "https://www.ikea.com/ch/en/assembly_instructions/%2e%2e/secret.pdf",
    "https://www.ikea.com/ch/en/assembly_instructions/unregistered.pdf",
])
def test_only_exact_curated_urls_allowed(url):
    with pytest.raises(ValueError):
        source.validate_url(url)


def test_redirect_and_wrong_bytes_rejected(tmp_path):
    doc = catalog.product().documents[0]
    for response in [httpx.Response(302, headers={"location": "http://127.0.0.1/private"}),
                     httpx.Response(200, headers={"content-type": "application/pdf"}, content=b"%PDF-changed"),
                     httpx.Response(200, headers={"content-type": "application/pdf"}, content=b"<html>"),
                     httpx.Response(200, headers={"content-type": "text/html"}, content=b"%PDF-wrong-type")]:
        with httpx.Client(transport=httpx.MockTransport(lambda request: response)) as transport:
            with pytest.raises(ValueError):
                source.download(doc.url, tmp_path / "out.pdf", doc.sha256, client=transport)
        assert not (tmp_path / "out.pdf").exists()


def test_stream_size_is_bounded(tmp_path, monkeypatch):
    doc = catalog.product().documents[0]
    monkeypatch.setattr(source, "MAX_BYTES", 4)
    with httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(
            200, headers={"content-type": "application/pdf"}, content=b"%PDF-large"))) as transport:
        with pytest.raises(ValueError, match="limit"):
            source.download(doc.url, tmp_path / "out.pdf", doc.sha256, client=transport)


def fake_cache(tmp_path, monkeypatch):
    """Synthetic bytes exercise cache verification, never claim actual source evidence."""
    item = catalog.product().model_copy(deep=True)
    doc = item.documents[0]
    payload = b"%PDF-SYNTHETIC-TEST"
    doc.sha256 = hashlib.sha256(payload).hexdigest()
    monkeypatch.setattr(source, "product", lambda: item)
    directory = tmp_path / "documents" / doc.sha256
    directory.mkdir(parents=True)
    (directory / "source.pdf").write_bytes(payload)
    pages = []
    for i in range(doc.page_count):
        data = f"synthetic-image-{i}".encode()
        (directory / f"page-{i:03d}.png").write_bytes(data)
        pages.append({"page_index": i, "sha256": hashlib.sha256(data).hexdigest()})
    (directory / "manifest.json").write_text(json.dumps({"document_id":doc.id,
        "source_sha256":doc.sha256, "page_count":doc.page_count, "pages":pages}))
    return doc, directory


def test_cache_tamper_and_page_tamper_fail_closed(tmp_path, monkeypatch):
    doc, directory = fake_cache(tmp_path, monkeypatch)
    assert source.verified_asset(tmp_path, doc.id, 0).is_file()
    page = directory / "page-000.png"
    page.write_bytes(b"changed")
    with pytest.raises(source.SourceUnavailable):
        source.verified_asset(tmp_path, doc.id, 0)
    (directory / "source.pdf").write_bytes(b"changed source")
    with pytest.raises(source.SourceUnavailable):
        source.verified_asset(tmp_path, doc.id)


def test_symlink_escape_rejected(tmp_path, monkeypatch):
    doc, directory = fake_cache(tmp_path, monkeypatch)
    page = directory / "page-000.png"
    original = page.read_bytes()
    page.unlink()
    outside = tmp_path.parent / "outside-furniture.png"
    outside.write_bytes(original)
    page.symlink_to(outside)
    with pytest.raises(source.SourceUnavailable):
        source.verified_asset(tmp_path, doc.id, 0)


def test_tutorial_contract_and_provenance():
    tutorial = catalog.tutorial()
    assert len(tutorial.steps) == 5
    assert tutorial.review.human_review == tutorial.review.physical_build == "not_run"
    assert {c.id:c.quantity for c in tutorial.components} == {"tabletop":1, "legs":4, "screws":4}
    for edit in (lambda t: t["steps"][0]["source"].update(page_index=999),
                 lambda t: t["steps"][0].update(active_components=["invented"]),
                 lambda t: t.update(source_sha256="0"*64),
                 lambda t: t["review"].update(human_review="passed")):
        candidate = tutorial.model_dump()
        edit(candidate)
        with pytest.raises(ValidationError):
            Tutorial.model_validate(candidate)


def test_elapsed_budget_checked_on_small_chunks(tmp_path, monkeypatch):
    doc = catalog.product().documents[0]
    readings = iter([0, 46])
    monkeypatch.setattr(source, "monotonic", lambda: next(readings, 46))

    class TinyStream(httpx.SyncByteStream):
        def __iter__(self):
            yield b"%PDF-"
            yield b"more"

    with httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(
            200, headers={"content-type": "application/pdf"}, stream=TinyStream()))) as transport:
        with pytest.raises(ValueError, match="limits"):
            source.download(doc.url, tmp_path / "out.pdf", doc.sha256, client=transport)
    assert not (tmp_path / "out.pdf").exists()


@pytest.mark.parametrize('article,finish', [('30449908','white'), ('80104268','black-brown'), ('70319028','white-stained-oak-effect')])
def test_variant_contracts_and_scoped_document_access(tmp_path, monkeypatch, article, finish):
    from guide2build.furniture import api
    calls = []
    def verified(cache, document_id, page_index=None, article_number='30449908'):
        calls.append((article_number, document_id, page_index))
        assert document_id in {d.id for d in catalog.product(article_number).documents}
        return tmp_path / 'synthetic-not-served.pdf'
    monkeypatch.setattr(api, 'verified_asset', verified)
    with client(tmp_path) as web:
        result = web.get(f'/api/v1/furniture/products/{article}/tutorial')
        assert result.status_code == 200
        tutorial = result.json()
        assert tutorial['product']['article_number'] == article
        assert tutorial['product']['finish']['id'] == finish
        assert tutorial['product']['family_id'] == 'lack-55x55'
        assert len(tutorial['coach_actions']) == 11
        assert all(call[0] == article for call in calls)
    assert catalog.search(catalog.product(article).display_article_number)[0].article_number == article
    for doc in catalog.product(article).documents:
        source.validate_url(doc.url)


def test_variant_specific_care_and_product_only_provenance():
    oak = catalog.tutorial('70319028')
    care = oak.coach_actions[-1]
    assert care.source.document_id is None
    assert care.source.product_url == oak.product.product_url
    assert 'mild cleaner' in care.instruction
    assert 'regularly' not in care.instruction
    assert 'regularly' in catalog.tutorial('80104268').coach_actions[-1].instruction
    for change in ({'product_url':'https://evil.test'}, {'page_index':0}, {'product_url':None}):
        bad = oak.model_dump()
        bad['coach_actions'][-1]['source'].update(change)
        with pytest.raises(ValidationError):
            Tutorial.model_validate(bad)


def test_wrong_variant_document_rejected(tmp_path):
    with client(tmp_path) as web:
        assert web.get('/api/v1/furniture/documents/AA-2606170-1/pdf?article_number=70319028').status_code == 404
        assert web.get('/api/v1/furniture/documents/AA-2205802-3/pdf?article_number=70319028').status_code == 404
        assert web.get('/api/v1/furniture/health?article_number=11111111').status_code == 404
        assert web.get('/api/v1/furniture/products/70319028/tutorial').status_code == 503
