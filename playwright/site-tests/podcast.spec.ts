import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const article = '/docs/hub/organisations/';
const data: {
  audio: string;
  audioSha256: string;
  duration: number;
  chapters: { title: string; start: number; sourceAnchor: string }[];
} = JSON.parse(readFileSync(resolve(__dirname, '../../app/data/podcasts/organisations-v2.json'), 'utf8'));
const topicSelector = (anchor: string) => `.learn-podcast-topic-heading:has(#${anchor})`;
const episodesDirectory = resolve(__dirname, '../../podcast/episodes');
const hubEpisodes: {
  id: string;
  sourceUrl: string;
  chapters: { title: string; sourceAnchor: string }[];
}[] = readdirSync(episodesDirectory)
  .filter(filename => filename.startsWith('hub-') && filename.endsWith('.json'))
  .map(filename => JSON.parse(readFileSync(join(episodesDirectory, filename), 'utf8')));

for (const episode of hubEpisodes) {
  const route = new URL(episode.sourceUrl).pathname;
  test(`offers a source-linked, lazy and playable overview on ${route}`, async ({ page, request }) => {
    const mediaRequests: string[] = [];
    page.on('request', request => {
      if (request.url().split('?')[0].endsWith('/episode.mp3')) mediaRequests.push(request.url());
    });
    await page.goto(route);
    await expect(page.locator('.learn-article-header h1')).toBeVisible();
    const listen = page.getByRole('button', { name: 'Listen to the overview', exact: true });
    await expect(listen).toHaveAttribute('aria-expanded', 'false');
    await listen.click();
    const panel = page.getByRole('region', { name: 'Article podcast' });
    await expect(panel).toBeVisible();
    const audio = page.locator('#article-podcast audio');
    await expect(audio).toHaveAttribute('preload', 'none');
    await expect(audio).toHaveJSProperty('paused', true);
    expect(mediaRequests).toEqual([]);
    await expect(panel.locator('[download], [data-transcript]')).toHaveCount(0);
    await panel.getByText('Chapters', { exact: true }).click();
    const chapters = panel.locator('[data-start]');
    await expect(chapters).toHaveCount(episode.chapters.length);
    for (const [index, chapter] of episode.chapters.entries()) {
      await expect(chapters.nth(index)).toContainText(chapter.title);
      await expect(page.locator(`[id="${chapter.sourceAnchor}"]`),
        `Missing source heading for ${episode.id}: ${chapter.sourceAnchor}`).toHaveCount(1);
    }
    await chapters.last().click();
    await expect(audio).toHaveJSProperty('paused', false);
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).duration))
      .toBeGreaterThan(0);
    await expect(chapters.last()).toHaveAttribute('aria-current', 'true');
    await panel.getByRole('button', { name: 'Close podcast player' }).click();
    await expect(audio).toHaveJSProperty('paused', true);
    const ranged = await request.get(`/podcasts/${episode.id}/episode.mp3`, {
      headers: { Range: 'bytes=0-1023' },
    });
    expect(ranged.status()).toBe(206);
    expect(ranged.headers()['content-type']).toContain('audio/mpeg');
    expect((await ranged.body()).length).toBe(1024);
    const transcript = await request.get(`/podcasts/${episode.id}/transcript.txt`);
    expect(transcript.status()).toBe(404);
  });
}

