"""Read-only verification; never fetch or disclose cache filesystem paths."""
from pathlib import Path
from .catalog import tutorial
from .source import SourceUnavailable, verified_asset


def source_health(cache: Path, article_number: str = "30449908") -> dict:
    content = tutorial(article_number)
    documents = []
    for doc in content.product.documents:
        ready = True
        try:
            verified_asset(cache, doc.id, article_number=article_number)
            for page in range(doc.page_count):
                verified_asset(cache, doc.id, page, article_number=article_number)
        except (SourceUnavailable, KeyError):
            ready = False
        documents.append({"document_id": doc.id, "ready": ready})
    return {"status": "ready" if all(d["ready"] for d in documents) else "unavailable",
            "revision": content.revision, "documents": documents}
