import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './site-tests',
  testMatch: 'analytics.spec.ts',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'hugo server --source ../app --bind 127.0.0.1 --port 4177 --environment production --disableFastRender --renderToMemory',
    url: 'http://127.0.0.1:4177/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
