"""Stdlib-only verification of a frozen Docker context against its release record."""
import argparse
import hashlib
import json
from pathlib import Path


def verify(root: Path) -> dict:
    root = root.resolve()
    record = json.loads((root / "release.json").read_text())
    expected = record["source_files"]
    if not isinstance(expected, dict) or not expected:
        raise ValueError("Missing source-file inventory")
    inventory_digest = hashlib.sha256(json.dumps(expected, sort_keys=True).encode()).hexdigest()
    if inventory_digest != record["source_digest"]:
        raise ValueError("Source inventory digest mismatch")
    actual = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError("Symlinks are not permitted in a frozen context")
        if path.is_file() and path != root / "release.json":
            actual[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError("Frozen context changed: missing, additional or modified source file")
    return {"status": "ready", "source_digest": inventory_digest, "source_files": len(actual)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("context", type=Path)
    args = parser.parse_args()
    try:
        result = verify(args.context)
    except (OSError, ValueError, KeyError, TypeError):
        print(json.dumps({"status": "unavailable", "reason": "frozen_context_mismatch"}))
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