test('offers a short overview at the article top right without fetching or autoplaying audio', async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on('request', request => {
    if (request.url().split('?')[0].endsWith('/episode.mp3')) mediaRequests.push(request.url());
  });
  await page.goto(article);
  const listen = page.getByRole('button', { name: 'Listen to the overview', exact: true });
  await expect(listen).toHaveAttribute('aria-expanded', 'false');
  await expect(listen).toContainText(`${Math.max(1, Math.round(data.duration / 60))} min`);
  expect(data.duration).toBeGreaterThan(0);
  expect(data.duration).toBeLessThanOrEqual(300);
  expect(data.chapters).toHaveLength(4);
  await expect(page.locator('#content')).not.toContainText('Kerberos Hub');
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Kerberos Hub/i);
  const header = await page.locator('.learn-article-header').boundingBox();
  const button = await listen.boundingBox();
  expect(header).not.toBeNull();
  expect(button).not.toBeNull();
  expect(Math.abs(button!.x + button!.width - header!.x - header!.width)).toBeLessThan(2);
  expect(Math.abs(button!.y - header!.y)).toBeLessThan(2);
  await expect(page.getByRole('region', { name: 'Article podcast' })).toBeHidden();
  await expect(page.locator('[data-podcast-topic-state]')).toHaveCount(0);
  await listen.click();
  const panel = page.getByRole('region', { name: 'Article podcast' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('AI-generated voices');
  await expect(panel).not.toContainText(/local pilot|warmer two-host/i);
  await expect(panel.locator('.learn-podcast-chapters')).not.toHaveAttribute('open');
  await expect(page.locator('[data-podcast-topic-state]')).toHaveCount(0);
  await expect(listen).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.locator('audio')).toHaveJSProperty('paused', true);
  await expect(panel.locator('audio')).toHaveAttribute('preload', 'none');
  await expect(panel.locator('audio')).toHaveAttribute('controlslist', 'nodownload noplaybackrate');
  await expect(panel.locator('[data-skip], [data-podcast-speed], .learn-podcast-transport')).toHaveCount(0);
  expect(mediaRequests).toEqual([]);
});

test('plays any chapter from a cold start and pauses when closed', async ({ page }) => {
  await page.goto(article);
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
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
  await page.getByRole('button', { name: 'Close podcast player' }).click();
  await expect(page.locator('#article-podcast')).toBeHidden();
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(page.locator('[data-podcast-topic-state]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Listen to the overview', exact: true })).toBeFocused();
});

test('closing during a pending load prevents hidden playback and Escape restores focus', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/podcasts/organisations-v2/episode.mp3*', async route => {
    await gate;
    await route.continue();
  });
  await page.goto(article);
  const listen = page.getByRole('button', { name: 'Listen to the overview', exact: true });
  await listen.click();
  await page.getByText('Chapters', { exact: true }).click();
  const requested = page.waitForRequest('**/podcasts/organisations-v2/episode.mp3*');
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

test('does not expose transcript content or download links in the article', async ({ page }) => {
  await page.goto(article);
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  await page.getByText('Chapters', { exact: true }).click();
  await expect(page.locator('[data-podcast-transcript], [data-transcript]')).toHaveCount(0);
  await expect(page.locator('#article-podcast [download], a[href*="/podcasts/"]')).toHaveCount(0);
  await expect(page.locator('#article-podcast')).not.toContainText(/transcript|download/i);
  expect(await page.content()).not.toContain('Ha, fair point.');
});

test('serves seekable audio without publishing a transcript', async ({ request }) => {
  const audio = await request.get(`/${data.audio}`, { headers: { Range: 'bytes=0-1023' } });
  expect(audio.status()).toBe(206);
  expect(audio.headers()['content-type']).toContain('audio/mpeg');
  expect((await audio.body()).length).toBe(1024);
  const transcript = await request.get('/podcasts/organisations-v2/transcript.txt');
  expect(transcript.status()).toBe(404);
});

test('reports audio failures without suggesting transcripts or downloads', async ({ page }) => {
  await page.route('**/podcasts/organisations-v2/episode.mp3*', route => route.abort());
  await page.goto(article);
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  await page.getByText('Chapters', { exact: true }).click();
  await page.locator('#article-podcast [data-start]').first().click();
  await expect(page.locator('[data-podcast-status]')).toContainText(/could not be loaded/i);
  await expect(page.locator('[data-podcast-status]')).toContainText(/reload the page/i);
  await expect(page.locator('[data-podcast-status]')).not.toContainText(/transcript|download/i);
});

