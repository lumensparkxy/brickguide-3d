"""Deployment safety checks do not contact Google or simulate a successful deployment."""
import importlib.util
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('cloud_tool', ROOT / 'tools/cloud.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)


def test_database_role_is_scoped_and_never_default(monkeypatch):
    calls = []
    monkeypatch.setattr(cloud, 'gcloud', lambda *args, **kwargs: calls.append(args))
    cloud.project_role('serviceAccount:portal', 'roles/datastore.viewer', cloud.CFG['database'])
    cloud.project_role('serviceAccount:portal', 'roles/datastore.user', cloud.CFG['request_database'])
    assert len(calls) == 2
    assert '/databases/guide2build"' in calls[0][-1]
    assert '/databases/guide2build-requests"' in calls[1][-1]
    assert all('(default)' not in str(call) for call in calls)


def test_account_gate_rejects_other_account(monkeypatch):
    monkeypatch.setattr(cloud, 'gcloud', lambda *a, **k: [{'account': 'someone@example.org', 'status': 'ACTIVE'}])
    with pytest.raises(RuntimeError, match='Sign in'):
        cloud.account_gate()


def test_rollback_restores_recorded_revision_without_deleting(monkeypatch, tmp_path):
    import json
    monkeypatch.setattr(cloud, 'EVIDENCE', tmp_path)
    monkeypatch.setattr(cloud, 'account_gate', lambda: None)
    calls = []
    monkeypatch.setattr(cloud, 'gcloud', lambda *a, **k: calls.append(a) or {})
    path = tmp_path / (cloud.CFG['public_service'] + '-before.json')
    path.write_text(json.dumps({'status': {'traffic': [{'revisionName': 'guide2build-web-00001', 'percent': 100}]}}))
    cloud.rollback()
    assert '--to-revisions=guide2build-web-00001=100' in calls[0]
    assert 'delete' not in calls[0]


def test_container_uses_public_entrypoint_and_excludes_var():
    docker = (ROOT / 'Dockerfile').read_text()
    assert 'guide2build.public:app' in docker
    assert 'guide2build.main:app' not in docker
    assert 'USER 10001' in docker
    for filename in ('.dockerignore', '.gcloudignore'):
        text = (ROOT / filename).read_text()
        assert text.startswith('**\n')
        assert '!var' not in text
        assert '!config/**' not in text


def test_absent_new_cloud_run_service_is_resumable(monkeypatch):
    from types import SimpleNamespace
    result = SimpleNamespace(returncode=1, stdout='',
        stderr='ERROR: (gcloud.run.services.describe) Cannot find service [guide2build-preview]')
    monkeypatch.setattr(cloud.subprocess, 'run', lambda *a, **k: result)
    assert cloud.gcloud('run', 'services', 'describe', 'guide2build-preview', check=False) is None
    with pytest.raises(RuntimeError):
        cloud.gcloud('run', 'services', 'describe', 'guide2build-preview')


def test_permission_denial_is_not_treated_as_missing_service(monkeypatch):
    from types import SimpleNamespace
    result = SimpleNamespace(returncode=1, stdout='', stderr='PERMISSION_DENIED: access denied')
    monkeypatch.setattr(cloud.subprocess, 'run', lambda *a, **k: result)
    with pytest.raises(RuntimeError, match='PERMISSION_DENIED'):
        cloud.gcloud('run', 'services', 'describe', 'guide2build-preview', check=False)
