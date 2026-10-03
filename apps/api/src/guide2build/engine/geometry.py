"""Reuse the bounded individual-part resolver without mutating the portal's shared cache."""
from __future__ import annotations
import importlib.util
import json
import shutil
import sys
from pathlib import Path
from ..catalog import ROOT
from ..reconstruction.checks import verify_assets


def prepare_geometry(scene, directory: Path, shared: Path):
    roots = sorted({instance.part_id for instance in scene.instances})
    if any(instance.geometry_ref != f"parts/{instance.part_id}.dat" for instance in scene.instances):
        raise ValueError("Physical instance geometry must be its individually resolved Part")
    directory.mkdir(parents=True, exist_ok=True)
    # Existing assets can seed the private cache only with their verified provenance.
    if not (directory / "provenance.json").exists() and (shared / "provenance.json").is_file():
        document = json.loads((shared / "provenance.json").read_text())
        for relative in [*document.get("resources", {}), *document.get("materials", {})]:
            source = shared / relative
            if source.is_symlink() or not source.resolve().is_relative_to(shared.resolve()):
                raise ValueError("Geometry cache escapes the curated root")
            destination = directory / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
        shutil.copyfile(shared / "provenance.json", directory / "provenance.json")
    retained = merge_verified_cache_receipts(directory, shared)
    # This module remains the existing single authoritative allowlist/classification boundary.
    spec = importlib.util.spec_from_file_location("guide2build_local_fetch_parts", ROOT / "tools/fetch_parts.py")
    resolver = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(ROOT / "tools"))
    try:
        spec.loader.exec_module(resolver)
    finally:
        sys.path.pop(0)
    resolver.fetch_parts(roots, directory)
    resolver.fetch_materials(directory)
    current = json.loads((directory / "provenance.json").read_text())
    current["resources"] = retained.get("resources", {}) | current["resources"]
    current["file_map"] = retained.get("file_map", {}) | current.get("file_map", {})
    (directory / "provenance.json").write_text(json.dumps(current, indent=2) + "\n")
    return verify_assets(directory, [instance.geometry_ref for instance in scene.instances])


def individual_catalogue_context(shared: Path, max_bytes=100_000):
    """Verified geometry only. Never reads set mappings, scene/reference files or assembly coordinates."""
    import hashlib
    manifest = shared / "provenance.json"
    if not manifest.is_file():
        return []
    document = json.loads(manifest.read_text())
    result, size = [], 0
    for relative, record in sorted(document.get("resources", {}).items()):
        if record.get("classification") != "Part":
            continue
        target = shared / relative
        if target.is_symlink() or not target.resolve().is_relative_to(shared.resolve()):
            raise ValueError("Individual part path escapes root")
        if target.stat().st_size > 1_000_000:
            raise ValueError("Individual part exceeds bound")
        data = target.read_bytes()
        if record.get("url") != "https://library.ldraw.org/library/official/" + relative:
            raise ValueError("Individual part origin not official LDraw")
        if hashlib.sha256(data).hexdigest() != record.get("sha256"):
            raise ValueError("Individual part cache hash mismatch")
        # Keep source notices but never use comments as executable instructions.
        geometry = data.decode("utf-8-sig")[:6000]
        size += len(geometry.encode())
        if size > max_bytes:
            break
        result.append({"geometry_ref": relative, "description": record.get("description"),
                       "raw_ldraw_part_geometry": geometry, "truncated": len(data) > 6000})
    return result


def merge_verified_cache_receipts(directory: Path, shared: Path):
    """Keep receipts for unused seeded files; selected-closure fetches must not orphan them."""
    import hashlib
    target = directory / "provenance.json"
    document = json.loads(target.read_text()) if target.exists() else {"resources": {}, "file_map": {}}
    source = shared / "provenance.json"
    shared_document = json.loads(source.read_text()) if source.exists() else {}
    for relative, record in shared_document.get("resources", {}).items():
        if relative in document["resources"]:
            continue
        file = directory / relative
        if not file.is_file():
            continue
        if file.is_symlink() or not file.resolve().is_relative_to(directory.resolve()) or file.stat().st_size > 1_000_000:
            raise ValueError("Unsafe seeded geometry")
        if record.get("url") != "https://library.ldraw.org/library/official/" + relative:
            raise ValueError("Unverified seeded geometry origin")
        if hashlib.sha256(file.read_bytes()).hexdigest() != record.get("sha256"):
            raise ValueError("Seeded geometry hash differs from original receipt")
        document["resources"][relative] = record
    document.setdefault("file_map", {}).update({name: path for name, path in shared_document.get("file_map", {}).items()
                                               if path in document["resources"]})
    target.write_text(json.dumps(document, indent=2) + "\n")
    return document
