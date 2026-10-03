"""Actual loopback Three.js renders, never a synthetic success or GPU hardware claim."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import time
from ..catalog import ROOT
from ..releases.models import SceneV2, digest
from .provider import child_environment


def render_candidate(scene_path: Path, geometry: Path, output: Path, check=lambda: None, timeout=900):
    node = shutil.which("node")
    if not node:
        raise ValueError("Node.js is required for actual candidate browser rendering")
    args = [node, str(ROOT / "tools/render_candidate.mjs"), "--scene", str(scene_path.resolve()),
            "--geometry-root", str(geometry.resolve()), "--output", str(output.resolve())]
    output.parent.mkdir(parents=True, exist_ok=True)
    log = output.with_suffix(".log")
    started = time.monotonic()
    with log.open("w") as stream:
        process = subprocess.Popen(args, cwd=ROOT, env=child_environment(), stdout=stream, stderr=stream,
                                   start_new_session=True)
        try:
            while process.poll() is None:
                check()
                if time.monotonic()-started > timeout or log.stat().st_size > 20_000_000:
                    raise ValueError("Candidate rendering exceeded its time/output bound")
                time.sleep(0.2)
        finally:
            if process.poll() is None:
                import os
                import signal
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
    if process.returncode != 0:
        raise ValueError("Actual candidate browser rendering failed; inspect private render log")
    report = json.loads((output / "report.json").read_text())
    scene = SceneV2.model_validate_json(scene_path.read_text())
    if report.get("status") != "rendered" or report.get("scene_sha256") != digest(scene):
        raise ValueError("Render report does not bind the current candidate")
    if len(report.get("steps", [])) != len(scene.steps):
        raise ValueError("Render report does not cover all candidate microsteps")
    for expected, rendered in zip(scene.steps, report["steps"], strict=True):
        if rendered["step_id"] != expected.step_id:
            raise ValueError("Rendered step identity mismatch")
        image = output / rendered["screenshot"]
        if image.is_symlink() or not image.resolve().is_relative_to(output.resolve()):
            raise ValueError("Render image escapes evidence directory")
        if hashlib.sha256(image.read_bytes()).hexdigest() != rendered["png_sha256"]:
            raise ValueError("Render image hash mismatch")
    return report
