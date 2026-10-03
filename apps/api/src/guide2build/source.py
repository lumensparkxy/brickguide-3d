"""Bounded official retrieval and resumable, checksum-verified PDF page batches."""
from __future__ import annotations
import hashlib
import json
import os
import re
import math
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from contextlib import contextmanager
from collections.abc import Callable
from importlib.metadata import version
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, unquote, urljoin
import httpx

# A child executes this file directly so it does not import the API or job runtime.
try:
    from .source_limits import (MAX_BYTES, MAX_PAGES, DOWNLOAD_SECONDS, BATCH_PAGES,
                                MAX_OUTPUT_BYTES, FREE_RESERVE_BYTES, PAGE_PIXELS, BATCH_PIXELS,
                                CHILD_SECONDS, CHILD_CPU_SECONDS, CHILD_MEMORY_BYTES, PAGE_FILE_BYTES)
except ImportError:
    from source_limits import (MAX_BYTES, MAX_PAGES, DOWNLOAD_SECONDS, BATCH_PAGES,
                               MAX_OUTPUT_BYTES, FREE_RESERVE_BYTES, PAGE_PIXELS, BATCH_PIXELS,
                               CHILD_SECONDS, CHILD_CPU_SECONDS, CHILD_MEMORY_BYTES, PAGE_FILE_BYTES)

ALLOWED_HOST = "www.lego.com"
CancelCheck = Callable[[], None] | None


def _check(callback: CancelCheck) -> None:
    if callback:
        callback()


def file_sha256(path: Path, check_cancel: CancelCheck = None) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            _check(check_cancel)
            digest.update(chunk)
    return digest.hexdigest()


def _atomic_json(path: Path, value) -> None:
    temporary = path.with_name(path.name + f".{uuid.uuid4().hex}.partial")
    try:
        temporary.write_text(json.dumps(value, indent=2) + "\n")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def _locked(path: Path, check_cancel: CancelCheck):
    import fcntl
    started = time.monotonic()
    with path.open("a") as lock:
        while True:
            _check(check_cancel)
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() - started > DOWNLOAD_SECONDS:
                    raise TimeoutError("Source lock wait exceeded time limit")
                time.sleep(0.1)
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def validate_pdf_url(url: str) -> None:
    parsed = urlsplit(url)
    path = unquote(parsed.path)
    if (parsed.scheme != "https" or parsed.hostname != ALLOWED_HOST or
            parsed.username or parsed.password or parsed.port not in (None, 443) or
            parsed.query or parsed.fragment or not path.startswith("/cdn/product-assets/") or
            not path.endswith(".pdf") or ".." in path.split("/") or "%" in path):
        raise ValueError("Only allowlisted official LEGO PDF URLs are accepted")


def download_pdf(url: str, destination: Path, *, client: httpx.Client | None = None,
                 check_cancel: CancelCheck = None) -> dict:
    validate_pdf_url(url)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with _locked(destination.with_suffix(".lock"), check_cancel):
        return _download_pdf(url, destination, client=client, check_cancel=check_cancel)


