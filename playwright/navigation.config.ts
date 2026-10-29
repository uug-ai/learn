import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './site-tests',
  testMatch: 'navigation.spec.ts',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4178',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'hugo server --source ../app --bind 127.0.0.1 --port 4178 --environment production --disableFastRender --renderToMemory',
    url: 'http://127.0.0.1:4178/docs/hub/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
