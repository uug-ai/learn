import { chromium } from '@playwright/test';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../app/content/tutorials/', import.meta.url));
const origin = process.argv[2] || 'http://127.0.0.1:1313';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.route('**/livereload.js*', route => route.abort());
  for (const file of await readdir(root, { recursive: true })) {
    if (path.basename(file) !== 'index.md') continue;
    const directory = path.dirname(file);
    const route = `/tutorials/${directory.split(path.sep).join('/')}/`;
    const response = await page.goto(new URL(route, origin).href);
    if (!response?.ok()) throw new Error(`Unable to render ${route}: ${response?.status()}`);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.evaluate(() => document.fonts.ready);
    const banner = await page.locator('.tutorial-header').screenshot({ animations: 'disabled' });
    await sharp(banner)
      .resize(1200, 630, { fit: 'contain', background: '#0b0b12' })
      .png()
      .toFile(path.join(root, directory, 'social.png'));
    console.log(`Generated ${route}social.png`);
  }
} finally {
  await browser.close();
}
