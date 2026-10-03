"""Subscription-authenticated Codex CLI boundary. No paid API fallback or model tools."""
from __future__ import annotations
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time


class ProviderFailure(RuntimeError):
    def __init__(self, code, message):
        self.code = code
        super().__init__(message)


def child_environment(environ=None):
    source = os.environ if environ is None else environ
    # An allowlist avoids leaking new provider keys, Google ADC paths or cloud SDK config.
    allowed = ("HOME", "PATH", "TMPDIR", "LANG", "LC_ALL", "SSL_CERT_FILE", "SSL_CERT_DIR")
    return {key: source[key] for key in allowed if key in source}


class CodexProvider:
    def __init__(self, model="gpt-6-astra", timeout=300, executable=None):
        self.model = model
        self.timeout = timeout
        self.executable = executable or shutil.which("codex")
        if not self.executable:
            raise ProviderFailure("authentication_required", "Install/authenticate the local Codex CLI first")

    def call(self, prompt, images, schema, evidence: Path, check=lambda: None):
        if len(prompt.encode()) > 1_000_000:
            raise ProviderFailure("context_limit", "Proposal prompt exceeds 1 MB; partition the assembly before retry")
        evidence.mkdir(parents=True, exist_ok=True)
        # Isolated cwd prevents repository instructions or authored coordinates entering a fresh run.
        with tempfile.TemporaryDirectory(prefix="guide2build-codex-") as temp:
            work = Path(temp)
            schema_file = work / "response.schema.json"
            schema_file.write_text(json.dumps(schema))
            result_file = work / "response.json"
            args = [self.executable, "exec", "--ignore-user-config", "--ephemeral", "--skip-git-repo-check",
                    "--sandbox", "read-only", "--cd", str(work), "--model", self.model,
                    "--json", "--color", "never", "--output-schema", str(schema_file),
                    "--output-last-message", str(result_file), "-c", 'model_reasoning_effort="high"',
                    "-c", 'approval_policy="never"', "-c", 'web_search="disabled"',
                    "-c", 'forced_login_method="chatgpt"']
            for feature in ("shell_tool", "unified_exec", "apps", "plugins", "hooks", "multi_agent",
                            "browser_use", "computer_use", "view_image", "image_generation", "memories",
                            "code_mode", "code_mode_host", "workspace_dependencies", "skill_search"):
                args += ["--disable", feature]
            for index, image in enumerate(images):
                local = work / f"page-{index}.png"
                shutil.copyfile(image, local)
                args += ["--image", str(local)]
            args += ["-"]
            (evidence / "prompt.txt").write_text(prompt)
            (evidence / "schema.json").write_text(json.dumps(schema))
            started = time.monotonic()
            with (evidence / "events.jsonl").open("w") as events, (evidence / "stderr.txt").open("w") as errors:
                process = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=events, stderr=errors,
                                           cwd=work, env=child_environment(), text=True, start_new_session=True)
                try:
                    process.stdin.write(prompt)
                    process.stdin.close()
                    while process.poll() is None:
                        check()
                        if any(path.stat().st_size > 32_000_000 for path in
                               (evidence / "events.jsonl", evidence / "stderr.txt")):
                            raise ProviderFailure("invalid_output", "Provider event log exceeded 32 MB")
                        if time.monotonic() - started > self.timeout:
                            raise ProviderFailure("provider_timeout", "Codex call exceeded the bounded time limit")
                        time.sleep(0.2)
                finally:
                    if process.poll() is None:
                        import signal
                        os.killpg(process.pid, signal.SIGTERM)
                        try:
                            process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            os.killpg(process.pid, signal.SIGKILL)
                            process.wait()
            elapsed = time.monotonic() - started
            usage = {}
            for line in (evidence / "events.jsonl").read_text().splitlines():
                try:
                    event = json.loads(line)
                    if event.get("type") == "turn.completed" and isinstance(event.get("usage"), dict):
                        for key, value in event["usage"].items():
                            if isinstance(value, (int, float)) and value >= 0:
                                usage[key] = usage.get(key, 0) + value
                except (ValueError, TypeError):
                    continue
            (evidence / "invocation.json").write_text(json.dumps({"reported_usage": usage,"model": self.model, "elapsed_seconds": elapsed,
                "returncode": process.returncode, "auth": "chatgpt", "sandbox": "read-only",
                "tools_disabled": True, "paid_api_fallback": False}, indent=2))
            if process.returncode != 0 or not result_file.is_file():
                diagnostic = ((evidence / "stderr.txt").read_text() + (evidence / "events.jsonl").read_text()).lower()
                if any(term in diagnostic for term in ("usage limit", "quota", "rate limit", "429", "credits")):
                    code = "subscription_limit"
                elif any(term in diagnostic for term in ("unauthorized", "authentication", "login", "401", "token expired")):
                    code = "authentication_required"
                else:
                    code = "provider_unavailable"
                raise ProviderFailure(code, "Codex did not produce a structured result; inspect private invocation evidence")
            if result_file.stat().st_size > 20_000_000:
                raise ProviderFailure("invalid_output", "Model output exceeded 20 MB")
            raw = result_file.read_text()
            (evidence / "response.json").write_text(raw)
            try:
                value = json.loads(raw)
                from jsonschema import validate
                validate(value, schema)
            except Exception as error:
                raise ProviderFailure("invalid_output", "Codex returned invalid structured output") from error
            return value
