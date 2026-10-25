"""Isolated furniture-only local release candidate. No LEGO jobs or mutable API."""
import json
import logging
import os
from pathlib import Path
from time import monotonic
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from .api import create_router

logger = logging.getLogger("furniture")


def create_app(data_dir: Path | None = None, web_dist: Path | None = None) -> FastAPI:
    data_dir = data_dir or Path(os.environ.get("FURNITURE_DATA_DIR", "var"))
    web_dist = web_dist or Path(os.environ.get("FURNITURE_WEB_DIST", "apps/web/dist"))
    app = FastAPI(title="Furniture Assembly Assistant", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.furniture_voice_disabled = True
    app.include_router(create_router(data_dir, enable_voice=False))

    @app.middleware("http")
    async def local_reporting(request: Request, call_next):
        started = monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # Deliberately omit exception strings, queries, headers and user data.
            logger.error(json.dumps({"event": "furniture_request_error", "status": 500}))
            response = JSONResponse({"detail": {"code": "internal_error", "message": "Try again or open the official instructions."}}, status_code=500)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; "
            "base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'"
        )
        logger.info(json.dumps({"event": "furniture_request", "status": response.status_code,
                                "duration_ms": round((monotonic() - started) * 1000)}))
        return response

    @app.get("/")
    def root():
        return RedirectResponse("/ikea")

    @app.get("/ikea")
    @app.get("/ikea/")
    def furniture():
        index = web_dist / "index.html"
        if not index.is_file():
            raise HTTPException(503, "Furniture frontend is not built")
        return FileResponse(index, headers={"Cache-Control": "no-cache"})

    @app.get("/support")
    def support():
        return {"status": "local_pilot", "message": "If a connection is unclear, stop and consult the official instructions. Report the article number, tutorial revision and action to your pilot facilitator. Do not include personal information.",
                "official_product_url": "https://www.ikea.com/ch/en/p/lack-side-table-white-30449908/"}

    if (web_dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=web_dist / "assets"), name="assets")
    if (web_dist / "images").is_dir():
        app.mount("/images", StaticFiles(directory=web_dist / "images"), name="images")
    return app


app = create_app()