def _download_pdf(url: str, destination: Path, *, client: httpx.Client | None = None,
                  check_cancel: CancelCheck = None) -> dict:
    own_client = client is None
    client = client or httpx.Client(timeout=httpx.Timeout(10, connect=10), follow_redirects=False)
    temporary = destination.with_name(destination.name + f".{uuid.uuid4().hex}.partial")
    current = url
    started = time.monotonic()

    def check():
        _check(check_cancel)
        if time.monotonic() - started > DOWNLOAD_SECONDS:
            raise TimeoutError("PDF download exceeded time limit")

    try:
        for redirect in range(4):
            check()
            validate_pdf_url(current)
            with client.stream("GET", current, follow_redirects=False,
                               headers={"Accept": "application/pdf", "Accept-Encoding": "identity",
                                        "User-Agent": "Guide2Build-local/0.1"}) as response:
                if response.status_code in (301, 302, 303, 307, 308):
                    if redirect == 3 or "location" not in response.headers:
                        raise ValueError("Redirect limit exceeded or missing redirect location")
                    current = urljoin(current, response.headers["location"])
                    continue
                response.raise_for_status()
                if response.headers.get("content-encoding", "identity").lower() != "identity":
                    raise ValueError("Encoded PDF responses are not supported")
                content_type = response.headers.get("content-type", "").split(";")[0].lower()
                if content_type not in ("application/pdf", "application/octet-stream"):
                    raise ValueError("Response is not a PDF content type")
                declared = int(response.headers.get("content-length", "0"))
                if declared < 0 or declared > MAX_BYTES:
                    raise ValueError("PDF exceeds download size limit")
                if shutil.disk_usage(destination.parent).free < (declared or MAX_BYTES) + FREE_RESERVE_BYTES:
                    raise ValueError("Insufficient free disk space for PDF download")
                size = 0
                digest = hashlib.sha256()
                with temporary.open("wb") as output:
                    for chunk in response.iter_bytes():
                        check()
                        size += len(chunk)
                        if size > MAX_BYTES:
                            raise ValueError("PDF exceeds download size limit")
                        if shutil.disk_usage(destination.parent).free < len(chunk) + FREE_RESERVE_BYTES:
                            raise ValueError("Insufficient free disk space for PDF download")
                        output.write(chunk)
                        digest.update(chunk)
                check()
                with temporary.open("rb") as source:
                    if source.read(5) != b"%PDF-":
                        raise ValueError("Missing PDF signature")
                receipt = {"requested_url": url, "resolved_url": current,
                           "sha256": digest.hexdigest(), "size_bytes": size,
                           "downloaded_at": datetime.now(timezone.utc).isoformat()}
                # Immutable hard-linked versions avoid duplicating large PDF bytes. Replacing
                # source.pdf later changes its directory entry, never a retained version's inode.
                version_dir = destination.parent / receipt["sha256"]
                version_dir.mkdir(exist_ok=True)
                version_pdf = version_dir / "source.pdf"
                if version_pdf.exists():
                    if file_sha256(version_pdf, check_cancel) != receipt["sha256"]:
                        raise ValueError("Cached source version checksum mismatch")
                else:
                    os.link(temporary, version_pdf)
                _atomic_json(version_dir / "source.receipt.json", receipt)
                check()
                os.replace(temporary, destination)
                _atomic_json(destination.with_suffix(".receipt.json"), receipt)
                return receipt
        raise ValueError("No PDF response")
    finally:
        temporary.unlink(missing_ok=True)
        if own_client:
            client.close()


def _preflight(pdf_path: Path, scale: float) -> list[dict]:
    import pypdfium2 as pdfium
    dimensions = []
    with pdfium.PdfDocument(pdf_path) as document:
        if not 0 < len(document) <= MAX_PAGES:
            raise ValueError("PDF page-count limit exceeded")
        for index in range(len(document)):
            page = document[index]
            try:
                width, height = page.get_size()
                width_px, height_px = math.ceil(width * scale), math.ceil(height * scale)
                if width_px <= 0 or height_px <= 0 or width_px * height_px > PAGE_PIXELS:
                    raise ValueError("Page raster size exceeds limit")
                dimensions.append({"width_px": width_px, "height_px": height_px})
            finally:
                page.close()
    return dimensions


def _render_batch(pdf_path: Path, output_dir: Path, scale: float, start: int, stop: int) -> list[dict]:
    import pypdfium2 as pdfium
    records, total_pixels, total_bytes = [], 0, 0
    with pdfium.PdfDocument(pdf_path) as document:
        if not 0 <= start < stop <= len(document) <= MAX_PAGES or stop - start > BATCH_PAGES:
            raise ValueError("PDF batch page-count limit exceeded")
        for index in range(start, stop):
            page = document[index]
            try:
                width, height = page.get_size()
                pixels = math.ceil(width * scale) * math.ceil(height * scale)
                total_pixels += pixels
                if not 0 < pixels <= PAGE_PIXELS or total_pixels > BATCH_PIXELS:
                    raise ValueError("Page or batch raster size exceeds limit")
                bitmap = page.render(scale=scale)
                try:
                    image = bitmap.to_pil()
                    filename = f"page-{index:03d}.png"
                    image.save(output_dir / filename)
                    size_bytes = (output_dir / filename).stat().st_size
                    total_bytes += size_bytes
                    if total_bytes > MAX_OUTPUT_BYTES:
                        raise ValueError("Rendered output exceeds disk quota")
                    records.append({"page_index": index, "file": filename,
                                    "width_px": image.width, "height_px": image.height,
                                    "sha256": file_sha256(output_dir / filename), "size_bytes": size_bytes,
                                    "renderer": f"pypdfium2/{version('pypdfium2')}", "scale": scale,
                                    "coordinate_origin": "top_left_after_page_rotation"})
                finally:
                    bitmap.close()
            finally:
                page.close()
    return records


