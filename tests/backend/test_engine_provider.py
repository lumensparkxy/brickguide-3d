"""Original stub CLI tests; no network, model invocation, or authentication."""
import io
import json
from pathlib import Path
import sys
from types import SimpleNamespace

import pytest

from guide2build.engine.provider import CodexProvider, ProviderFailure


def test_default_inference_can_finish_after_the_old_five_minute_deadline(tmp_path, monkeypatch):
    import guide2build.engine.provider as provider_module

    class StubProcess:
        def __init__(self, args, **kwargs):
            self.stdin = io.StringIO()
            self.returncode = None
            self.poll_count = 0
            Path(args[args.index('--output-last-message') + 1]).write_text('{}')

        def poll(self):
            self.poll_count += 1
            if self.poll_count > 1:
                self.returncode = 0
            return self.returncode

    clock = iter([0, 301, 301, 301])
    monkeypatch.setattr(provider_module, 'time', SimpleNamespace(
        monotonic=lambda: next(clock), sleep=lambda seconds: None))
    monkeypatch.setattr(provider_module.subprocess, 'Popen', StubProcess)
    evidence = tmp_path / 'evidence'
    assert CodexProvider(executable='synthetic-codex').call(
        'Original synthetic long inference', [], {'type': 'object'}, evidence) == {}
    requested = json.loads((evidence / 'request-runtime.json').read_text())
    result = json.loads((evidence / 'process-result.json').read_text())
    assert requested['timeout_seconds'] == 900
    assert result['elapsed_seconds'] == 301 and result['returncode'] == 0


def test_schema_rejection_is_an_engine_error_not_provider_outage(tmp_path):
    stub = tmp_path / 'codex-stub'
    diagnostic = {'type': 'turn.failed', 'error': {'message': 'invalid_json_schema: array schema missing items'}}
    stub.write_text(f'#!{sys.executable}\nimport sys\nprint({json.dumps(json.dumps(diagnostic))})\nsys.exit(1)\n')
    stub.chmod(0o700)
    with pytest.raises(ProviderFailure) as error:
        CodexProvider(executable=str(stub)).call('Synthetic invocation', [], {'type': 'object'}, tmp_path / 'evidence')
    assert error.value.code == 'invalid_schema'
    assert json.loads((tmp_path / 'evidence/invocation.json').read_text())['paid_api_fallback'] is False


def test_unsupported_subscription_model_is_a_configuration_error(tmp_path):
    stub = tmp_path / 'codex-stub'
    diagnostic = {'type': 'turn.failed', 'error': {'message':
        "The 'synthetic-unavailable-model' model is not supported when using Codex with a ChatGPT account."}}
    stub.write_text(f'#!{sys.executable}\nimport sys\nprint({json.dumps(json.dumps(diagnostic))})\nsys.exit(1)\n')
    stub.chmod(0o700)
    with pytest.raises(ProviderFailure) as failure:
        CodexProvider(executable=str(stub)).call('Original synthetic model error', [], {'type': 'object'}, tmp_path / 'evidence')
    assert failure.value.code == 'unsupported_model'


def test_explicit_alpha_reasoning_is_loaded_and_recorded_without_tools(tmp_path):
    stub = tmp_path / 'codex-stub'
    stub.write_text(f'#!{sys.executable}\nimport json,sys\nfrom pathlib import Path\n'
        'args=sys.argv[1:]\nassert \'model_reasoning_effort="medium"\' in args\n'
        'assert \'approval_policy="never"\' in args\n'
        'Path(args[args.index("--output-last-message")+1]).write_text("{}")\n')
    stub.chmod(0o700)
    provider = CodexProvider(executable=str(stub), reasoning='medium')
    assert provider.call('Original synthetic invocation', [], {'type': 'object'}, tmp_path / 'evidence') == {}
    receipt = json.loads((tmp_path / 'evidence/invocation.json').read_text())
    assert receipt['reasoning'] == 'medium' and receipt['tools_disabled'] is True
    assert receipt['paid_api_fallback'] is False
    with pytest.raises(ValueError, match='reasoning'):
        CodexProvider(executable=str(stub), reasoning='medium; arbitrary')


def test_timeout_retains_runtime_and_actual_child_termination_evidence(tmp_path):
    stub = tmp_path / 'codex-stub'
    stub.write_text(f'#!{sys.executable}\nimport time\ntime.sleep(30)\n')
    stub.chmod(0o700)
    evidence = tmp_path / 'evidence'
    with pytest.raises(ProviderFailure) as failure:
        CodexProvider(model='gpt-6.1-sol', reasoning='low', timeout=.05, executable=str(stub)).call(
            'Original synthetic timeout invocation', [], {'type': 'object'}, evidence)
    assert failure.value.code == 'provider_timeout'
    requested = json.loads((evidence / 'request-runtime.json').read_text())
    result = json.loads((evidence / 'process-result.json').read_text())
    assert requested['model'] == result['model'] == 'gpt-6.1-sol'
    assert requested['reasoning'] == result['reasoning'] == 'low'
    assert requested['timeout_seconds'] == .05
    assert requested['auth'] == 'chatgpt' and requested['paid_api_fallback'] is False
    assert result['returncode'] < 0 and result['elapsed_seconds'] >= .05
    assert result['structured_result_present'] is False and result['completion_or_accuracy_claim'] is False
