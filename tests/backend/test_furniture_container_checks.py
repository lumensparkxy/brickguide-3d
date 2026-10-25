"""Container checks fail on misleading successful bodies and unsafe runtime settings."""
import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('furniture_container_checks', ROOT / 'tools/test_furniture_container.py')
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)


def response(base, path, method='GET'):
    if path == '/ikea':
        return 200, {'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
                     'referrer-policy': 'no-referrer', 'permissions-policy': 'microphone=()',
                     'content-security-policy': "script-src 'self'; frame-ancestors 'none'"}, b'<div id="root"></div>'
    if path.startswith('/api/v1/furniture/health'):
        return 200, {}, json.dumps({'status': 'ready', 'documents': [{'ready': True}]}).encode()
    if path.endswith('/tutorial'):
        article = path.split('/')[-2]
        body = {'product': {'article_number': article}, 'revision': 'test-revision',
                'review': {'human_review': 'not_run', 'physical_build': 'not_run'},
                'coach_actions': [{'source': {'document_id': 'AA-2606170-1', 'page_index': 0}}] * 11}
        return 200, {}, json.dumps(body).encode()
    if '/pages/' in path or path.endswith('.png'):
        return 200, {'content-type': 'image/png'}, b'\x89PNG\r\n\x1a\nfixture'
    if path.endswith('.svg'):
        return 200, {'content-type': 'image/svg+xml'}, b'<svg/>'
    if path.endswith('/voice/status'):
        return 200, {}, b'{"configured":false,"reason":"disabled_for_release"}'
    return 404, {}, b'not found'


def test_complete_http_contract():
    result = checks.http_checks('http://127.0.0.1:8088', response)
    assert len(result) >= 20
    assert all(item['passed'] for item in result)


@pytest.mark.parametrize('base', ['https://example.com', 'http://localhost:8088',
                                 'http://127.0.0.1:8088/path', 'http://user:secret@127.0.0.1:8088',
                                 'http://127.0.0.1:8088?token=secret'])
def test_rejects_nonlocal_or_credentialed_targets(base):
    with pytest.raises(ValueError):
        checks.http_checks(base, response)


def test_good_body_with_failed_status_does_not_pass():
    def failed_health(base, path, method='GET'):
        code, headers, body = response(base, path, method)
        return (503 if '/health' in path else code), headers, body
    result = checks.http_checks('http://127.0.0.1:8088', failed_health)
    assert all(not item['passed'] for item in result if item['check'].startswith('health_'))


def test_missing_security_header_and_exposed_voice_fail():
    def unsafe(base, path, method='GET'):
        code, headers, body = response(base, path, method)
        if path == '/ikea':
            headers.pop('content-security-policy')
        if path.endswith('/voice/session'):
            code = 200
        return code, headers, body
    results = {item['check']: item['passed'] for item in checks.http_checks('http://127.0.0.1:8088', unsafe)}
    assert not results['security_headers']
    assert not results['voice_session_absent']


def safe_container():
    return {'user': '10001', 'readonly': True, 'privileged': False, 'caps': ['ALL'],
            'memory': 512 * 1024 * 1024, 'security': ['no-new-privileges:true'], 'running': True,
            'image': 'sha256:' + 'a' * 64, 'ports': {'8080/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '8088'}]}}


def test_safe_container_and_expected_image():
    assert all(item['passed'] for item in checks.inspect_checks(safe_container(), 'sha256:' + 'a' * 64))
    assert not checks.inspect_checks(safe_container(), 'sha256:' + 'b' * 64)[-1]['passed']


@pytest.mark.parametrize('field,value,failed_name', [
    ('user', '0:10001', 'container_nonroot'),
    ('readonly', False, 'container_readonly'),
    ('privileged', True, 'container_unprivileged'),
    ('caps', [], 'container_capabilities_dropped'),
    ('memory', 0, 'container_memory_bounded'),
    ('security', [], 'container_no_new_privileges'),
    ('ports', {'8080/tcp': [{'HostIp': '0.0.0.0'}]}, 'container_loopback_ports'),
    ('image', 'furniture:latest', 'container_immutable_image'),
])
def test_unsafe_container_fails(field, value, failed_name):
    data = safe_container()
    data[field] = value
    result = {item['check']: item['passed'] for item in checks.inspect_checks(data)}
    assert not result[failed_name]


def test_cli_failure_summary_never_contains_exception_or_response_body(tmp_path, monkeypatch, capsys):
    output = tmp_path / 'checks.json'
    monkeypatch.setattr(checks, 'http_checks', lambda *args: (_ for _ in ()).throw(ValueError('sensitive-response-body')))
    monkeypatch.setattr('sys.argv', ['test_furniture_container.py', '--output', str(output)])
    assert checks.main() == 1
    assert json.loads(output.read_text())['status'] == 'failed'
    assert 'sensitive-response-body' not in output.read_text() + capsys.readouterr().out