def _child(pdf_path: Path, staging: Path, scale: float, operation: str,
           check_cancel: CancelCheck, start: int = 0, stop: int = 0) -> list[dict]:
    process = subprocess.Popen(
        [sys.executable, str(Path(__file__).resolve()), str(pdf_path.resolve()), str(staging),
         str(scale), operation, str(start), str(stop)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    deadline = time.monotonic() + CHILD_SECONDS
    try:
        while process.poll() is None:
            _check(check_cancel)
            if time.monotonic() >= deadline:
                raise TimeoutError("PDF rendering exceeded batch time limit")
            time.sleep(0.1)
        _check(check_cancel)
        if process.returncode:
            raise ValueError("PDF rendering failed or exceeded resource limits")
        return json.loads((staging / "result.json").read_text())
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def _batches(dimensions: list[dict]) -> list[tuple[int, int]]:
    batches, start, pixels = [], 0, 0
    for index, dimension in enumerate(dimensions):
        count = dimension["width_px"] * dimension["height_px"]
        if index > start and (index - start >= BATCH_PAGES or pixels + count > BATCH_PIXELS):
            batches.append((start, index))
            start, pixels = index, 0
        pixels += count
    batches.append((start, len(dimensions)))
    return batches


def _verified(records, output_dir: Path, start: int, stop: int, identity: dict,
              dimensions: list[dict], check_cancel: CancelCheck) -> bool:
    if not isinstance(records, list) or len(records) != stop - start:
        return False
    try:
        for index, record in zip(range(start, stop), records):
            _check(check_cancel)
            filename = f"page-{index:03d}.png"
            path = output_dir / filename
            if (record["page_index"] != index or record["file"] != filename or path.is_symlink()
                    or not path.is_file() or path.stat().st_size > PAGE_FILE_BYTES
                    or path.stat().st_size != record["size_bytes"]
                    or record["renderer"] != identity["renderer"] or record["scale"] != identity["scale"]
                    or record["coordinate_origin"] != "top_left_after_page_rotation"
                    or record["width_px"] != dimensions[index]["width_px"]
                    or record["height_px"] != dimensions[index]["height_px"]
                    or file_sha256(path, check_cancel) != record["sha256"]):
                return False
        return True
    except (OSError, KeyError, TypeError):
        return False


def _snapshot_pdf(source: Path, destination: Path, check_cancel: CancelCheck) -> str:
    """Copy mutable cached bytes into a private, bounded snapshot for all child readers."""
    digest, size = hashlib.sha256(), 0
    if shutil.disk_usage(destination.parent).free < source.stat().st_size + FREE_RESERVE_BYTES:
        raise ValueError("Insufficient free disk space for PDF snapshot")
    with source.open("rb") as reader, destination.open("xb") as writer:
        for chunk in iter(lambda: reader.read(1024 * 1024), b""):
            _check(check_cancel)
            size += len(chunk)
            if size > MAX_BYTES:
                raise ValueError("PDF snapshot exceeds source size limit")
            if shutil.disk_usage(destination.parent).free < len(chunk) + FREE_RESERVE_BYTES:
                raise ValueError("Insufficient free disk space for PDF snapshot")
            writer.write(chunk)
            digest.update(chunk)
    _check(check_cancel)
    return digest.hexdigest()


def _invalidate_render_manifests(output_dir: Path) -> None:
    for name in ("resume.json", "pages.json"):
        (output_dir / name).unlink(missing_ok=True)


def render_pages(pdf_path: Path, output_dir: Path, *, scale: float = 1.5,
                 check_cancel: CancelCheck = None, expected_sha256: str | None = None,
                 on_progress: Callable[[int, int], None] | None = None) -> list[dict]:
    """Resume verified batches; publish pages.json only after every page is complete."""
    if expected_sha256 is not None and (not isinstance(expected_sha256, str) or
                                        not re.fullmatch(r"[a-f0-9]{64}", expected_sha256)):
        raise ValueError("Expected source SHA-256 must be 64 lowercase hexadecimal characters")
    if not math.isfinite(scale) or not 0.1 <= scale <= 4:
        raise ValueError("Render scale must be between 0.1 and 4")
    if not 0 < pdf_path.stat().st_size <= MAX_BYTES:
        raise ValueError("PDF exceeds render size limit")
    output_dir.mkdir(parents=True, exist_ok=True)
    with _locked(output_dir / ".render.lock", check_cancel):
        source_sha256 = file_sha256(pdf_path, check_cancel)
        if expected_sha256 is not None and source_sha256 != expected_sha256:
            _invalidate_render_manifests(output_dir)
            raise ValueError("Source PDF checksum does not match the expected receipt")
        identity = {"version": 2, "source_sha256": source_sha256,
                    "renderer": f"pypdfium2/{version('pypdfium2')}", "scale": scale,
                    "batch_pages": BATCH_PAGES, "batch_pixels": BATCH_PIXELS}
        # Source caches are private; temporary snapshots and batch files must not
        # be created below the public page asset tree. The regular copy deliberately
        # has a separate inode so later source replacement or in-place writes are safe.
        with tempfile.TemporaryDirectory(prefix=".render-", dir=pdf_path.parent) as temporary:
            staging = Path(temporary)
            snapshot = staging / "source-snapshot.pdf"
            if _snapshot_pdf(pdf_path, snapshot, check_cancel) != source_sha256:
                _invalidate_render_manifests(output_dir)
                raise ValueError("Source PDF changed while creating the render snapshot")
            dimensions = _child(snapshot, staging, scale, "preflight", check_cancel)
            total = len(dimensions)
            resume_path = output_dir / "resume.json"
            try:
                resume = json.loads(resume_path.read_text())
                if resume.get("identity") != identity or resume.get("page_count") != total:
                    resume = {}
            except (OSError, ValueError, AttributeError):
                resume = {}
            committed = resume.get("batches", {})
            if not isinstance(committed, dict):
                committed = {}
            batches = _batches(dimensions)
            valid = {str(start): committed[str(start)] for start, stop in batches
                     if str(start) in committed and _verified(committed[str(start)], output_dir,
                                                             start, stop, identity, dimensions, check_cancel)}
            # No partial/incompatible final manifest should remain visible during a repair.
            if len(valid) != len(batches):
                (output_dir / "pages.json").unlink(missing_ok=True)
            completed = sum(len(records) for records in valid.values())
            if on_progress:
                on_progress(completed, total)
            for start, stop in batches:
                _check(check_cancel)
                key = str(start)
                if key in valid:
                    continue
                estimated = sum(d["width_px"] * d["height_px"] * 4 for d in dimensions[start:stop])
                if shutil.disk_usage(output_dir).free < estimated + FREE_RESERVE_BYTES:
                    raise ValueError("Insufficient free disk space for render batch")
                records = _child(snapshot, staging, scale, "batch", check_cancel, start, stop)
                if not _verified(records, staging, start, stop, identity, dimensions, check_cancel):
                    raise ValueError("Rendered batch checksum or metadata mismatch")
                replaced_files = {record["file"] for record in records}
                # Include interrupted/unreferenced old pages in the directory budget.
                total_bytes = sum(path.stat().st_size for path in output_dir.glob("page-*.png")
                                  if path.name not in replaced_files)
                total_bytes += sum(r["size_bytes"] for r in records)
                if total_bytes > MAX_OUTPUT_BYTES:
                    raise ValueError("Rendered output exceeds disk quota")
                _check(check_cancel)
                for record in records:
                    os.replace(staging / record["file"], output_dir / record["file"])
                valid[key] = records
                _atomic_json(resume_path, {"identity": identity, "page_count": total, "batches": valid})
                completed += len(records)
                if on_progress:
                    on_progress(completed, total)
            records = [record for start, _ in batches for record in valid[str(start)]]
            if sum(path.stat().st_size for path in output_dir.glob("page-*.png")) > MAX_OUTPUT_BYTES:
                raise ValueError("Rendered output exceeds disk quota")
            if file_sha256(pdf_path, check_cancel) != identity["source_sha256"]:
                _invalidate_render_manifests(output_dir)
                raise ValueError("Source PDF changed during rendering")
            _check(check_cancel)
            _atomic_json(output_dir / "pages.json", records)
            return records


if __name__ == "__main__":
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (CHILD_CPU_SECONDS, CHILD_CPU_SECONDS))
    resource.setrlimit(resource.RLIMIT_FSIZE, (PAGE_FILE_BYTES, PAGE_FILE_BYTES))
    if sys.platform.startswith("linux"):
        resource.setrlimit(resource.RLIMIT_AS, (CHILD_MEMORY_BYTES, CHILD_MEMORY_BYTES))
    else:
        import threading
        def watch_memory():
            while True:
                if resource.getrusage(resource.RUSAGE_SELF).ru_maxrss > CHILD_MEMORY_BYTES:
                    os._exit(70)
                time.sleep(0.05)
        threading.Thread(target=watch_memory, daemon=True).start()
    source, destination, scale = Path(sys.argv[1]), Path(sys.argv[2]), float(sys.argv[3])
    result = (_preflight(source, scale) if sys.argv[4] == "preflight" else
              _render_batch(source, destination, scale, int(sys.argv[5]), int(sys.argv[6])))
    _atomic_json(destination / "result.json", result)
