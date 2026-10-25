"""Validate prepared release inputs, without downloads or publication."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api/src"))
from guide2build.furniture.catalog import search  # noqa: E402
from guide2build.furniture.health import source_health  # noqa: E402


def file_hashes(root: Path) -> dict[str, str]:
    result = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError("Symlinks are not release inputs")
        if path.is_file():
            result[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def validate(cache: Path, web: Path, record: Path | None = None, strict_cache: bool = False) -> dict:
    statuses = [source_health(cache, item.article_number) for item in search()]
    report = {"status": "ready" if all(s["status"] == "ready" for s in statuses) else "unavailable",
              "tutorials": statuses, "frontend_built": (web / "index.html").is_file() and (web / "assets").is_dir(),
              "public_release_approved": False}
    if strict_cache or record:
        expected = set()
        for item in search():
            for doc in item.documents:
                prefix = f"documents/{doc.sha256}/"
                expected.update((prefix + "source.pdf", prefix + "manifest.json"))
                expected.update(prefix + f"page-{i:03d}.png" for i in range(doc.page_count))
        assets = file_hashes(cache)
        report["cache_allowlist_matches"] = set(assets) == expected
        if set(assets) != expected:
            report["status"] = "unavailable"
    if record:
        release = json.loads(record.read_text())
        report["asset_record_matches"] = assets == release["assets"]
        report["frontend_record_matches"] = file_hashes(web) == release["frontend"]
        if not report["asset_record_matches"] or not report["frontend_record_matches"]:
            report["status"] = "unavailable"
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, default=Path("var/furniture"))
    parser.add_argument("--web-dist", type=Path, default=Path("apps/web/dist"))
    parser.add_argument("--release-record", type=Path)
    parser.add_argument("--strict-cache", action="store_true")
    args = parser.parse_args()
    try:
        report = validate(args.cache, args.web_dist, args.release_record, args.strict_cache)
    except (OSError, ValueError, KeyError, TypeError):
        report = {"status": "unavailable", "frontend_built": False, "public_release_approved": False}
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "ready" and report["frontend_built"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
