import {defineConfig} from '@playwright/test';

// CI supplies an already-running container; local runs start the built native service.
const containerMode = process.env.FURNITURE_CONTAINER_TEST === '1';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    '**/furniture-production.spec.ts', '**/furniture.spec.ts',
    '**/furniture-animation.spec.ts', '**/furniture-autoplay.spec.ts',
    '**/furniture-finishes.spec.ts', '**/furniture-full-assembly.spec.ts',
    '**/furniture-workspace.spec.ts',
  ],
  workers: 1,
  use: {baseURL: 'http://127.0.0.1:8088', trace: 'retain-on-failure'},
  outputDir: 'var/evidence/production-hardening/browser-results',
  webServer: containerMode ? undefined : {
    command: 'PYTHONPATH=apps/api/src .venv/bin/python -m uvicorn guide2build.furniture.public:app --host 127.0.0.1 --port 8088 --no-access-log --no-proxy-headers',
    url: 'http://127.0.0.1:8088/api/v1/furniture/health',
    reuseExistingServer: false,
  },
});
