import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const article = '/docs/hub/organisations/';
const data: {
  audio: string;
  transcript: string;
  duration: number;
  chapters: { title: string; start: number; turns: { text: string }[] }[];
} = JSON.parse(readFileSync(resolve(__dirname, '../../app/data/podcasts/organisations-v2.json'), 'utf8'));

test('places Listen at the article top right without fetching or autoplaying audio', async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/episode.mp3')) mediaRequests.push(request.url());
  });
  await page.goto(article);
  const listen = page.getByRole('button', { name: 'Listen to podcast', exact: true });
  await expect(listen).toHaveAttribute('aria-expanded', 'false');
  const seconds = Math.round(data.duration);
  await expect(listen).toContainText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
  const header = await page.locator('.learn-article-header').boundingBox();
  const button = await listen.boundingBox();
  expect(header).not.toBeNull();
  expect(button).not.toBeNull();
  expect(Math.abs(button!.x + button!.width - header!.x - header!.width)).toBeLessThan(2);
  expect(Math.abs(button!.y - header!.y)).toBeLessThan(2);
  await expect(page.getByRole('region', { name: 'Article podcast' })).toBeHidden();
  await listen.click();
  const panel = page.getByRole('region', { name: 'Article podcast' });
  await expect(panel).toBeVisible();
  await expect(listen).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.locator('audio')).toHaveJSProperty('paused', true);
  await expect(panel.locator('audio')).toHaveAttribute('preload', 'none');
  expect(mediaRequests).toEqual([]);
});

test('plays any chapter from a cold start and supports speed, skips, and transcript links', async ({ page }) => {
  await page.goto(article);
  await page.getByRole('button', { name: 'Listen to podcast', exact: true }).click();
  await page.getByText('Chapters', { exact: true }).click();
  const audio = page.locator('#article-podcast audio');
  const chapters = page.locator('#article-podcast [data-start]');
  await expect(chapters).toHaveCount(data.chapters.length);
  for (let index = data.chapters.length - 1; index >= 0; index--) {
    await chapters.nth(index).click();
    await expect(audio).toHaveJSProperty('paused', false);
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime))
      .toBeGreaterThanOrEqual(data.chapters[index].start);
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime))
      .toBeLessThan(data.chapters[index].start + 2);
    await expect(chapters.nth(index)).toHaveAttribute('aria-current', 'true');
  }
  await page.getByLabel('Playback speed').selectOption('1.5');
  await expect(audio).toHaveJSProperty('playbackRate', 1.5);
  await audio.evaluate(element => {
    const media = element as HTMLAudioElement;
    media.pause();
    media.currentTime = 100;
  });
  await page.getByRole('button', { name: 'Skip forward 15 seconds' }).click();
  await expect(audio).toHaveJSProperty('currentTime', 115);
  await page.getByRole('button', { name: 'Skip back 15 seconds' }).click();
  await expect(audio).toHaveJSProperty('currentTime', 100);
  await page.getByRole('link', { name: `Read transcript: ${data.chapters[2].title}`, exact: true }).click();
  await expect(page.locator('[data-podcast-transcript]')).toHaveAttribute('open', '');
  await expect(page).toHaveURL(/#podcast-transcript-chapter-2$/);
  await expect(page.locator('[data-podcast-transcript]')).toContainText('Ha, fair point.');
  await page.getByRole('button', { name: 'Close podcast player' }).click();
  await expect(page.locator('#article-podcast')).toBeHidden();
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(page.getByRole('button', { name: 'Listen to podcast', exact: true })).toBeFocused();
});

test('closing during a pending load prevents hidden playback and Escape restores focus', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/podcasts/organisations-v2/episode.mp3', async route => {
    await gate;
    await route.continue();
  });
  await page.goto(article);
  const listen = page.getByRole('button', { name: 'Listen to podcast', exact: true });
  await listen.click();
  await page.getByText('Chapters', { exact: true }).click();
  const requested = page.waitForRequest('**/podcasts/organisations-v2/episode.mp3');
  await page.locator('#article-podcast [data-start]').last().click();
  await requested;
  await page.getByRole('button', { name: 'Close podcast player' }).click();
  release();
  await expect.poll(() => page.locator('#article-podcast audio').evaluate(element => (element as HTMLAudioElement).readyState))
    .toBeGreaterThanOrEqual(1);
  await expect(page.locator('#article-podcast audio')).toHaveJSProperty('paused', true);
  await listen.click();
  await page.locator('#article-podcast audio').press('Escape');
  await expect(page.locator('#article-podcast')).toBeHidden();
  await expect(listen).toBeFocused();
});

test('serves seekable MP3 and the complete transcript', async ({ request }) => {
  const audio = await request.get(`/${data.audio}`, { headers: { Range: 'bytes=0-1023' } });
  expect(audio.status()).toBe(206);
  expect(audio.headers()['content-type']).toContain('audio/mpeg');
  expect((await audio.body()).length).toBe(1024);
  const transcript = await request.get(`/${data.transcript}`);
  expect(transcript.ok()).toBeTruthy();
  const text = await transcript.text();
  for (const chapter of data.chapters) {
    for (const turn of chapter.turns) expect(text).toContain(turn.text);
  }
});

test('reports audio failures and preserves download and transcript alternatives', async ({ page }) => {
  await page.route('**/podcasts/organisations-v2/episode.mp3', route => route.abort());
  await page.goto(article);
  await page.getByRole('button', { name: 'Listen to podcast', exact: true }).click();
  await page.getByText('Chapters', { exact: true }).click();
  await page.locator('#article-podcast [data-start]').first().click();
  await expect(page.locator('[data-podcast-status]')).toContainText(/could not be loaded/i);
  await expect(page.getByRole('link', { name: 'Download MP3', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download transcript', exact: true })).toBeVisible();
});

test('keeps pages without a podcast unchanged', async ({ page }) => {
  const podcastAssets: string[] = [];
  page.on('request', request => {
    if (/podcast[\w.-]*\.(css|js)/.test(request.url())) podcastAssets.push(request.url());
  });
  await page.goto('/docs/hub/roles/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-podcast-toggle]')).toHaveCount(0);
  await expect(page.locator('audio')).toHaveCount(0);
  expect(podcastAssets).toEqual([]);
});

test('fits a narrow screen and supports the dark palette', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(article);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const listen = page.getByRole('button', { name: 'Listen to podcast', exact: true });
  const header = await page.locator('.learn-article-header').boundingBox();
  const button = await listen.boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(button!.x + button!.width - header!.x - header!.width)).toBeLessThan(2);
  await listen.click();
  await expect(page.locator('#article-podcast')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.locator('#article-podcast').evaluate(element => getComputedStyle(element).backgroundColor))
    .toBe('rgb(20, 20, 30)');
});

test('offers direct audio and transcript links without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto(article);
    await expect(page.getByRole('link', { name: 'Play or download the podcast MP3' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'read the transcript', exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
