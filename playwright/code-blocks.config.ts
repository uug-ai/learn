import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './site-tests',
  testMatch: 'code-blocks.spec.ts',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4179',
    headless: true,
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'hugo server --source ../app --buildDrafts --bind 127.0.0.1 --port 4179 --disableFastRender --renderToMemory',
    url: 'http://127.0.0.1:4179/docs/factory/installation-cloud/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
