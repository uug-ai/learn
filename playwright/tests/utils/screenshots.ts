import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { prepareForScreenshot } from './chrome';

const DEFAULT_DIR = path.resolve(
  __dirname,
  '../../../app/content/docs/hub/cases',
);

export function screenshotDir(): string {
  const fromEnv = process.env.SCREENSHOT_DIR;
  const dir = fromEnv
    ? path.resolve(__dirname, '..', '..', fromEnv)
    : DEFAULT_DIR;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Default size for documentation screenshots. We always capture the top of
 * the viewport at this size so the resulting images are visually consistent
 * across pages.
 */
export const SCREENSHOT_WIDTH = 1280;
export const SCREENSHOT_HEIGHT = 720;

/**
 * Takes a 1280×720 PNG screenshot of the top of the page and writes it
 * (overwriting any existing file) to the screenshot directory. Returns the
 * absolute path on disk.
 */
export async function capture(
  page: Page,
  filename: string,
  options: { width?: number; height?: number } = {},
): Promise<string> {
  const dir = screenshotDir();
  const target = path.join(dir, filename);

  const width = options.width ?? SCREENSHOT_WIDTH;
  const height = options.height ?? SCREENSHOT_HEIGHT;

  // Resize the viewport so the screenshot matches the requested clip exactly.
  await page.setViewportSize({ width, height });

  // Hide non-production banners and other UI chrome we don't want in docs.
  await prepareForScreenshot(page);

  // Give animations / lazy content a moment to settle.
  await page.waitForLoadState('networkidle').catch(() => {
    /* ignore — Hub keeps long-poll connections open on some pages */
  });
  // Make sure we're at the top of the page.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  await page.screenshot({
    path: target,
    clip: { x: 0, y: 0, width, height },
    animations: 'disabled',
  });

  // eslint-disable-next-line no-console
  console.log(`  📸  saved ${path.relative(process.cwd(), target)}`);
  return target;
}
