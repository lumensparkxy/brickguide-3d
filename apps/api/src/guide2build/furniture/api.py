"""Read-only furniture API; all preparation is explicit and outside request handlers."""
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from .health import source_health
from . import catalog
from .models import Product, Tutorial
from .source import SourceUnavailable, verified_asset
from .voice import create_voice_router


def create_router(data_dir: Path, *, enable_voice: bool = True) -> APIRouter:
    router = APIRouter(prefix="/api/v1/furniture", tags=["furniture"])
    cache = data_dir / "furniture"

    def find(article_number: str) -> Product:
        try:
            return catalog.product(article_number)
        except ValueError:
            raise HTTPException(422, {"code": "invalid_article", "message": "Use an eight-digit article number."})
        except KeyError:
            raise HTTPException(404, {"code": "unsupported_product", "message": "This product is not supported."})

    def asset(document_id: str, page_index: int | None = None, article_number: str = "30449908") -> Path:
        try:
            return verified_asset(cache, document_id, page_index, article_number)
        except KeyError:
            raise HTTPException(404, {"code": "source_not_found", "message": "Document or page not found."})
        except SourceUnavailable:
            raise HTTPException(503, {"code": "furniture_source_unavailable",
                                     "message": "The local furniture documents are not prepared or need verification. Open the official IKEA document, or prepare the local source cache."})

    @router.get("/health")
    def health(article_number: str = "30449908"):
        item = find(article_number)
        report = source_health(cache, item.article_number)
        return JSONResponse(report, status_code=200 if report["status"] == "ready" else 503,
                            headers={"Cache-Control": "no-store"})

    @router.get("/products", response_model=dict[str, list[Product]])
    def products(q: str = Query(default="", max_length=100)):
        return {"products": catalog.search(q)}

    @router.get("/products/{article_number}", response_model=Product)
    def get_product(article_number: str):
        return find(article_number)

    @router.get("/products/{article_number}/tutorial", response_model=Tutorial)
    def get_tutorial(article_number: str):
        item = find(article_number)
        primary = next(d for d in item.documents if d.role == "primary")
        # Gate tutorial against its exact source and the pages actually referenced by steps.
        result = catalog.tutorial(item.article_number)
        asset(primary.id, article_number=item.article_number)
        sources = [s.source for s in result.steps] + [s.secondary_source for s in result.steps if s.secondary_source]
        sources += [a.source for a in result.coach_actions]
        for source in {(s.document_id, s.page_index) for s in sources if s.document_id is not None}:
            asset(*source, article_number=item.article_number)
        return result

    @router.get("/documents/{document_id}/pages/{page_index}")
    def page(document_id: str, page_index: int, article_number: str = "30449908"):
        item = find(article_number)
        return FileResponse(asset(document_id, page_index, item.article_number), media_type="image/png",
                            headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache"})

    @router.get("/documents/{document_id}/pdf")
    def pdf(document_id: str, article_number: str = "30449908"):
        item = find(article_number)
        return FileResponse(asset(document_id, article_number=item.article_number), media_type="application/pdf",
                            headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache"})

    if enable_voice:
        router.include_router(create_voice_router(cache))
    else:
        @router.get("/voice/status")
        def voice_disabled():
            return JSONResponse({"configured": False, "reason": "disabled_for_release"},
                                headers={"Cache-Control": "no-store"})
    return router
