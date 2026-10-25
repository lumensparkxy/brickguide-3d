"""Pinned IKEA retrieval and immutable, bounded, hash-verified local source cache."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from time import monotonic
from datetime import datetime, timezone
import httpx
from .catalog import product, search

MAX_BYTES = 8 * 1024 * 1024
MAX_PAGES = 12
MAX_RENDER_BYTES = 32 * 1024 * 1024
DEADLINE_SECONDS = 45


class SourceUnavailable(ValueError):
    """A known source is missing, changed or invalid; safe to map to a generic 503."""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_url(url: str) -> None:
    # Exact strings, not suffix matching, exclude credentials, ports, encodings and queries.
    if url not in {d.url for item in search() for d in item.documents}:
        raise ValueError("Only the pinned official IKEA PDF URLs are allowlisted")


def download(url: str, destination: Path, expected_hash: str, *, client: httpx.Client | None = None) -> None:
    validate_url(url)
    own_client = client is None
    client = client or httpx.Client(timeout=15, follow_redirects=False, trust_env=False)
    started = monotonic()
    try:
        with client.stream("GET", url, follow_redirects=False) as response:
            if 300 <= response.status_code < 400:
                raise ValueError("Source redirects require catalogue review")
            response.raise_for_status()
            if response.headers.get("content-type", "").split(";")[0].strip().lower() != "application/pdf":
                raise ValueError("Expected PDF content type")
            declared = response.headers.get("content-length")
            if declared and int(declared) > MAX_BYTES:
                raise ValueError("PDF exceeds byte limit")
            data = bytearray()
            for chunk in response.iter_bytes():
                data.extend(chunk)
                if len(data) > MAX_BYTES or monotonic() - started > DEADLINE_SECONDS:
                    raise ValueError("PDF exceeds download limits")
            if not data.startswith(b"%PDF-"):
                raise ValueError("Invalid PDF signature")
            if hashlib.sha256(data).hexdigest() != expected_hash:
                raise ValueError("Official source changed; inspect it before updating the pinned hash")
            destination.write_bytes(data)
    finally:
        if own_client:
            client.close()


def confined(root: Path, path: Path) -> Path:
    resolved_root = root.resolve()
    resolved = path.resolve()
    if not resolved.is_relative_to(resolved_root) or path.is_symlink():
        raise SourceUnavailable("Unsafe cache entry")
    return resolved


def verified_asset(cache: Path, document_id: str, page_index: int | None = None, article_number: str = "30449908") -> Path:
    docs = {d.id: d for d in (product() if article_number == "30449908" else product(article_number)).documents}
    doc = docs.get(document_id)
    if doc is None:
        raise KeyError(document_id)
    if page_index is not None and not 0 <= page_index < doc.page_count:
        raise KeyError(page_index)
    directory = cache / "documents" / doc.sha256
    try:
        manifest_path = confined(cache, directory / "manifest.json")
        if manifest_path.stat().st_size > 65536:
            raise SourceUnavailable("Invalid manifest")
        manifest = json.loads(manifest_path.read_text())
        if manifest["document_id"] != doc.id or manifest["source_sha256"] != doc.sha256:
            raise SourceUnavailable("Source identity mismatch")
        if manifest["page_count"] != doc.page_count or len(manifest["pages"]) != doc.page_count:
            raise SourceUnavailable("Source coverage mismatch")
        original = confined(cache, directory / "source.pdf")
        if original.stat().st_size > MAX_BYTES or sha256(original) != doc.sha256:
            raise SourceUnavailable("Source hash mismatch")
        if page_index is None:
            return original
        page = confined(cache, directory / f"page-{page_index:03d}.png")
        record = manifest["pages"][page_index]
        if record["page_index"] != page_index or page.stat().st_size > MAX_RENDER_BYTES:
            raise SourceUnavailable("Page coverage mismatch")
        if sha256(page) != record["sha256"]:
            raise SourceUnavailable("Page hash mismatch")
        return page
    except (OSError, ValueError, KeyError, IndexError, TypeError) as exc:
        raise SourceUnavailable("Furniture source cache is unavailable or invalid") from exc


def _render(source: Path, destination: Path, expected_pages: int) -> None:
    # The parser runs in a subprocess with its own wall time and memory/CPU/output caps.
    subprocess.run([sys.executable, str(Path(__file__).with_name("render_worker.py")),
                    str(source), str(destination), str(expected_pages)],
                   check=True, timeout=45, capture_output=True)


def prepare(cache: Path, local_sources: Path | None = None, article_number: str = "30449908") -> list[dict]:
    cache.mkdir(parents=True, exist_ok=True)
    documents = cache / "documents"
    documents.mkdir(exist_ok=True)
    receipts = []
    for doc in product(article_number).documents:
        final = documents / doc.sha256
        if final.exists():
            verified_asset(cache, doc.id, article_number=article_number)
            for page_index in range(doc.page_count):
                verified_asset(cache, doc.id, page_index, article_number)
            receipts.append({"document_id": doc.id, "sha256": doc.sha256, "cached": True})
            continue
        with tempfile.TemporaryDirectory(prefix=".prepare-", dir=documents) as temporary:
            stage = Path(temporary)
            pdf = stage / "source.pdf"
            existing = local_sources / f"{doc.id}.pdf" if local_sources else None
            if existing and existing.is_file():
                if existing.stat().st_size > MAX_BYTES or sha256(existing) != doc.sha256:
                    raise SourceUnavailable("Local source does not match the reviewed PDF")
                pdf.write_bytes(existing.read_bytes())
            else:
                download(doc.url, pdf, doc.sha256)
            _render(pdf, stage, doc.page_count)
            pages = [{"page_index": i, "sha256": sha256(stage / f"page-{i:03d}.png")}
                     for i in range(doc.page_count)]
            manifest = {"document_id": doc.id, "source_url": doc.url, "resolved_url": doc.url,
                        "source_sha256": doc.sha256, "source_bytes": pdf.stat().st_size,
                        "page_count": doc.page_count, "pages": pages, "notice": doc.notice,
                        "prepared_at": datetime.now(timezone.utc).isoformat(),
                        "renderer": json.loads((stage / "renderer.json").read_text())}
            (stage / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
            # Content address makes source versions immutable. Avoid replacing existing revisions.
            os.rename(stage, final)
            receipts.append({"document_id": doc.id, "sha256": doc.sha256, "cached": False})
    return receipts
