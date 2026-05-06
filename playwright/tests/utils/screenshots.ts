import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

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
 * Takes a full-page PNG screenshot and writes it (overwriting any existing
 * file) to the screenshot directory. Returns the absolute path on disk.
 */
export async function capture(
  page: Page,
  filename: string,
  options: { fullPage?: boolean } = {},
): Promise<string> {
  const dir = screenshotDir();
  const target = path.join(dir, filename);

  // Give animations / lazy content a moment to settle.
  await page.waitForLoadState('networkidle').catch(() => {
    /* ignore — Hub keeps long-poll connections open on some pages */
  });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: target,
    fullPage: options.fullPage ?? true,
    animations: 'disabled',
  });

  // eslint-disable-next-line no-console
  console.log(`  📸  saved ${path.relative(process.cwd(), target)}`);
  return target;
}
