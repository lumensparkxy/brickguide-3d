"""Allowlist-only, content-addressed export. Never copy a job directory wholesale."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import shutil
import tempfile
from guide2build.releases.models import SceneV2, ReleaseValidation, canonical, digest

SAFE = re.compile(r'^(parts/(?:s/)?|p/(?:8/|48/)?)[a-z0-9_-]+\.dat$')


def compact_step_index(step, chunk_index: int) -> dict:
    """Navigation metadata is linear in steps + unique introductions, never cumulative state."""
    return dict(step.model_dump(mode='json', exclude={'poses', 'visible_instance_ids', 'active_instance_ids'}),
                visible_instance_count=len(step.visible_instance_ids),
                active_instance_count=len(step.active_instance_ids), chunk_index=chunk_index)


def geometry_closure(root: Path, refs: list[str]) -> dict[str, bytes]:
    root = root.resolve()
    manifest = json.loads((root / 'provenance.json').read_text())
    records, selected, visiting = manifest['resources'], {}, set()
    total = 0

    def read(path, record):
        nonlocal total
        target = root / path
        if target.is_symlink() or not target.resolve().is_relative_to(root) or target.stat().st_size > 1_000_000:
            raise ValueError('Unsafe or oversized geometry asset')
        data = target.read_bytes()
        total += len(data)
        if total > 256_000_000 or hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ValueError('Geometry hash or total byte bound failed')
        if record.get('url') != 'https://library.ldraw.org/library/official/' + path:
            raise ValueError('Unexpected geometry provenance origin')
        return data

    def walk(path, depth=0):
        if not SAFE.fullmatch(path) or path in visiting or depth > 32:
            raise ValueError('Unsafe or cyclic dependency')
        if path in selected:
            return
        if len(selected) + len(visiting) >= 20000:
            raise ValueError('Geometry closure resource bound')
        record = records[path]
        data = read(path, record)
        classes = re.findall(r'^0 !LDRAW_ORG (\S+)', data.decode('utf-8-sig'), re.MULTILINE)
        if not classes or classes[0] not in {'Part', 'Subpart', 'Primitive', '48_Primitive', '8_Primitive', 'Shortcut'}:
            raise ValueError('Asset is not permitted individual geometry')
        if classes[0] == 'Shortcut':
            raise ValueError('Assembly shortcuts are not permitted release inputs')
        if record.get('classification') != classes[0]:
            raise ValueError('Geometry classification receipt mismatch')
        if not any('!LICENSE' in line for line in data.decode('utf-8-sig').splitlines()):
            raise ValueError('Missing retained geometry license')
        visiting.add(path)
        dependencies = []
        for line in data.decode('utf-8-sig').splitlines():
            fields = line.split(maxsplit=14)
            if fields and fields[0] == '1':
                if len(fields) != 15:
                    raise ValueError('Invalid individual geometry reference')
                name = fields[14].lower().replace('\\', '/')
                dependency = manifest.get('file_map', {}).get(name)
                if dependency is None:
                    raise ValueError('Unknown geometry dependency')
                dependencies.append(dependency)
        if set(dependencies) != set(record.get('dependencies', [])):
            raise ValueError('Geometry receipt dependency mismatch')
        for dependency in dependencies:
            walk(dependency, depth + 1)
        visiting.remove(path)
        selected[path] = data

    for ref in refs:
        walk(ref)
    material = manifest['materials']['LDConfig.ldr']
    selected['LDConfig.ldr'] = read('LDConfig.ldr', material)
    # Keep original notices but strip any unrelated local receipt metadata.
    public_records = {p: {k: records[p][k] for k in ('url', 'sha256', 'notices', 'dependencies', 'classification')
                          if k in records[p]} for p in selected if p != 'LDConfig.ldr'}
    selected['provenance.json'] = canonical({'resources': public_records, 'materials': {'LDConfig.ldr': material},
        'file_map': {k: v for k, v in manifest.get('file_map', {}).items() if v in selected}})
    notices = sorted({line for r in public_records.values() for line in r.get('notices', [])
                      if '!LICENSE' in line or 'Author:' in line})
    selected['NOTICES.txt'] = ('Individual LDraw geometry; source notices retained in each file.\n'
                              'https://www.ldraw.org/article/227.html\n' + '\n'.join(notices)).encode()
    return selected


def package_release(scene: SceneV2, validation: ReleaseValidation, geometry_root: Path, output: Path, preview: Path | None = None, trusted_source_registry: dict | None = None, source_index: dict | None = None) -> dict:
    validation.check(scene)
    from guide2build.releases.evidence import verify_source_evidence, source_registry
    if source_index is None:
        raise ValueError('An independently verified source coverage index is required')
    coverage = verify_source_evidence(scene, validation, trusted_source_registry or source_registry(), source_index)
    if preview is None:
        raise ValueError('A real model-render PNG preview is required before release packaging')
    from PIL import Image
    preview = Path(preview)
    if preview.is_symlink() or preview.stat().st_size > 20_000_000:
        raise ValueError('Unsafe or oversized preview')
    with Image.open(preview) as image:
        if image.format != 'PNG' or not (32 <= image.width <= 4096 and 32 <= image.height <= 4096):
            raise ValueError('Preview must be a bounded PNG model render')
        if any(k not in {'srgb', 'gamma', 'chromaticity', 'dpi'} for k in image.info):
            raise ValueError('Preview contains non-public metadata')
        image.verify()
    output = Path(output)
    if output.exists():
        raise ValueError('Release output must be a new directory')
    output.parent.mkdir(parents=True, exist_ok=True)
    files = {'ldraw/' + p: b for p, b in geometry_closure(geometry_root,
                sorted({p.geometry_ref for p in scene.instances})).items()}
    metadata = scene.model_dump(mode='json', exclude={'steps'})
    files['preview.png'] = preview.read_bytes()
    metadata['preview'] = {'path': 'preview.png', 'scene_sha256': digest(scene)}
    metadata['reviews'] = []
    metadata['step_index'], metadata['chunks'] = [], []
    for offset in range(0, len(scene.steps), 8):
        index = offset // 8
        steps = scene.steps[offset:offset + 8]
        data = canonical({'steps': [s.model_dump(mode='json') for s in steps]})
        path = f'chunks/{index:05d}.json'
        files[path] = data
        metadata['chunks'].append(dict(index=index, path=path, sha256=hashlib.sha256(data).hexdigest(),
                                       bytes=len(data), step_ids=[s.step_id for s in steps]))
        metadata['step_index'].extend(compact_step_index(s, index) for s in steps)
    # Only typed validation summary, never private evidence paths or prompts.
    files['validation.json'] = canonical(validation)
    files['coverage.json'] = canonical(coverage)
    metadata['files'] = {p: {'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b)} for p, b in files.items()}
    release_hash = digest(metadata)
    metadata['release_sha256'] = release_hash
    files['manifest.json'] = canonical(metadata)
    temp = Path(tempfile.mkdtemp(prefix='.release-', dir=output.parent))
    try:
        for name, data in files.items():
            target = temp / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        temp.rename(output)
    finally:
        if temp.exists():
            shutil.rmtree(temp)
    return metadata


def verify_bundle(directory: Path) -> dict:
    directory = directory.resolve()
    manifest = json.loads((directory / 'manifest.json').read_text())
    expected_hash = manifest['release_sha256']
    if digest({k: v for k, v in manifest.items() if k != 'release_sha256'}) != expected_hash:
        raise ValueError('Manifest hash mismatch')
    expected = set(manifest['files']) | {'manifest.json'}
    actual = {p.relative_to(directory).as_posix() for p in directory.rglob('*') if p.is_file()}
    if expected != actual:
        raise ValueError('Unexpected or missing bundle files')
    for name, receipt in manifest['files'].items():
        if name.startswith('/') or '..' in name.split('/') or '\\' in name:
            raise ValueError('Unsafe bundle path')
        path = directory / name
        if path.is_symlink() or not path.resolve().is_relative_to(directory):
            raise ValueError('Unsafe bundle asset')
        if path.stat().st_size != receipt['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest() != receipt['sha256']:
            raise ValueError('Bundle bytes differ from manifest')
    scene_data = {k: v for k, v in manifest.items() if k not in {'reviews', 'step_index', 'chunks', 'files', 'release_sha256', 'preview'}}
    scene_data['steps'] = []
    for chunk in manifest['chunks']:
        scene_data['steps'].extend(json.loads((directory / chunk['path']).read_text())['steps'])
    validate_scene_manifest(manifest, scene_data['steps'], (directory / 'validation.json').read_bytes(),
                            json.loads((directory / 'coverage.json').read_text()))
    verify_manifest(manifest)
    return manifest


def verify_manifest(manifest: dict):
    allowed_fields = (set(SceneV2.model_fields) - {'steps'}) | {'reviews', 'step_index', 'chunks', 'files', 'release_sha256', 'preview'}
    if set(manifest) != allowed_fields or manifest.get('reviews') != []:
        raise ValueError('Unexpected or missing public manifest fields')
    release_hash = manifest.get('release_sha256')
    if not isinstance(release_hash, str) or not re.fullmatch(r'[a-f0-9]{64}', release_hash):
        raise ValueError('Invalid release hash')
    if digest({k: v for k, v in manifest.items() if k != 'release_sha256'}) != release_hash:
        raise ValueError('Manifest hash mismatch')
    if not re.fullmatch(r'[0-9]{4,7}', manifest.get('set_number', '')) or not re.fullmatch(r'[a-z0-9-]+', manifest.get('guide_id', '')):
        raise ValueError('Invalid release identity')
    allowed = re.compile(r'^(preview\.png|coverage\.json|validation\.json|chunks/[0-9]{5}\.json|ldraw/(?:provenance\.json|NOTICES\.txt|LDConfig\.ldr|(?:parts/(?:s/)?|p/(?:8/|48/)?)[a-z0-9_-]+\.dat))$')
    files = manifest.get('files', {})
    if not files or len(files) > 22000 or any(not allowed.fullmatch(p) for p in files):
        raise ValueError('Bundle file outside publication allowlist')
    if 'coverage.json' not in files or 'preview.png' not in files or 'validation.json' not in files or 'ldraw/provenance.json' not in files or 'ldraw/NOTICES.txt' not in files:
        raise ValueError('Required publication evidence missing')
    if sum(r.get('bytes', 0) for r in files.values() if isinstance(r.get('bytes'), int)) > 512_000_000:
        raise ValueError('Release exceeds total asset byte bound')
    for receipt in files.values():
        if (not isinstance(receipt.get('bytes'), int) or not 0 <= receipt['bytes'] <= 32_000_000
                or not re.fullmatch(r'[a-f0-9]{64}', receipt.get('sha256', ''))):
            raise ValueError('Invalid asset receipt')
    return manifest



def validate_scene_manifest(manifest: dict, steps: list[dict], report: bytes, source_index: dict, trusted_source_registry=None):
    data = {k: v for k, v in manifest.items() if k not in
            {'reviews', 'step_index', 'chunks', 'files', 'release_sha256', 'preview'}}
    data['steps'] = steps
    scene = SceneV2.model_validate(data)
    validation = ReleaseValidation.model_validate_json(report)
    validation.check(scene)
    from guide2build.releases.evidence import verify_source_evidence, source_registry
    verify_source_evidence(scene, validation, trusted_source_registry or source_registry(), source_index)
    if manifest.get('preview') != {'path': 'preview.png', 'scene_sha256': digest(scene)}:
        raise ValueError('Preview is not bound to the validated scene')
    expected_index, offset = [], 0
    for index, chunk in enumerate(manifest['chunks']):
        if chunk['index'] != index or chunk['path'] != f'chunks/{index:05d}.json':
            raise ValueError('Chunk ordering mismatch')
        if not 1 <= len(chunk['step_ids']) <= 8:
            raise ValueError('Chunk size mismatch')
        selection = scene.steps[offset:offset + len(chunk['step_ids'])]
        if [s.step_id for s in selection] != chunk['step_ids']:
            raise ValueError('Chunk step identity mismatch')
        receipt = manifest['files'].get(chunk['path'])
        if not receipt or any(receipt[k] != chunk[k] for k in ('bytes', 'sha256')):
            raise ValueError('Chunk receipt mismatch')
        expected_index.extend(compact_step_index(s, index) for s in selection)
        offset += len(selection)
    if offset != len(scene.steps) or expected_index != manifest['step_index']:
        raise ValueError('Lightweight step index differs from canonical snapshots')
    return scene
