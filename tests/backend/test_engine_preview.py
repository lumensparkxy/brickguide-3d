"""Synthetic transport tests; these fixtures never prove real reconstruction accuracy."""
import hashlib
import json

import pytest
from fastapi.testclient import TestClient

from guide2build.catalog import find_guide
from guide2build.core.models import SceneManifest
from guide2build.engine.preview import create_preview_app
from guide2build.engine.store import EngineStore
from guide2build.releases.models import adapt_v1, digest


@pytest.fixture
def preview(tmp_path, scene_data):
    store = EngineStore(tmp_path)
    job = store.enqueue('30669', 'alt-02', {'revision': 'preview-test'})
    guide = find_guide('30669', 'alt-02')
    pdf = b'%PDF-1.4 synthetic test only'
    source_hash = hashlib.sha256(pdf).hexdigest()
    scene_data = json.loads(json.dumps(scene_data).replace(scene_data['source_sha256'], source_hash))
    scene_data.update(set_number='30669', guide_id='alt-02')
    source_dir = tmp_path / 'sources/30669/alt-02'
    source_dir.mkdir(parents=True)
    (source_dir / 'source.pdf').write_bytes(pdf)
    (source_dir / 'source.receipt.json').write_text(json.dumps({'requested_url': guide['pdf_url'],
        'resolved_url': guide['pdf_url'], 'sha256': source_hash, 'size_bytes': len(pdf),
        'downloaded_at': '2026-10-03T00:00:00Z'}))
    scene = adapt_v1(SceneManifest.model_validate(scene_data), guide['pdf_url'], guide['expected_page_count'])
    directory = store.root / 'jobs' / job['id']
    directory.mkdir(parents=True)
    frontend = tmp_path / 'dist'
    frontend.mkdir()
    (frontend / 'index.html').write_text('<html>Test frontend</html>')
    app = create_preview_app(tmp_path, job['id'], frontend)
    return TestClient(app, base_url='http://127.0.0.1'), store, job, directory, scene, frontend


def install_candidate(preview):
    client, store, job, directory, scene, frontend = preview
    raw = scene.model_dump(mode='json')
    (directory / 'scene.json').write_text(json.dumps(raw))
    with store.connect() as con:
        con.execute('UPDATE engine_jobs SET checkpoint=? WHERE id=?',
                    (json.dumps({'candidate': raw, 'source_sha256': scene.source_sha256, 'stage': 'paused'}), job['id']))
    geometry = directory / 'geometry'
    geometry.mkdir()
    records = {}
    data = b'0 Synthetic test only\n0 !LDRAW_ORG Part\n0 !LICENSE Test only\n'
    for ref in {part.geometry_ref for part in scene.instances}:
        file = geometry / ref
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
        records[ref] = {'url': 'https://library.ldraw.org/library/official/' + ref,
                        'sha256': hashlib.sha256(data).hexdigest(), 'dependencies': [],
                        'classification': 'Part', 'notices': ['0 !LICENSE Test only']}
    (geometry / 'LDConfig.ldr').write_bytes(b'0 Test material')
    material = {'url': 'https://library.ldraw.org/library/official/LDConfig.ldr',
                'sha256': hashlib.sha256(b'0 Test material').hexdigest()}
    (geometry / 'provenance.json').write_text(json.dumps({'resources': records,
        'materials': {'LDConfig.ldr': material}, 'file_map': {}}))
    return scene


