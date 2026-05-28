import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { prepareForScreenshot } from './chrome';

/**
 * Root of the Hub documentation pages — every topic captured by a spec
 * writes its PNGs into `<HUB_DOCS_ROOT>/<topic>/`.
 */
const HUB_DOCS_ROOT = path.resolve(
  __dirname,
  '../../../app/content/docs/hub',
);

/**
 * Default topic used when a spec does not specify one. Kept for backwards
 * compatibility with the original cases/media specs which always wrote
 * into `docs/hub/cases`.
 */
const DEFAULT_TOPIC = 'cases';

/**
 * Resolves the on-disk directory where screenshots for a topic should be
 * written. Order of precedence:
 *   1. The `SCREENSHOT_DIR` env var (relative to `learn/playwright/`).
 *   2. `learn/app/content/docs/hub/<topic>/`.
 * The directory is created on demand.
 */
export function screenshotDir(topic: string = DEFAULT_TOPIC): string {
  const fromEnv = process.env.SCREENSHOT_DIR;
  const dir = fromEnv
    ? path.resolve(__dirname, '..', '..', fromEnv)
    : path.join(HUB_DOCS_ROOT, topic);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Default size for documentation screenshots. We always capture the top of
 * the viewport at this size so the resulting images are visually consistent
 * across pages.
 */
export const SCREENSHOT_WIDTH = 1450;
export const SCREENSHOT_HEIGHT = 750;

export interface CaptureOptions {
  /** Override the default 1450 px viewport width. */
  width?: number;
  /** Override the default 750 px viewport height. */
  height?: number;
  /**
   * Documentation topic the screenshot belongs to. Determines the output
   * subdirectory under `learn/app/content/docs/hub/`. Defaults to `cases`
   * for backwards compatibility.
   */
  topic?: string;
}

/**
 * Takes a 1450×750 PNG screenshot of the top of the page and writes it
 * (overwriting any existing file) to the topic's screenshot directory.
 * Returns the absolute path on disk.
 */
export async function capture(
  page: Page,
  filename: string,
  options: CaptureOptions = {},
): Promise<string> {
  const dir = screenshotDir(options.topic);
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

/**
 * Returns a `capture`-shaped function that is bound to a specific
 * documentation topic. Use this in a spec file to avoid repeating the
 * `topic` option on every call:
 *
 * ```ts
 * const shoot = captureFor('livestream');
 * await shoot(page, 'hub-livestream-overview.png');
 * ```
 */
export function captureFor(topic: string) {
  return (
    page: Page,
    filename: string,
    options: Omit<CaptureOptions, 'topic'> = {},
  ): Promise<string> => capture(page, filename, { ...options, topic });
}
