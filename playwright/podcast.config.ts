import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.LEARN_BASE_URL || 'http://127.0.0.1:4176';

export default defineConfig({
  testDir: './site-tests',
  testMatch: ['podcast.spec.ts', 'product-names.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: process.env.LEARN_BASE_URL ? undefined : {
    command: 'hugo server --source ../app --bind 127.0.0.1 --port 4176 --environment production --disableFastRender --renderToMemory',
    url: `${baseURL}/docs/hub/organisations/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