test('keeps pages without a podcast unchanged', async ({ page }) => {
  const podcastAssets: string[] = [];
  page.on('request', request => {
    if (/podcast[\w.-]*\.(css|js)/.test(request.url())) podcastAssets.push(request.url());
  });
  await page.goto('/docs/vault/first-things-first/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-podcast-toggle]')).toHaveCount(0);
  await expect(page.locator('.learn-podcast-topic-heading, .learn-podcast-topic-badge')).toHaveCount(0);
  await expect(page.locator('audio')).toHaveCount(0);
  expect(podcastAssets).toEqual([]);
});

test('fits a narrow screen and supports the dark palette', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(article);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const listen = page.getByRole('button', { name: 'Listen to the overview', exact: true });
  const header = await page.locator('.learn-article-header').boundingBox();
  const button = await listen.boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(button!.x - header!.x)).toBeLessThan(2);
  await expect(listen).toContainText(`${Math.max(1, Math.round(data.duration / 60))} min`);
  await listen.click();
  await expect(page.locator('#article-podcast')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.locator('#article-podcast').evaluate(element => getComputedStyle(element).backgroundColor))
    .toBe('rgb(20, 20, 30)');
});

test('restores versioned progress only when playback is started and saves new progress', async ({ page }) => {
  await page.goto(article);
  await page.evaluate(version => {
    localStorage.setItem('learn-podcast:organisations-v2', JSON.stringify({ version, time: 61 }));
  }, data.audioSha256);
  const mediaRequests: string[] = [];
  page.on('request', request => {
    if (request.url().split('?')[0].endsWith('/episode.mp3')) mediaRequests.push(request.url());
  });
  await page.reload();
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  const audio = page.locator('#article-podcast audio');
  await expect(page.locator('[data-podcast-progress-note]')).toContainText('Saved at 1:01');
  await expect(audio).toHaveJSProperty('paused', true);
  expect(mediaRequests).toEqual([]);
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThanOrEqual(61);
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeLessThan(64);
  await expect(page.locator(topicSelector(data.chapters[0].sourceAnchor))).not.toHaveAttribute('data-podcast-topic-state');
  await expect(page.locator(topicSelector(data.chapters[1].sourceAnchor))).toHaveAttribute('data-podcast-topic-state', 'current');
  await audio.evaluate(element => {
    const audio = element as HTMLAudioElement;
    audio.pause();
    audio.currentTime = 75;
  });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('learn-podcast:organisations-v2')!).time))
    .toBeCloseTo(75, 0);
  await expect(audio).toHaveJSProperty('seeking', false);
  const requestsBeforeReload = mediaRequests.length;
  await page.reload();
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(page.locator('[data-podcast-progress-note]')).toContainText('Saved at 1:15');
  expect(mediaRequests).toHaveLength(requestsBeforeReload);
});

test('explicit chapter selection takes precedence over saved progress', async ({ page }) => {
  await page.goto(article);
  await page.evaluate(version => {
    localStorage.setItem('learn-podcast:organisations-v2', JSON.stringify({ version, time: 61 }));
  }, data.audioSha256);
  await page.reload();
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  await page.getByText('Chapters', { exact: true }).click();
  await page.locator('#article-podcast [data-start]').last().click();
  const audio = page.locator('#article-podcast audio');
  await expect(audio).toHaveJSProperty('paused', false);
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime))
    .toBeGreaterThanOrEqual(data.chapters.at(-1)!.start);
});

