import { test, expect } from '@playwright/test';
import { assertScreenshotAccount } from './utils/auth';
import { capture } from './utils/screenshots';
import * as fs from 'fs';
import * as path from 'path';

test('accepts the uugai signed-in account', async ({ page }) => {
  await page.setContent(
    '<navigation><div class="profile-footer"><div class="username">uugai</div></div></navigation>',
  );
  await assertScreenshotAccount(page);
});

test('rejects another account before overwriting a screenshot', async ({
  page,
}, testInfo) => {
  const directory = testInfo.outputPath('captures');
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, 'existing.png');
  fs.writeFileSync(target, 'existing screenshot');
  const previousDirectory = process.env.SCREENSHOT_DIR;
  process.env.SCREENSHOT_DIR = directory;
  try {
    await page.setContent(
      '<navigation><div class="profile-footer"><div class="username">cedricve</div></div></navigation>',
    );
    await expect(capture(page, 'existing.png')).rejects.toThrow(
      'Documentation captures require the signed-in uugai account',
    );
    expect(fs.readFileSync(target, 'utf8')).toBe('existing screenshot');
  } finally {
    if (previousDirectory === undefined) {
      delete process.env.SCREENSHOT_DIR;
    } else {
      process.env.SCREENSHOT_DIR = previousDirectory;
    }
  }
});

test('rejects an unverified session', async ({ page }) => {
  await page.setContent('<main>Sign in</main>');
  await expect(assertScreenshotAccount(page)).rejects.toThrow(
    'Documentation captures require the signed-in uugai account',
  );
});