def test_status_without_candidate_and_no_mutation(preview):
    client, store, job, directory, scene, frontend = preview
    before = store.get(job['id'])
    assert client.get('/').status_code == 200
    (frontend / 'fonts').mkdir()
    (frontend / 'fonts/test.woff2').write_bytes(b'unit-test-font')
    assert client.get('/fonts/test.woff2').content == b'unit-test-font'
    state = client.get('/api/v1/engine-preview').json()
    assert state['state'] == 'queued' and not state['candidate_available']
    assert state['revision'] is None and state['experiment_revision'] == 'preview-test'
    assert state['publication'] == 'not_performed'
    assert state['image_quality']['profile'] == 'strict'
    assert client.post('/api/v1/engine-preview').status_code == 405
    assert client.post('/api/v1/conversions', json={}).status_code == 405
    assert client.get('/api/v1/config').json()['mode'] == 'preview'
    assert client.get('/api/v1/sets/30669').json()['guides'][0]['tutorial_available'] is False
    assert client.get('/api/v1/sets/99999').status_code == 404
    assert client.get('/calls/private.json').status_code == 404
    assert client.get('/api/v1/engine-preview', headers={'Host': 'attacker.invalid'}).status_code == 403
    assert store.get(job['id']) == before


def test_alpha_preview_exposes_relaxed_errors_without_review_or_publication(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    checkpoint = store.get(job['id'])['checkpoint']
    check = {'status': 'fitted', 'rms_pixels': 7.7, 'max_error_pixels': 9.8,
             'strict_status': 'poor_fit', 'accepted_with_relaxed_tolerance': True}
    checkpoint['panel_reviews'] = [{'source_view_checks': {'s2': check}}]
    with store.connect() as con:
        con.execute('UPDATE engine_jobs SET config=?,checkpoint=? WHERE id=?',
                    (json.dumps({'quality_profile': 'alpha'}), json.dumps(checkpoint), job['id']))
    before = store.get(job['id'])
    state = client.get('/api/v1/engine-preview').json()
    assert state['image_quality']['profile'] == 'alpha'
    assert state['image_quality']['relaxed_steps'] == [{'step_id': 's2', **check}]
    assert state['publication'] == 'not_performed'
    manifest = client.get('/api/v1/sets/30669/guides/alt-02/release').json()
    assert manifest['reviews'] == [] and manifest['physical_build_check'] == 'not_run'
    assert store.get(job['id']) == before


def test_real_checkpoint_manifest_and_hash_bound_assets(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    before = store.get(job['id'])
    manifest = client.get('/api/v1/sets/30669/guides/alt-02/release').json()
    assert manifest['status'] == scene.status
    assert 'files' not in manifest and 'preview' not in manifest  # Not a release package.
    assert manifest['reviews'] == [] and manifest['physical_build_check'] == 'not_run'
    chunk = manifest['chunks'][0]
    response = client.get(manifest['asset_base_url'] + chunk['path'])
    assert hashlib.sha256(response.content).hexdigest() == chunk['sha256']
    assert response.json()['steps'][0]['poses'] == scene.steps[0].model_dump(mode='json')['poses']
    assert client.get(manifest['geometry_base_url'] + scene.instances[0].geometry_ref).status_code == 200
    assert client.get(manifest['asset_base_url'] + '../../jobs.sqlite3').status_code == 404
    assert client.get(manifest['asset_base_url'] + 'scene.json').status_code == 404
    assert store.get(job['id']) == before
    assert digest(store.get(job['id'])['checkpoint']['candidate']) == digest(scene)


def test_reject_stale_candidate_and_geometry_escape(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    target = directory / 'geometry' / scene.instances[0].geometry_ref
    target.unlink()
    outside = store.data_dir / 'outside.dat'
    outside.write_bytes(b'private data')
    target.symlink_to(outside)
    assert client.get('/api/v1/sets/30669/guides/alt-02/release').status_code == 409
    scene.revision = 'stale'
    (directory / 'scene.json').write_text(scene.model_dump_json())
    assert not client.get('/api/v1/engine-preview').json()['candidate_available']


def test_warm_preview_rejects_checkpoint_change_without_updated_timestamp(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    assert client.get('/api/v1/engine-preview').json()['candidate_available']
    before = store.get(job['id'])
    checkpoint = before['checkpoint'] | {'source_sha256': 'f' * 64}
    with store.connect() as con:
        con.execute('UPDATE engine_jobs SET checkpoint=? WHERE id=?', (json.dumps(checkpoint), job['id']))
    assert store.get(job['id'])['updated'] == before['updated']
    assert not client.get('/api/v1/engine-preview').json()['candidate_available']
    assert client.get('/api/v1/sets/30669/guides/alt-02/release').status_code == 409


def test_warm_preview_rejects_changed_scene_and_source_pdf(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    assert client.get('/api/v1/engine-preview').json()['candidate_available']
    original = (directory / 'scene.json').read_bytes()
    changed = scene.model_copy(update={'revision': 'different-after-cache'})
    (directory / 'scene.json').write_text(changed.model_dump_json())
    assert not client.get('/api/v1/engine-preview').json()['candidate_available']
    (directory / 'scene.json').write_bytes(original)
    assert client.get('/api/v1/engine-preview').json()['candidate_available']
    (store.data_dir / 'sources/30669/alt-02/source.pdf').write_bytes(b'%PDF-changed-after-cache')
    assert not client.get('/api/v1/engine-preview').json()['candidate_available']


def test_source_pages_are_selected_committed_hash_verified_and_confined(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    pages = store.data_dir / 'public/pages' / scene.source_sha256
    pages.mkdir(parents=True)
    data = b'synthetic PNG fixture'
    (pages / 'page-000.png').write_bytes(data)
    (pages / 'pages.json').write_text(json.dumps([{'page_index': 0, 'file': 'page-000.png',
        'sha256': hashlib.sha256(data).hexdigest()}]))
    url = f'/api/v1/sources/{scene.source_sha256}/pages/0'
    assert client.get(url).content == data
    assert client.get('/api/v1/sources/' + 'f'*64 + '/pages/0').status_code == 404
    (pages / 'page-000.png').write_bytes(b'changed')
    assert client.get(url).status_code == 404
    (pages / 'page-000.png').unlink()
    (pages / 'page-000.png').symlink_to(frontend / 'index.html')
    assert client.get(url).status_code == 404
    (frontend / 'assets').symlink_to(store.data_dir, target_is_directory=True)
    assert client.get('/assets/outside.dat').status_code == 404


def test_changed_official_pdf_invalidates_preview(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    (store.data_dir / 'sources/30669/alt-02/source.pdf').write_bytes(b'%PDF-changed')
    assert not client.get('/api/v1/engine-preview').json()['candidate_available']
    assert client.get('/api/v1/sets/30669/guides/alt-02/release').status_code == 409


def add_test_job(preview, scene_data, number, guide_id, *, available=True):
    """Original synthetic transport data, never official reconstruction evidence."""
    client, store, _, _, _, frontend = preview
    job = store.enqueue(number, guide_id, {'revision': 'campaign-' + guide_id})
    guide = find_guide(number, guide_id)
    pdf = f'%PDF-1.4 synthetic campaign {number}/{guide_id}'.encode()
    source_hash = hashlib.sha256(pdf).hexdigest()
    source_dir = store.data_dir / 'sources' / number / guide_id
    source_dir.mkdir(parents=True)
    (source_dir / 'source.pdf').write_bytes(pdf)
    (source_dir / 'source.receipt.json').write_text(json.dumps({'requested_url': guide['pdf_url'],
        'resolved_url': guide['pdf_url'], 'sha256': source_hash, 'size_bytes': len(pdf),
        'downloaded_at': '2026-10-03T00:00:00Z'}))
    data = json.loads(json.dumps(scene_data).replace(scene_data['source_sha256'], source_hash))
    data.update(set_number=number, guide_id=guide_id, revision='campaign-' + number + '-' + guide_id)
    scene = adapt_v1(SceneManifest.model_validate(data), guide['pdf_url'], guide['expected_page_count'])
    directory = store.root / 'jobs' / job['id']
    directory.mkdir(parents=True)
    selected = client, store, job, directory, scene, frontend
    if available:
        install_candidate(selected)
    return selected


def test_campaign_scopes_status_availability_assets_and_source_pages(preview, scene_data):
    from guide2build.engine.preview import create_campaign_preview_app
    client, store, first, directory, scene, frontend = preview
    install_candidate(preview)
    second = add_test_job(preview, scene_data, '30669', 'alt-01')
    third = add_test_job(preview, scene_data, '60400', 'booklet-01', available=False)
    hidden = add_test_job(preview, scene_data, '60400', 'booklet-02')
    before = [store.get(item['id']) for item in (first, second[2], third[2], hidden[2])]
    client = TestClient(create_campaign_preview_app(store.data_dir, [first['id'], second[2]['id'], third[2]['id']], frontend),
                        base_url='http://127.0.0.1')
    values = client.get('/api/v1/engine-preview').json()['candidates']
    assert [(item['set_number'], item['guide_id'], item['candidate_available']) for item in values] == [
        ('30669', 'alt-02', True), ('30669', 'alt-01', True), ('60400', 'booklet-01', False)]
    assert client.get('/api/v1/engine-preview?set_number=30669&guide_id=alt-01').json()['job_id'] == second[2]['id']
    assert len(client.get('/api/v1/engine-preview?set_number=30669').json()['candidates']) == 2
    assert client.get('/api/v1/engine-preview?set_number=60400&guide_id=booklet-02').status_code == 404
    assert [guide['tutorial_available'] for guide in client.get('/api/v1/sets/30669').json()['guides']] == [True, True]
    assert client.get('/api/v1/sets/60400').json()['guides'][0]['tutorial_available'] is False
    assert client.get('/api/v1/sets/60400/guides/booklet-02/release').status_code == 404
    manifests = [client.get(f'/api/v1/sets/30669/guides/{guide_id}/release').json() for guide_id in ('alt-02', 'alt-01')]
    assert manifests[0]['asset_base_url'] != manifests[1]['asset_base_url']
    for manifest in manifests:
        chunk = manifest['chunks'][0]
        assert hashlib.sha256(client.get(manifest['asset_base_url'] + chunk['path']).content).hexdigest() == chunk['sha256']
        assert client.get(manifest['geometry_base_url'] + scene.instances[0].geometry_ref).status_code == 200
        pages = store.data_dir / 'public/pages' / manifest['source_sha256']
        pages.mkdir(parents=True)
        data = ('synthetic PNG ' + manifest['source_sha256']).encode()
        (pages / 'page-000.png').write_bytes(data)
        (pages / 'pages.json').write_text(json.dumps([{'page_index': 0, 'file': 'page-000.png',
                                                    'sha256': hashlib.sha256(data).hexdigest()}]))
        assert client.get(f"/api/v1/sources/{manifest['source_sha256']}/pages/0").content == data
    assert client.get(f'/api/v1/sources/{hidden[4].source_sha256}/pages/0').status_code == 404
    assert client.post('/api/v1/conversions', json={}).status_code == 405
    assert client.get('/engine/jobs.sqlite3').status_code == 404
    assert client.get('/api/v1/engine-preview', headers={'Host': 'attacker.invalid'}).status_code == 403
    assert [store.get(item['id']) for item in (first, second[2], third[2], hidden[2])] == before


def test_campaign_cumulative_scene_binds_current_and_primary_sources(preview, scene_data):
    from guide2build.engine.preview import create_campaign_preview_app
    from guide2build.releases.models import SceneV2
    client, store, _, _, primary, frontend = preview
    second = add_test_job(preview, scene_data, '30669', 'alt-01')
    raw = primary.model_dump(mode='json')
    raw.update(guide_id='alt-01', revision='cumulative-test')
    current_source = second[4].sources[0].model_dump(mode='json')
    raw['sources'].append(current_source)
    raw['sections'].append({'section_id': 'alt-01', 'label': 'Second booklet', 'source_sha256': current_source['source_sha256']})
    step = dict(raw['steps'][-1])
    step.update(step_id='second-booklet', section_id='alt-01', main_step_number=1,
                action='inspect', introduced_instance_ids=[], source={**step['source'], 'page_index': 0,
                    'source_sha256': current_source['source_sha256']})
    raw['steps'].append(step)
    raw['steps'].append({**step, 'step_id': 'second-booklet-presentation',
                         'main_step_number': None, 'substep_label': 'Completed assembly'})
    cumulative = SceneV2.model_validate(raw)
    (second[3] / 'scene.json').write_text(cumulative.model_dump_json())
    with store.connect() as con:
        con.execute('UPDATE engine_jobs SET config=?,checkpoint=? WHERE id=?',
                    (json.dumps({'generation_mode': 'alpha_fast', 'quality_profile': 'alpha'}),
                     json.dumps({'candidate': raw, 'source_sha256': current_source['source_sha256'],
                                 'completed_panels': len(raw['steps']), 'alpha_source_complete': True}), second[2]['id']))
    client = TestClient(create_campaign_preview_app(store.data_dir, [second[2]['id']], frontend), base_url='http://127.0.0.1')
    assert cumulative.source_sha256 != current_source['source_sha256']
    assert client.get('/api/v1/engine-preview').json()['candidate_available'] is True
    status = client.get('/api/v1/engine-preview').json()
    assert status['main_step_count'] == status['completed_panels'] == status['total_panels'] == 1
    assert status['step_count'] == len(raw['steps'])
    assert client.get('/api/v1/sets/30669/guides/alt-01/release').status_code == 200
    (store.data_dir / 'sources/30669/alt-02/source.pdf').write_bytes(b'%PDF-primary-changed')
    assert client.get('/api/v1/engine-preview').json()['candidate_available'] is False


def test_large_pdf_preview_streams_and_uses_shared_source_limit(preview, monkeypatch):
    from pathlib import Path
    from guide2build.engine import preview as preview_module
    from guide2build.source import file_sha256
    client, store, job, directory, scene, frontend = preview
    if preview_module.MAX_BYTES <= 100_000_001:
        pytest.skip('Configured ingestion limit is intentionally below the former 100 MB preview limit')
    pdf = store.data_dir / 'sources/30669/alt-02/source.pdf'
    with pdf.open('r+b') as stream:
        stream.seek(100_000_000)
        stream.write(b'\0')
    receipt_path = pdf.with_suffix('.receipt.json')
    receipt = json.loads(receipt_path.read_text())
    receipt.update(sha256=file_sha256(pdf), size_bytes=pdf.stat().st_size)
    receipt_path.write_text(json.dumps(receipt))
    raw = json.loads(scene.model_dump_json().replace(scene.source_sha256, receipt['sha256']))
    from guide2build.releases.models import SceneV2
    scene = SceneV2.model_validate(raw)
    install_candidate((client, store, job, directory, scene, frontend))
    original = Path.read_bytes

    def forbid_whole_pdf(path):
        if path.name == 'source.pdf':
            raise AssertionError('Preview must verify PDFs by streaming')
        return original(path)

    monkeypatch.setattr(Path, 'read_bytes', forbid_whole_pdf)
    assert client.get('/api/v1/engine-preview').json()['candidate_available'] is True
    assert client.get('/api/v1/sets/30669/guides/alt-02/release').status_code == 200
    # A configured shared bound still rejects the source before reading its bytes.
    monkeypatch.setattr(preview_module, 'MAX_BYTES', 100_000_000)
    assert client.get('/api/v1/engine-preview').json()['candidate_available'] is False


def test_fast_alpha_status_retains_uncertainty_and_unchecked_camera(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    checkpoint = store.get(job['id'])['checkpoint']
    checkpoint.update(stage='alpha_complete', completed_pages=8, page_count=8,
                      source_coverage='all_pages_processed', uncertainty_notes=['Clear or light blue material unresolved.'])
    with store.connect() as con:
        con.execute('UPDATE engine_jobs SET config=?,checkpoint=?,state=? WHERE id=?',
                    (json.dumps({'quality_profile': 'alpha', 'generation_mode': 'alpha_fast'}),
                     json.dumps(checkpoint), 'paused', job['id']))
    before = store.get(job['id'])
    result = client.get('/api/v1/engine-preview').json()
    assert result['generation_mode'] == 'alpha_fast'
    assert result['camera_alignment_check'] == 'not_run'
    assert result['completed_pages'] == result['page_count'] == 8
    assert result['uncertainty_notes'] == ['Clear or light blue material unresolved.']
    assert result['source_coverage'] == 'all_pages_processed'
    assert result['state'] == 'paused' and result['candidate_available']
    assert store.get(job['id']) == before


def test_assisted_alpha_structured_uncertainty_is_retained_and_displayed(preview):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    checkpoint = store.get(job['id'])['checkpoint']
    note = {'id': 'material-review', 'kind': 'color_ambiguity', 'alternatives': ['43', '47'],
            'reason': 'Transparent material identity is unresolved.', 'resolution': 'Compare with the actual bricks.'}
    checkpoint.update(artifact_kind='pdf_assisted_alpha_completion', uncertainty_notes=[note])
    with store.connect() as con:
        con.execute('UPDATE engine_jobs SET config=?,checkpoint=? WHERE id=?',
                    (json.dumps({'quality_profile': 'alpha', 'generation_mode': 'alpha_fast',
                                 'artifact_kind': 'automatic_approximate_alpha'}), json.dumps(checkpoint), job['id']))
    before = store.get(job['id'])
    result = client.get('/api/v1/engine-preview').json()
    assert result['artifact_kind'] == 'pdf_assisted_alpha_completion'
    assert result['uncertainty_details'] == [note]
    assert result['uncertainty_notes'] == ['Transparent material identity is unresolved. Compare with the actual bricks.']
    assert store.get(job['id']) == before


@pytest.mark.parametrize('identifiers', [[], ['bad'], [['nested']], ['a'*32, 'a'*32], ['a'*32]*101])
def test_campaign_rejects_invalid_explicit_selection(preview, identifiers):
    from guide2build.engine.preview import create_campaign_preview_app
    client, store, job, directory, scene, frontend = preview
    with pytest.raises(ValueError):
        create_campaign_preview_app(store.data_dir, identifiers, frontend)


def test_campaign_rejects_two_candidates_for_the_same_booklet(preview):
    from guide2build.engine.preview import create_campaign_preview_app
    client, store, job, directory, scene, frontend = preview
    other = store.enqueue('30669', 'alt-02', {'revision': 'ambiguous-selection'})
    with pytest.raises(ValueError, match='at most one candidate per set and guide'):
        create_campaign_preview_app(store.data_dir, [job['id'], other['id']], frontend)


def test_source_verification_cache_detects_same_size_changed_bytes(preview):
    import os
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    assert client.get('/api/v1/engine-preview').json()['candidate_available']
    pdf = store.data_dir / 'sources/30669/alt-02/source.pdf'
    original_stat = pdf.stat()
    data = pdf.read_bytes()
    pdf.write_bytes(data[:-1] + (b'X' if data[-1:] != b'X' else b'Y'))
    os.utime(pdf, ns=(original_stat.st_atime_ns, original_stat.st_mtime_ns))
    assert not client.get('/api/v1/engine-preview').json()['candidate_available']


@pytest.mark.parametrize('filename', ['source.pdf', 'source.receipt.json'])
def test_source_verification_rejects_symlinks_even_after_cache_hit(preview, filename):
    client, store, job, directory, scene, frontend = preview
    install_candidate(preview)
    assert client.get('/api/v1/engine-preview').json()['candidate_available']
    target = store.data_dir / 'sources/30669/alt-02' / filename
    outside = frontend / filename
    outside.write_bytes(target.read_bytes())
    target.unlink()
    target.symlink_to(outside)
    assert not client.get('/api/v1/engine-preview').json()['candidate_available']
