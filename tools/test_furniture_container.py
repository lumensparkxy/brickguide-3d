"""Bounded loopback release smoke checks; never emit bodies, credentials or source assets."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import subprocess
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler, ProxyHandler

ARTICLES = ('30449908', '80104268', '70319028')
MAX_RESPONSE_BYTES = 16 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_base(base: str) -> str:
    parsed = urlsplit(base)
    if (parsed.scheme != 'http' or parsed.hostname != '127.0.0.1' or parsed.username or parsed.password
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment or not parsed.port):
        raise ValueError('A literal loopback HTTP origin with an explicit port is required')
    return base.rstrip('/')


def fetch(base: str, path: str, method: str = 'GET') -> tuple[int, dict, bytes]:
    opener = build_opener(NoRedirect(), ProxyHandler({}))
    request = Request(base + path, method=method, data=b'{}' if method == 'POST' else None,
                      headers={'Content-Type': 'application/json'} if method == 'POST' else {})
    try:
        response = opener.open(request, timeout=15)
    except HTTPError as exc:
        response = exc
    with response:
        body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            raise ValueError('Response exceeds smoke-check limit')
        return response.code, {key.lower(): value for key, value in response.headers.items()}, body


def http_checks(base: str, request=fetch) -> list[dict]:
    base = validate_base(base)
    checks = []

    def check(name, passed):
        checks.append({'check': name, 'passed': bool(passed)})

    code, headers, body = request(base, '/ikea')
    check('frontend', code == 200 and b'id="root"' in body)
    check('security_headers', headers.get('x-content-type-options') == 'nosniff'
          and headers.get('x-frame-options') == 'DENY'
          and headers.get('referrer-policy') == 'no-referrer'
          and 'microphone=()' in headers.get('permissions-policy', '')
          and "frame-ancestors 'none'" in headers.get('content-security-policy', '')
          and "script-src 'self'" in headers.get('content-security-policy', ''))
    for article in ARTICLES:
        code, _, body = request(base, f'/api/v1/furniture/health?article_number={article}')
        health = json.loads(body)
        check(f'health_{article}', code == 200 and health.get('status') == 'ready'
              and bool(health.get('documents')) and all(d.get('ready') is True for d in health['documents']))
        code, _, body = request(base, f'/api/v1/furniture/products/{article}/tutorial')
        tutorial = json.loads(body)
        check(f'tutorial_{article}', code == 200 and tutorial.get('product', {}).get('article_number') == article
              and len(tutorial.get('coach_actions', [])) == 11 and bool(tutorial.get('revision'))
              and tutorial.get('review', {}).get('human_review') == 'not_run'
              and tutorial.get('review', {}).get('physical_build') == 'not_run')
        source = tutorial.get('coach_actions', [{}])[0].get('source', {})
        doc = source.get('document_id')
        page = source.get('page_index')
        if not isinstance(doc, str) or not re.fullmatch(r'AA-[0-9]+-[0-9]+', doc) or not isinstance(page, int) or page < 0:
            check(f'diagram_{article}', False)
            continue
        code, headers, body = request(base, f'/api/v1/furniture/documents/{doc}/pages/{page}?article_number={article}')
        check(f'diagram_{article}', code == 200 and headers.get('content-type', '').startswith('image/png')
              and body.startswith(b'\x89PNG\r\n\x1a\n'))
    for path, kind in [('/images/favicon.svg', 'image/svg+xml'), ('/images/nandi/expressions.png', 'image/png')]:
        code, headers, body = request(base, path)
        check('static_' + path.rsplit('/', 1)[1], code == 200 and bool(body)
              and headers.get('content-type', '').startswith(kind))
    code, _, body = request(base, '/api/v1/furniture/voice/status')
    check('voice_disabled', code == 200 and json.loads(body) == {'configured': False, 'reason': 'disabled_for_release'})
    for path in ('/api/v1/sets', '/api/v1/jobs', '/openapi.json', '/docs', '/lego', '/.env'):
        code, _, _ = request(base, path)
        check('absent_' + path, code == 404)
    code, _, _ = request(base, '/api/v1/furniture/voice/session', 'POST')
    check('voice_session_absent', code == 404)
    return checks


def container_checks(container: str, expected_image: str | None = None) -> list[dict]:
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', container):
        raise ValueError('Invalid container identifier')
    # Select fields explicitly: Config.Env and other potentially sensitive fields never leave Docker.
    fields = {'user': '.Config.User', 'readonly': '.HostConfig.ReadonlyRootfs',
              'privileged': '.HostConfig.Privileged', 'caps': '.HostConfig.CapDrop',
              'memory': '.HostConfig.Memory', 'security': '.HostConfig.SecurityOpt',
              'running': '.State.Running', 'image': '.Image', 'ports': '.HostConfig.PortBindings'}
    template = '{' + ','.join(json.dumps(key) + ':{{json ' + field + '}}' for key, field in fields.items()) + '}'
    result = subprocess.run(['docker', 'inspect', '--type', 'container', '--format', template, container],
                            capture_output=True, text=True, timeout=20, check=True)
    data = json.loads(result.stdout)
    return inspect_checks(data, expected_image)


def inspect_checks(data: dict, expected_image: str | None = None) -> list[dict]:
    checks = {
        'container_running': data.get('running') is True,
        'container_nonroot': data.get('user') not in (None, '', '0', 'root') and str(data.get('user')).split(':')[0] not in ('0', 'root'),
        'container_readonly': data.get('readonly') is True,
        'container_unprivileged': data.get('privileged') is False,
        'container_capabilities_dropped': 'ALL' in (data.get('caps') or []),
        'container_memory_bounded': isinstance(data.get('memory'), int) and 0 < data['memory'] <= 1024 ** 3,
        'container_no_new_privileges': any(s in ('no-new-privileges', 'no-new-privileges:true') for s in (data.get('security') or [])),
        'container_loopback_ports': bool(data.get('ports')) and all(bindings and all(b.get('HostIp') == '127.0.0.1' for b in bindings) for bindings in data.get('ports', {}).values()),
        'container_immutable_image': bool(re.fullmatch(r'sha256:[a-f0-9]{64}', str(data.get('image', '')))),
    }
    if expected_image is not None:
        checks['container_expected_image'] = bool(re.fullmatch(r'sha256:[a-f0-9]{64}', expected_image)) and data.get('image') == expected_image
    return [{'check': name, 'passed': bool(passed)} for name, passed in checks.items()]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8088')
    parser.add_argument('--container')
    parser.add_argument('--expected-image')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    checks = []
    try:
        checks = http_checks(args.base_url)
        if args.container:
            checks.extend(container_checks(args.container, args.expected_image))
        elif args.expected_image:
            raise ValueError('Expected image requires container inspection')
    except Exception:
        # Deliberately suppress response bodies, subprocess output, exception strings and URL data.
        checks.append({'check': 'smoke_execution', 'passed': False})
    passed = bool(checks) and all(item['passed'] for item in checks)
    report = {'status': 'passed' if passed else 'failed', 'checks': checks,
              'container_inspected': bool(args.container), 'deployment_performed': False}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'checks': len(checks)}))
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
