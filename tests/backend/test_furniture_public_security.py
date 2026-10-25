"""Release runtime boundaries independent of local voice configuration."""
from fastapi.testclient import TestClient
from guide2build.furniture.public import create_app


def test_release_never_registers_voice_session_even_with_credentials(tmp_path, monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only-not-a-real-key')
    with TestClient(create_app(tmp_path, tmp_path), client=('127.0.0.1', 1234),
                    base_url='http://127.0.0.1:8080') as client:
        assert client.get('/api/v1/furniture/voice/status').json() == {
            'configured': False, 'reason': 'disabled_for_release'}
        assert client.post('/api/v1/furniture/voice/session', json={}).status_code == 404
        for path in ['/openapi.json', '/docs', '/api/v1/jobs', '/api/v1/sets', '/lego']:
            assert client.get(path).status_code == 404


def test_static_images_served_without_exposing_outside_files(tmp_path):
    web = tmp_path / 'web'
    (web / 'images' / 'nandi').mkdir(parents=True)
    (web / 'index.html').write_text('<html>release</html>')
    (web / 'images' / 'nandi' / 'pet.png').write_bytes(b'image-fixture')
    secret = tmp_path / 'private.txt'
    secret.write_text('private-file')
    (web / 'images' / 'escape.txt').symlink_to(secret)
    with TestClient(create_app(tmp_path, web)) as client:
        response = client.get('/images/nandi/pet.png')
        assert response.status_code == 200
        assert response.content == b'image-fixture'
        for path in ['/images/escape.txt', '/images/%2e%2e/%2e%2e/private.txt', '/.env']:
            response = client.get(path)
            assert response.status_code == 404
            assert 'private-file' not in response.text
        for path in ['/ikea', '/unknown', '/api/v1/furniture/products']:
            response = client.get(path)
            assert response.headers['x-frame-options'] == 'DENY'
            assert 'microphone=()' in response.headers['permissions-policy']
            assert "frame-ancestors 'none'" in response.headers['content-security-policy']
            assert "script-src 'self'" in response.headers['content-security-policy']
