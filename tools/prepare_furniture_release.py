"""Build and stage an allowlisted local furniture candidate; never publish it."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api/src"))
from guide2build.furniture.catalog import search  # noqa: E402
from guide2build.furniture.source import verified_asset  # noqa: E402


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def asset_files(cache: Path) -> list[Path]:
    """Only curated PDFs, manifests and verified page images enter the image."""
    files: set[Path] = set()
    for item in search():
        for doc in item.documents:
            pdf = verified_asset(cache, doc.id, article_number=item.article_number)
            files.update((pdf, pdf.parent / "manifest.json"))
            for index in range(doc.page_count):
                files.add(verified_asset(cache, doc.id, index, item.article_number))
    for path in files:
        relative = path.relative_to(cache.resolve())
        current = cache
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                raise ValueError("Symlinks are not release inputs")
    return sorted(files)


def stage_assets(cache: Path, destination: Path) -> dict[str, str]:
    files = asset_files(cache)
    destination.mkdir(parents=True, exist_ok=False)
    manifest = {}
    for path in files:
        relative = path.relative_to(cache.resolve())
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        manifest[relative.as_posix()] = digest(target)
    return manifest


def tree_hashes(root: Path) -> dict[str, str]:
    result = {}
    for path in sorted(root.rglob("*")):
        if any(p in {"node_modules", "dist", "__pycache__", ".git"} or p.startswith(".env") for p in path.relative_to(root).parts):
            continue
        if path.is_symlink():
            raise ValueError("Symlinks are not release inputs")
        if path.is_file() and path.suffix != ".pyc":
            result[path.relative_to(ROOT).as_posix()] = digest(path)
    return result


def source_hashes() -> dict[str, str]:
    result = {}
    for name in ("apps/api/src", "apps/web", "packages/contracts", "config/furniture", "deploy/furniture"):
        result.update(tree_hashes(ROOT / name))
    for name in ("package.json", "package-lock.json", "pyproject.toml", "uv.lock", "config/sets.json", "config/placement-30669-alt-02-v3.json", "tests/fixtures/synthetic.scene.json", "tools/check_furniture_release.py", "tools/prepare_furniture_release.py", "tools/verify_furniture_context.py"):
        result[name] = digest(ROOT / name)
    return dict(sorted(result.items()))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="New directory; existing candidates are never overwritten")
    parser.add_argument("--cache", type=Path, default=ROOT / "var/furniture")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Output already exists; choose a new candidate directory")
    before = source_hashes()
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)
    if source_hashes() != before:
        raise RuntimeError("Source inputs changed during build; retry after edits finish")
    assets = stage_assets(args.cache, args.output / "assets")
    # Validate the staged bytes again, never just the original cache.
    asset_files(args.output / "assets")
    web = ROOT / "apps/web/dist"
    shutil.copytree(web, args.output / "web", symlinks=False)
    frontend = {p.relative_to(web).as_posix(): digest(p) for p in sorted(web.rglob("*")) if p.is_file()}
    def git(*arguments: str) -> str:
        return subprocess.check_output(["git", *arguments], cwd=ROOT, text=True).strip()
    record = {"schema_version": 1, "git_commit": git("rev-parse", "HEAD"),
              "git_tree": git("rev-parse", "HEAD^{tree}"), "dirty": bool(git("status", "--porcelain")),
              "source_files": before, "source_digest": hashlib.sha256(json.dumps(before, sort_keys=True).encode()).hexdigest(),
              "assets": assets, "frontend": frontend, "image_digest": None,
              "container_validation": "not_run", "public_release_approved": False}
    for name, expected in before.items():
        source = ROOT / name
        target = args.output / "context" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        if digest(target) != expected:
            raise RuntimeError("Source inputs changed during staging; discard this candidate")
    serialized = json.dumps(record, indent=2) + "\n"
    (args.output / "release.json").write_text(serialized)
    (args.output / "context/release.json").write_text(serialized)
    print(f"Prepared local candidate: {args.output}")
    print("Container build/run, rights review and publication approval remain separate gates.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
