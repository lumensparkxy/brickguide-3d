"""Local voice broker: mocked upstream only, never incurs API usage."""
import json
import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from guide2build.furniture import voice, catalog
from guide2build.furniture.api import create_router

ORIGIN = 'http://127.0.0.1:5173'
TOKEN = 'auth_tokens/synthetic-test-token'


@pytest.fixture
def web(tmp_path, monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'synthetic-test-secret')
    monkeypatch.delenv('K_SERVICE', raising=False)
    monkeypatch.delenv('WEBSITE_INSTANCE_ID', raising=False)
    monkeypatch.setattr(voice, 'BUDGET', voice.SessionBudget())
    monkeypatch.setattr(voice, 'source_health', lambda cache, article_number="30449908": {'status': 'ready'})
    app = FastAPI()
    app.include_router(create_router(tmp_path))
    with TestClient(app, base_url='http://127.0.0.1:8000', client=('127.0.0.1', 50000)) as client:
        yield client


def payload(**edits):
    return dict(action_id='screw-1', revision=catalog.tutorial().revision, **edits)


def test_session_server_grounding_and_no_secret(web, monkeypatch):
    captured = []
    async def exchange(config, key):
        captured.append(config)
        assert key == 'synthetic-test-secret'
        return TOKEN
    monkeypatch.setattr(voice, 'create_token', exchange)
    response = web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=payload())
    assert response.status_code == 200
    assert response.json()['token'] == TOKEN
    assert 'synthetic-test-secret' not in response.text
    assert captured[0]['model'] == 'models/gemini-3.8-live'
    assert captured[0]['generationConfig']['maxOutputTokens'] == 2048
    assert captured[0]['tools'][0]['functionDeclarations'][0]['name'] == 'portal_control'
    assert 'Never invent torque' in captured[0]['systemInstruction']['parts'][0]['text']
    assert 'final-checks' in captured[0]['systemInstruction']['parts'][0]['text']
    assert web.get('/api/v1/furniture/voice/status').json() == {'configured': True, 'provider': 'gemini', 'model': voice.MODEL}


@pytest.mark.parametrize('origin', [None, 'null', 'https://evil.test', 'http://127.0.0.1:5173.evil.test'])
def test_untrusted_origin_rejected(web, origin):
    headers = {'Origin': origin} if origin else {}
    assert web.post('/api/v1/furniture/voice/session', headers=headers, json=payload()).status_code == 403


def test_peer_host_and_public_runtime_rejected(web, tmp_path):
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN, 'Host': 'evil.test'}, json=payload()).status_code == 403
    web.app.title = 'Furniture Assembly Assistant'
    assert web.get('/api/v1/furniture/voice/status').status_code == 403
    app = FastAPI()
    app.include_router(create_router(tmp_path))
    with TestClient(app, base_url='http://127.0.0.1:8000', client=('203.0.113.1', 1000)) as remote:
        assert remote.get('/api/v1/furniture/voice/status').status_code == 403


def test_missing_key_source_and_stale_revision(web, monkeypatch):
    data = payload()
    data['revision'] = 'old'
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=data).status_code == 409
    monkeypatch.delenv('GEMINI_API_KEY')
    assert web.get('/api/v1/furniture/voice/status').json() == {'configured': False, 'provider': 'gemini', 'model': voice.MODEL}
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=payload()).status_code == 503
    monkeypatch.setenv('GEMINI_API_KEY', 'synthetic')
    monkeypatch.setattr(voice, 'source_health', lambda cache, article_number="30449908": {'status': 'unavailable'})
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=payload()).status_code == 503


def test_payload_bounded_and_safe_validation(web):
    data = payload()
    data['sdp'] = 'private-offer'
    response = web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=data)
    assert response.status_code == 422
    assert 'private-offer' not in response.text
    data['sdp'] = 'x' * 71000
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=data).status_code == 413


def test_upstream_failure_safe_and_attempt_budget(web, monkeypatch):
    async def fail(*args):
        raise httpx.ConnectError('secret-provider-body')
    monkeypatch.setattr(voice, 'create_token', fail)
    for _ in range(5):
        response = web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=payload())
        assert response.status_code == 502
        assert 'secret-provider-body' not in response.text
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=payload()).status_code == 429
    budget = voice.SessionBudget()
    budget.total = 30
    with pytest.raises(Exception) as error:
        budget.reserve()
    assert error.value.status_code == 429



