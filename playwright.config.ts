import { defineConfig, devices } from '@playwright/test';

/** Tests use a real local API/database and an explicitly injected test gateway.
 * They do not certify external sandbox or AWS availability. */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 8000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 10000,
  },
  webServer: {
    command: 'npm run dev --workspace apps/web -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    env: { API_PROXY_TARGET: 'http://127.0.0.1:3002' },
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    { name: 'api-independent', testMatch: /api-security\.spec\.ts/ },
    { name: 'chromium-desktop', testMatch: /checkout\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'chromium-se', testMatch: /checkout\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } } },
    { name: 'firefox-desktop', testMatch: /checkout\.spec\.ts/, use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit-desktop', testMatch: /checkout\.spec\.ts/, use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
  ],
});
