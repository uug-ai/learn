import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local first (developer overrides, gitignored), then fall back to
// the committed .env defaults. dotenv does not overwrite existing variables,
// so values already present from the first call win.
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.HUB_BASE_URL || 'http://localhost:4200';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1450, height: 750 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Live view tiles autoplay <video> elements as soon as the
          // WebRTC track arrives (HD mode) and feed <img>/canvas from
          // MQTT (SD mode). The default headless autoplay policy
          // (`document-user-activation-required`) keeps unmuted videos
          // paused and causes the tile to be captured before the first
          // frame is painted. The flags below let WebRTC negotiate and
          // play without a synthetic user gesture, and surface ICE
          // candidates using the container's real IPs so signaling
          // works inside the devcontainer.
          args: [
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-ui-for-media-stream',
            '--disable-features=WebRtcHideLocalIpsWithMdns',
          ],
        },
      },
    },
  ],
});
