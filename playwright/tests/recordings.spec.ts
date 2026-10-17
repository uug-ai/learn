import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import { captureFor } from './utils/screenshots';

const shoot = captureFor('recordings');

test('captures the recordings overview, grid, panel, context, and detail', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await login(page);
  await page.goto(process.env.HUB_RECORDINGS_PATH || '/media');

  const firstRecording = page.locator('mediagrid .media-block').first();
  await expect(
    firstRecording,
    'Choose a date with playable recordings using HUB_RECORDINGS_PATH.',
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.media-skeleton')).toBeHidden();
  await shoot(page, 'hub-recordings-overview.png');

  const detailPath = await firstRecording
    .locator('a.detail-navigation')
    .getAttribute('href');
  if (!detailPath) {
    throw new Error('The first recording has no detail link.');
  }

  await firstRecording.scrollIntoViewIfNeeded();
  await shoot(page, 'hub-recordings-grid.png', {
    scrollY: await page.evaluate(() => window.scrollY),
  });
  await firstRecording.locator('.media-metadata-container').click();

  const drawer = page.locator(
    'media-detail-panel .media-detail-panel__drawer',
  );
  await expect(drawer).toBeVisible();
  const actions = drawer.getByRole('button', { name: 'Actions', exact: true });
  // Keyboard activation also works when the narrow drawer header overlaps.
  await actions.focus();
  await actions.press('Enter');
  await expect(drawer.locator('.media-detail-actions__menu')).toBeVisible();
  await shoot(page, 'hub-recordings-panel.png');

  const viewContext = drawer.getByRole('button', {
    name: 'View Context',
    exact: true,
  });
  await viewContext.focus();
  await viewContext.press('Enter');
  const context = page.locator('modal.media-container-modal .bg.open');
  await expect(context).toBeVisible();
  await expect(context.locator('.context-wall__tile').first()).toBeVisible();
  await expect(context.locator('.context-skeleton')).toHaveCount(0);
  await expect.poll(
    () => context.locator('video').first().evaluate(
      (video: HTMLVideoElement) => video.readyState,
    ),
    { message: 'Wait for playable context footage before capturing.' },
  ).toBeGreaterThanOrEqual(2);
  await shoot(page, 'hub-recordings-context.png');

  await page.goto(detailPath);
  await expect(page.locator('media-detail-view video-player').first()).toBeVisible();
  await expect(
    page.locator('media-detail-view').getByRole('button', {
      name: 'Actions',
      exact: true,
    }),
  ).toBeVisible();
  await expect.poll(
    () => page.locator('media-detail-view video').first().evaluate(
      (video: HTMLVideoElement) => video.readyState,
    ),
    { message: 'Wait for playable detail footage before capturing.' },
  ).toBeGreaterThanOrEqual(2);
  await shoot(page, 'hub-recordings-detail.png');
});