test('a replaced episode ignores old progress and completion clears its saved position', async ({ page }) => {
  await page.goto(article);
  await page.evaluate(() => {
    localStorage.setItem('learn-podcast:organisations-v2', JSON.stringify({ version: 'old-audio', time: 61 }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  await expect(page.locator('[data-podcast-progress-note]')).toBeHidden();
  const audio = page.locator('#article-podcast audio');
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeLessThan(3);
  await audio.evaluate(element => {
    const audio = element as HTMLAudioElement;
    audio.currentTime = audio.duration - 0.1;
  });
  await expect(audio).toHaveJSProperty('ended', true);
  await expect(page.locator('.learn-podcast-topic-heading[data-podcast-topic-state="current"]')).toHaveCount(0);
  await expect(page.locator('[data-podcast-topic-state]')).toHaveCount(0);
  await expect(page.locator('.learn-podcast-topic-highlight')).toBeHidden();
  await expect(page.locator('[data-podcast-current-section]')).toHaveText('');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('learn-podcast:organisations-v2'))).toBeNull();
});

for (const operation of ['getItem', 'setItem'] as const) {
  test(`reports unavailable progress storage (${operation}) without breaking playback`, async ({ page }) => {
    await page.addInitScript(operation => {
      const original = Storage.prototype[operation];
      Object.defineProperty(Storage.prototype, operation, {
        value: function (this: Storage, key: string, value?: string) {
          if (key.startsWith('learn-podcast:')) throw new DOMException('Storage is blocked', 'SecurityError');
          return operation === 'getItem'
            ? (original as Storage['getItem']).call(this, key)
            : (original as Storage['setItem']).call(this, key, value!);
        },
      });
    }, operation);
    await page.goto(article);
    await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
    const audio = page.locator('#article-podcast audio');
    await audio.evaluate(element => (element as HTMLAudioElement).play());
    await expect(audio).toHaveJSProperty('paused', false);
    const note = page.locator('[data-podcast-progress-note]');
    await expect(note).toContainText(`Listening progress could not be ${operation === 'getItem' ? 'restored' : 'saved'}`);
    await expect(note).toContainText('Playback is still available');
  });
}

test('reports malformed saved progress without breaking the player', async ({ page }) => {
  await page.goto(article);
  await page.evaluate(() => localStorage.setItem('learn-podcast:organisations-v2', '{broken'));
  await page.reload();
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  await expect(page.locator('[data-podcast-progress-note]')).toContainText('could not be restored');
  const audio = page.locator('#article-podcast audio');
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect(audio).toHaveJSProperty('paused', false);
});

for (const width of [1280, 375]) {
  test(`keeps the same audio controls and current section reachable while reading at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 812 });
    await page.goto(article);
    await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
    const audio = page.locator('#article-podcast audio');
    const controls = page.locator('[data-podcast-controls]');
    const inlineClose = page.getByRole('button', { name: 'Close podcast player', exact: true });
    await expect(inlineClose).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(inlineClose).toHaveCSS('border-width', '0px');
    const currentSection = controls.locator('[data-podcast-current-section]');
    const firstSection = (await page.locator(topicSelector(data.chapters[0].sourceAnchor)).textContent())!.trim();
    const laterSection = (await page.locator(topicSelector(data.chapters[2].sourceAnchor)).textContent())!.trim();
    await page.locator('#ownership-and-isolation').scrollIntoViewIfNeeded();
    await expect(controls).not.toHaveClass(/is-docked/);
    await page.locator('#article-podcast').scrollIntoViewIfNeeded();
    await audio.evaluate(element => (element as HTMLAudioElement).play());
    await page.locator('#ownership-and-isolation').scrollIntoViewIfNeeded();
    await expect(controls).toHaveClass(/is-docked/);
    await expect(currentSection).toBeVisible();
    await expect(currentSection).toHaveText(firstSection);
    await expect(currentSection).toHaveAttribute('title', firstSection);
    await expect(audio).toBeInViewport();
    await expect(audio).toHaveJSProperty('paused', false);
    await expect(page.locator('audio')).toHaveCount(1);
    const box = await controls.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(812);
    expect(box!.height).toBeLessThan(150);
    await audio.evaluate(element => (element as HTMLAudioElement).pause());
    await expect(controls).toHaveClass(/is-docked/);
    await expect(currentSection).toHaveText(firstSection);
    await audio.evaluate((element, time) => { (element as HTMLAudioElement).currentTime = time; }, data.chapters[2].start);
    await expect(currentSection).toHaveText(laterSection);
    await expect(currentSection).toBeVisible();
    await expect(currentSection).toHaveAttribute('title', laterSection);
    await audio.evaluate(element => { (element as HTMLAudioElement).currentTime = 0; });
    await expect(currentSection).toHaveText(firstSection);
    await page.getByRole('button', { name: /Back to overview/ }).click();
    await expect(controls).not.toHaveClass(/is-docked/);
    await expect(audio).toBeFocused();
    await page.locator('#ownership-and-isolation').scrollIntoViewIfNeeded();
    await expect(controls).toHaveClass(/is-docked/);
    const closeButton = page.getByRole('button', { name: 'Close compact podcast player' });
    await expect(closeButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(closeButton).toHaveCSS('border-width', '0px');
    await closeButton.hover();
    await expect(closeButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(closeButton).toHaveCSS('border-width', '0px');
    const closeBox = await closeButton.boundingBox();
    expect(closeBox!.width).toBeGreaterThanOrEqual(44);
    expect(closeBox!.height).toBeGreaterThanOrEqual(44);
    await closeButton.click();
    await expect(page.locator('#article-podcast')).toBeHidden();
    await expect(controls).not.toHaveClass(/is-docked/);
    await expect(audio).toHaveJSProperty('paused', true);
    await expect(currentSection).toHaveText('');
    await expect(page.getByRole('button', { name: 'Listen to the overview', exact: true })).toBeFocused();
  });
}

test('highlights only the active section and follows topic changes without changing document layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(article);
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  const audio = page.locator('#article-podcast audio');
  const headings = data.chapters.map(chapter => page.locator(topicSelector(chapter.sourceAnchor)));
  const followingSection = page.locator('#model-diagram');
  const sectionPosition = await followingSection.evaluate(element => element.getBoundingClientRect().top + scrollY);
  const highlight = page.locator('.learn-podcast-topic-highlight');
  await expect(highlight).toHaveCount(1);
  await expect(highlight).toBeHidden();
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect(headings[0]).toHaveAttribute('data-podcast-topic-state', 'current');
  await expect(highlight).toBeVisible();
  await expect(page.locator('.learn-podcast-topic-badge')).toHaveCount(0);
  await expect(page.locator(`${topicSelector('core-concepts')} + table`)).toHaveAttribute('data-podcast-topic-state', 'current');
  const contentStyle = await page.locator(`${topicSelector('core-concepts')} + table`).evaluate(element => ({
    background: getComputedStyle(element).backgroundColor,
    shadow: getComputedStyle(element).boxShadow,
  }));
  expect(contentStyle).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
  await expect.poll(() => headings[0].evaluate(element => Math.round(element.getBoundingClientRect().top)))
    .toBeGreaterThan(70);
  await expect.poll(() => headings[0].evaluate(element => Math.round(element.getBoundingClientRect().top)))
    .toBeLessThan(140);
  for (const heading of headings.slice(1)) {
    await expect(heading).not.toHaveAttribute('data-podcast-topic-state');
  }
  expect(await followingSection.evaluate(element => element.getBoundingClientRect().top + scrollY))
    .toBeCloseTo(sectionPosition, 0);

  await page.locator('#runtime-architecture').scrollIntoViewIfNeeded();
  const readingPosition = await page.evaluate(() => scrollY);
  await audio.evaluate((element, time) => {
    const audio = element as HTMLAudioElement;
    audio.pause();
    audio.currentTime = time;
  }, data.chapters[2].start);
  await expect(headings[2]).toHaveAttribute('data-podcast-topic-state', 'current');
  for (const heading of headings.slice(0, 2)) {
    await expect(heading).not.toHaveAttribute('data-podcast-topic-state');
  }
  await expect(page.locator(`${topicSelector('core-concepts')} + table`)).not.toHaveAttribute('data-podcast-topic-state');
  await expect(headings[3]).not.toHaveAttribute('data-podcast-topic-state');
  await expect(page.locator('#runtime-architecture')).not.toHaveAttribute('data-podcast-topic-state');
  await expect(page.locator('#model-diagram')).not.toHaveAttribute('data-podcast-topic-state');
  await expect(page.locator('#creating-and-managing-projects')).not.toHaveAttribute('data-podcast-topic-state');
  await expect.poll(() => page.evaluate(() => scrollY)).not.toBeCloseTo(readingPosition, 0);
  await expect.poll(() => headings[2].evaluate(element => Math.round(element.getBoundingClientRect().top)))
    .toBeLessThan(140);

  await audio.evaluate((element, time) => { (element as HTMLAudioElement).currentTime = time; }, data.chapters[3].start);
  await expect(headings[3]).toHaveAttribute('data-podcast-topic-state', 'current');
  await expect(headings[2]).not.toHaveAttribute('data-podcast-topic-state');
  await audio.evaluate(element => { (element as HTMLAudioElement).currentTime = 0; });
  await expect(headings[0]).toHaveAttribute('data-podcast-topic-state', 'current');
  for (const heading of headings.slice(1)) {
    await expect(heading).not.toHaveAttribute('data-podcast-topic-state');
  }
  await expect.poll(() => headings[0].evaluate(element => Math.round(element.getBoundingClientRect().top)))
    .toBeLessThan(140);
  expect(await followingSection.evaluate(element => element.getBoundingClientRect().top + scrollY))
    .toBeCloseTo(sectionPosition, 0);
  await page.getByRole('button', { name: 'Close compact podcast player' }).click();
  await expect(page.locator('[data-podcast-topic-state]')).toHaveCount(0);
  await expect(highlight).toBeHidden();
  const positionBeforeReopening = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  await expect(headings[0]).toHaveAttribute('data-podcast-topic-state', 'current');
  await expect(audio).toHaveJSProperty('paused', true);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(positionBeforeReopening, 0);
});

for (const palette of ['light', 'dark']) {
  test(`fits one continuous active-section highlight on a narrow screen in the ${palette} palette`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(article);
    await page.evaluate(palette => document.documentElement.classList.toggle('dark', palette === 'dark'), palette);
    await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
    const heading = page.locator(topicSelector(data.chapters[0].sourceAnchor));
    const widthBefore = (await heading.boundingBox())!.width;
    await page.locator('#article-podcast audio').evaluate(element => (element as HTMLAudioElement).play());
    await expect(heading).toHaveAttribute('data-podcast-topic-state', 'current');
    await heading.scrollIntoViewIfNeeded();
    const highlight = page.locator('.learn-podcast-topic-highlight');
    await expect(highlight).toBeVisible();
    const box = (await highlight.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect((await heading.boundingBox())!.width).toBeCloseTo(widthBefore, 0);
    expect(await heading.evaluate(element => getComputedStyle(element).boxShadow)).toBe('none');
    expect(await heading.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await highlight.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    const bounds = await page.locator('.learn-podcast-topic-block[data-podcast-topic-state="current"]')
      .evaluateAll(elements => ({
        top: Math.min(...elements.map(element => element.getBoundingClientRect().top)),
        bottom: Math.max(...elements.map(element => element.getBoundingClientRect().bottom)),
      }));
    expect(box.y).toBeLessThan(bounds.top);
    expect(box.y + box.height).toBeGreaterThan(bounds.bottom);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}

test('keeps one case highlight behind its content, follows resizing and hides it in print', async ({ page }) => {
  await page.goto('/docs/hub/cases/');
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  const heading = page.locator(topicSelector('creating-a-case'));
  const paragraph = heading.locator('+ p');
  const screenshot = heading.locator('~ figure').first();
  const elements = [heading, paragraph, screenshot];
  const originalStyles = await Promise.all(elements.map(element => element.evaluate(node => ({
    background: getComputedStyle(node).backgroundColor, shadow: getComputedStyle(node).boxShadow,
  }))));
  const caseData: typeof data = JSON.parse(readFileSync(resolve(__dirname, '../../app/data/podcasts/hub-cases.json'), 'utf8'));
  const chapter = caseData.chapters.find(chapter => chapter.sourceAnchor === 'creating-a-case');
  if (!chapter) throw new Error('The Cases overview must link to the creating-a-case section.');
  await page.locator('#article-podcast audio').evaluate(async (element, start) => {
    const audio = element as HTMLAudioElement;
    await audio.play();
    audio.pause();
    audio.currentTime = start;
  }, chapter.start);
  await expect(heading).toHaveAttribute('data-podcast-topic-state', 'current');
  const activeStyles = await Promise.all(elements.map(element => element.evaluate(node => ({
    background: getComputedStyle(node).backgroundColor, shadow: getComputedStyle(node).boxShadow,
  }))));
  expect(activeStyles).toEqual(originalStyles);
  const highlight = page.locator('.learn-podcast-topic-highlight');
  await expect(highlight).toBeVisible();
  const originalHeight = (await highlight.boundingBox())!.height;
  await screenshot.evaluate(element => {
    element.style.height = `${element.getBoundingClientRect().height + 120}px`;
  });
  await expect.poll(async () => (await highlight.boundingBox())!.height).toBeGreaterThan(originalHeight + 100);
  await page.emulateMedia({ media: 'print' });
  await expect(highlight).toBeHidden();
});

test('follows natural chapter boundaries but does not pull the reader back within the same topic', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(article);
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  const audio = page.locator('#article-podcast audio');
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect(page.locator(topicSelector(data.chapters[0].sourceAnchor))).toHaveAttribute('data-podcast-topic-state', 'current');
  await page.locator('#runtime-architecture').scrollIntoViewIfNeeded();
  const readingPosition = await page.evaluate(() => scrollY);
  await audio.evaluate(element => element.dispatchEvent(new Event('timeupdate')));
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(readingPosition, 0);
  await audio.evaluate((element, start) => { (element as HTMLAudioElement).currentTime = start - 0.2; }, data.chapters[1].start);
  const nextHeading = page.locator(topicSelector(data.chapters[1].sourceAnchor));
  await expect(nextHeading).toHaveAttribute('data-podcast-topic-state', 'current');
  await expect(page.locator('[data-podcast-current-section]')).toHaveText((await nextHeading.textContent())!.trim());
  await expect.poll(() => nextHeading.evaluate(element => Math.round(element.getBoundingClientRect().top)))
    .toBeGreaterThan(70);
  await expect.poll(() => nextHeading.evaluate(element => Math.round(element.getBoundingClientRect().top)))
    .toBeLessThan(140);
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`returns to a selected chapter even when already active with motion preference ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (options) {
        if (this.classList.contains('learn-podcast-topic-heading') && options && typeof options === 'object') {
          this.setAttribute('data-follow-behavior', options.behavior ?? 'auto');
        }
        original.call(this, options);
      };
    });
    await page.goto(article);
    await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
    await page.getByText('Chapters', { exact: true }).click();
    const chapter = page.locator('#article-podcast [data-start]').first();
    const heading = page.locator(topicSelector(data.chapters[0].sourceAnchor));
    await chapter.click();
    await expect(heading).toHaveAttribute('data-follow-behavior', reducedMotion === 'reduce' ? 'instant' : 'smooth');
    await page.locator('#runtime-architecture').scrollIntoViewIfNeeded();
    await chapter.click();
    await expect.poll(() => heading.evaluate(element => Math.round(element.getBoundingClientRect().top)))
      .toBeGreaterThan(70);
    await expect.poll(() => heading.evaluate(element => Math.round(element.getBoundingClientRect().top)))
      .toBeLessThan(140);
    await expect(page.locator('#article-podcast audio')).toHaveJSProperty('paused', false);
  });
}

test('offers playback without transcript or download links when JavaScript is disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto(article);
    const audio = page.locator('noscript audio');
    await expect(audio).toBeVisible();
    await expect(audio).toHaveAttribute('controls', '');
    await expect(audio).toHaveAttribute('controlslist', 'nodownload noplaybackrate');
    await expect(audio).toHaveAttribute('preload', 'none');
    await expect(page.locator('a[href*="/podcasts/"], [data-podcast-transcript], [data-transcript]')).toHaveCount(0);
    await expect(page.locator('.learn-podcast-topic-heading, [data-podcast-topic-state]')).toHaveCount(0);
    await audio.evaluate(element => (element as HTMLAudioElement).play());
    await expect(audio).toHaveJSProperty('paused', false);
    expect(await page.content()).not.toContain('Ha, fair point.');
  } finally {
    await context.close();
  }
});
