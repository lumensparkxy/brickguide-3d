"""Resource-bounded PDF rasterization child process; no network or command interpolation."""
import json
import os
import threading
import time
from pathlib import Path
import resource
import sys


def main() -> None:
    resource.setrlimit(resource.RLIMIT_CPU, (30, 30))
    resource.setrlimit(resource.RLIMIT_FSIZE, (32 * 1024 * 1024, 32 * 1024 * 1024))
    limit = 1024 * 1024 * 1024
    if sys.platform.startswith("linux"):
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    else:
        # Match the existing renderer: macOS rejects address/data limits; cap RSS.
        def watch_memory():
            while True:
                if resource.getrusage(resource.RUSAGE_SELF).ru_maxrss > limit:
                    os._exit(70)
                time.sleep(0.05)
        threading.Thread(target=watch_memory, daemon=True).start()
    import pypdfium2 as pdfium
    source, destination, expected = Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3])
    if source.stat().st_size > 8 * 1024 * 1024 or not 1 <= expected <= 12:
        raise ValueError("Source exceeds limits")
    document = pdfium.PdfDocument(source)
    try:
        if len(document) != expected:
            raise ValueError("Unexpected page count; source review required")
        for index in range(len(document)):
            page = document[index]
            try:
                width, height = page.get_size()
                if not 0 < width <= 14400 or not 0 < height <= 14400:
                    raise ValueError("Invalid page dimensions")
                scale = min(1600 / max(width, height), 3)
                bitmap = page.render(scale=scale)
                try:
                    bitmap.to_pil().save(destination / f"page-{index:03d}.png")
                finally:
                    bitmap.close()
            finally:
                page.close()
        (destination / "renderer.json").write_text(json.dumps({
            "library": "pypdfium2", "version": str(pdfium.PYPDFIUM_INFO.version),
            "longest_edge_pixels": 1600, "page_index_base": 0,
        }))
    finally:
        document.close()


if __name__ == "__main__":
    main()