@pytest.mark.parametrize('status,content_type,body,valid', [
    (200, 'application/json', json.dumps({'name': TOKEN}).encode(), True),
    (302, 'application/json', json.dumps({'name': TOKEN}).encode(), False),
    (401, 'application/json', b'{"error":{"message":"private"}}', False),
    (200, 'text/html', b'bad', False),
    (200, 'application/json', b'{"name":"invalid"}', False),
    (200, 'application/json', b'[]', False),
    (200, 'application/json', b'x' * 32001, False),
])
def test_token_validates_upstream(monkeypatch, status, content_type, body, valid):
    import asyncio
    from datetime import datetime
    original = httpx.AsyncClient
    setup = voice.session_config('screw-1')
    def handler(request):
        assert str(request.url) == voice.UPSTREAM
        assert request.headers['x-goog-api-key'] == 'synthetic'
        data = json.loads(request.content)
        assert data['uses'] == 1
        assert data['bidiGenerateContentSetup'] == setup
        assert 'fieldMask' not in data
        expire = datetime.fromisoformat(data['expireTime'].replace('Z', '+00:00'))
        new_session = datetime.fromisoformat(data['newSessionExpireTime'].replace('Z', '+00:00'))
        assert (expire - new_session).total_seconds() == 1800
        return httpx.Response(status, headers={'content-type': content_type}, content=body)
    monkeypatch.setattr(voice.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    if valid:
        assert asyncio.run(voice.create_token(setup, 'synthetic')) == TOKEN
    else:
        with pytest.raises(ValueError):
            asyncio.run(voice.create_token(setup, 'synthetic'))


def test_gemini_has_no_openai_fallback(web, monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY')
    monkeypatch.setenv('OPENAI_API_KEY', 'unused-synthetic')
    assert web.get('/api/v1/furniture/voice/status').json()['configured'] is False
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin': ORIGIN}, json=payload()).status_code == 503


def test_provider_errors_code_only(monkeypatch, caplog):
    import asyncio
    original = httpx.AsyncClient
    def handler(request):
        return httpx.Response(429, headers={'content-type': 'application/json'},
                              json={'error': {'status': 'RESOURCE_EXHAUSTED', 'message': 'secret-provider-detail'}})
    monkeypatch.setattr(voice.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    with pytest.raises(voice.VoiceCreditsUnavailable):
        asyncio.run(voice.create_token({}, 'synthetic'))
    assert 'RESOURCE_EXHAUSTED' in caplog.text
    assert 'secret-provider-detail' not in caplog.text


def test_portal_tool_is_bounded_and_records_only_explicit_user_progress():
    setup = voice.session_config('screw-1')
    assert len(setup['tools']) == 1
    declarations = setup['tools'][0]['functionDeclarations']
    assert len(declarations) == 2
    tool = declarations[0]
    assert tool['name'] == 'portal_control'
    parameters = tool['parameters']
    assert set(parameters['properties']) == {'command', 'step', 'legs', 'user_statement', 'advance', 'action_id', 'checked'}
    assert parameters['required'] == ['command']
    assert parameters['properties']['command']['enum'] == [
        'go_to_step', 'next', 'previous', 'play', 'pause', 'replay',
        'whole_table', 'look_closer', 'official_diagram', 'close_panel', 'get_context',
        'report_completed_legs', 'set_checklist', 'confirm_current',
        'hands_free_start', 'hands_free_pause', 'hands_free_resume', 'hands_free_stop', 'end_conversation']
    assert parameters['properties']['step']['type'] == 'INTEGER'
    assert parameters['properties']['step']['minimum'] == 1
    assert parameters['properties']['step']['maximum'] == 11
    prompt = setup['systemInstruction']['parts'][0]['text']
    assert 'Wait for the actual tool success result' in prompt
    assert 'Step 3: screw-1' in prompt
    assert 'Step 11: final-checks' in prompt
    assert 'Bare \'next\' is navigation only.' in prompt
    assert 'There are four legs; three completed legs never means the whole table is done.' in prompt
    assert 'screw-4, visible step 9' in prompt
    assert 'I completed all 3 legs, move next' in prompt
    assert 'Recorded legs 1–3; one leg remains' in prompt
    assert 'unless the conversation establishes a different nonsequential set' in prompt
    assert 'must never automatically check all final checks or confirm final assembly.' in prompt
    assert 'never fabricate a statement' in prompt
    assert 'confirmation_recorded:false, explicitly say the action was not confirmed, even when ok:true' in prompt
    assert 'Never describe that corrective navigation as completion.' in prompt
    properties = parameters['properties']
    assert properties['legs']['items'] == {'type': 'INTEGER', 'minimum': 1, 'maximum': 4}
    assert properties['legs']['minItems'] == 1 and properties['legs']['maxItems'] == 4
    assert 'unique' in properties['legs']['description']
    assert properties['user_statement']['minLength'] == 1
    assert properties['user_statement']['maxLength'] == 500
    assert properties['checked']['type'] == properties['advance']['type'] == 'BOOLEAN'
    assert properties['action_id']['enum'] == [a.id for a in catalog.tutorial().coach_actions]
    assert 'never a prescribed physical turn count or torque' in prompt
    request = voice.token_request(setup)
    assert request['bidiGenerateContentSetup'] == setup
    assert 'fieldMask' not in request


def test_hands_free_requires_opt_in_and_explicit_contextual_done():
    setup = voice.session_config('prepare')
    tool = setup['tools'][0]['functionDeclarations'][1]
    assert tool['name'] == 'hands_free_done'
    assert tool['parameters']['properties']['checks_confirmed']['type'] == 'BOOLEAN'
    assert set(tool['parameters']['properties']) == {'action_id', 'user_statement', 'checks_confirmed'}
    assert tool['parameters']['required'] == ['action_id', 'user_statement', 'checks_confirmed']
    assert tool['parameters']['properties']['user_statement']['minLength'] == 1
    assert tool['parameters']['properties']['user_statement']['maxLength'] == 500
    assert tool['parameters']['properties']['action_id']['enum'] == [a.id for a in catalog.tutorial().coach_actions]
    prompt = setup['systemInstruction']['parts'][0]['text']
    for boundary in [
        'Hands-free coaching is opt-in', 'mode (active, paused or off)',
        'hands_free_done MUST include all three required arguments exactly, no command argument',
        'separate hands_free_done function, NOT portal_control',
        'NEVER omit applicable warnings or checklist items',
        '80 spoken words or fewer',
        'use end_conversation with no other arguments',
        'guided mode off and leaves normal conversation active',
        'Set checks_confirmed true only after you have explicitly read ALL current checks',
        'For an action without checks use false',
        'Never auto-advance after speaking, animation ending, audio ending or silence',
        'never calculate the next action by incrementing a remembered step',
        '30-minute client session cap', 'never promise an unlimited call',
        'not that physical assembly was verified',
    ]:
        assert boundary in prompt
    request = voice.token_request(setup)
    assert request['bidiGenerateContentSetup']['tools'] == setup['tools']


def test_native_audio_budget_and_complete_done_call_example():
    setup = voice.session_config('prepare')
    assert setup['generationConfig']['maxOutputTokens'] == 2048
    prompt = setup['systemInstruction']['parts'][0]['text']
    example = {'action_id': 'screw-1',
               'user_statement': 'Done', 'checks_confirmed': False}
    assert json.dumps(example, separators=(',', ':')) in prompt
    assert 'checks_confirmed:true requires contextual confirmation of all checks already read aloud' in prompt


def test_voice_offer_binds_selected_variant_and_revision(web, monkeypatch):
    captured = []
    health_articles = []
    async def token(config, key):
        captured.append(config)
        return TOKEN
    monkeypatch.setattr(voice, 'create_token', token)
    monkeypatch.setattr(voice, 'source_health', lambda cache, article_number: health_articles.append(article_number) or {'status':'ready'})
    offer = dict(article_number='70319028', action_id='final-checks', revision=catalog.tutorial('70319028').revision)
    response = web.post('/api/v1/furniture/voice/session', headers={'Origin':ORIGIN}, json=offer)
    assert response.status_code == 200
    instructions = captured[0]['systemInstruction']['parts'][0]['text']
    assert '70319028' in instructions and 'mild cleaner' in instructions
    assert '30449908' not in instructions
    assert health_articles == ['70319028']
    offer['revision'] = catalog.tutorial().revision
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin':ORIGIN}, json=offer).status_code == 409
    offer['article_number'] = '11111111'
    assert web.post('/api/v1/furniture/voice/session', headers={'Origin':ORIGIN}, json=offer).status_code == 404
    assert len(captured) == 1
