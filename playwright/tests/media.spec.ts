import { test, expect, Page, Locator } from '@playwright/test';
import { login } from './utils/auth';
import { capture } from './utils/screenshots';

/**
 * Drives the Hub UI to capture screenshots used by the cases documentation.
 * Captured files (overwritten on each run):
 *
 *   - hub-media-new-case.png   — "New case" modal opened from the side panel.
 *   - hub-media-context.png    — "View Context" overlay (a media-container)
 *                                that shows a wider time window of recordings
 *                                around the selected one. From this overlay
 *                                you can also click "Create case" to open the
 *                                same New case modal pre-filled with the
 *                                recordings in scope.
 *
 * Flow for both tests:
 *   1. Navigate to /media.
 *   2. Open the side panel (`media-detail-panel`) for the first recording by
 *      clicking its metadata area (see media-grid.component.html –
 *      `(click)="onSelectMedia(media)"` which fires `(selectMedia)` on the
 *      grid and is wired to `openQuickView` in media.component.html).
 *   3. Open the "Actions" dropdown in the panel header.
 *   4. Click the desired action ("New case" or "View Context").
 */

/**
 * Opens /media, waits for content, opens the side panel of the first
 * recording, opens the Actions dropdown, and returns the drawer + actions
 * menu locators. Returns `null` when there is no media to open — callers
 * should skip the test in that case.
 */
async function openFirstRecordingActionsMenu(
  page: Page,
): Promise<{ drawer: Locator; actionsMenu: Locator } | null> {
  await page.goto('/media');

  // The grid element is declared as `<MediaGrid>` in media.component.html,
  // which the browser normalizes to the lower-case tag `mediagrid`.
  await expect(
    page.locator('mediagrid, media-grid, MediaGrid').first(),
  ).toBeVisible({ timeout: 30_000 });

  const firstTile = page
    .locator('mediagrid .media-block, media-grid .media-block, MediaGrid .media-block')
    .first();
  const hasTile = await firstTile
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  if (!hasTile) return null;

  // Open the side panel for the first tile. The clickable area is the
  // metadata footer (.media-metadata-container) — clicking the video would
  // start playback instead of selecting the recording.
  const tileSelector = firstTile.locator('.media-metadata-container').first();
  await tileSelector.scrollIntoViewIfNeeded().catch(() => undefined);
  await tileSelector.click();

  const panel = page.locator('media-detail-panel .media-detail-panel');
  await expect(panel).toHaveClass(/is-open/);
  const drawer = panel.locator('.media-detail-panel__drawer').first();
  await expect(drawer).toBeVisible();

  // Open the Actions dropdown (top-right of the panel header). Angular
  // renders `<ButtonField>` as the lower-case tag `buttonfield`, which
  // contains an inner native `<button>` with `<span class="text">Actions</span>`.
  const actionsButton = drawer
    .locator('.media-detail-actions buttonfield button, .media-detail-actions button')
    .filter({ hasText: /actions/i })
    .first();
  await actionsButton.waitFor({ state: 'visible', timeout: 15_000 });
  await actionsButton.click();

  const actionsMenu = drawer.locator('.media-detail-actions__menu');
  await expect(actionsMenu).toBeVisible();

  return { drawer, actionsMenu };
}

test.describe('Hub — media documentation screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('captures the New case modal opened from a media side panel', async ({
    page,
  }) => {
    const opened = await openFirstRecordingActionsMenu(page);
    if (!opened) {
      test.info().annotations.push({
        type: 'skip-no-media',
        description:
          'No media available to open — skipping the New case modal screenshot.',
      });
      return;
    }
    const { actionsMenu } = opened;

    // Click the "New case" item in the actions menu — labelled "Add case" in
    // the documentation copy.
    const newCaseItem = actionsMenu
      .locator('buttonfield button, button')
      .filter({ hasText: /new case/i })
      .first();

    const canCreateCase = await newCaseItem
      .isEnabled({ timeout: 5_000 })
      .catch(() => false);

    if (!canCreateCase) {
      test.info().annotations.push({
        type: 'skip-no-permission',
        description:
          'The current user cannot create a case for this recording — "New case" is disabled.',
      });
      return;
    }

    await newCaseItem.click();

    // The modal renders inside <media-detail-panel> as `<modal>` containing a
    // `<div class="bg open">` overlay. The `<modal>` host element itself has
    // no display style, so Playwright reports it as hidden — we target the
    // visible `.bg.open` overlay instead. Filter by the "New case" header so
    // we don't match the create-case modal that lives on the page itself.
    const modalHost = page
      .locator('modal')
      .filter({ has: page.locator('modalheader, ModalHeader, modal-header').filter({ hasText: /new case/i }) })
      .first();
    const modal = modalHost.locator('.bg.open').first();
    await expect(modal).toBeVisible();

    await capture(page, 'hub-media-new-case.png');
  });

  test('captures the View Context overlay opened from a media side panel', async ({
    page,
  }) => {
    const opened = await openFirstRecordingActionsMenu(page);
    if (!opened) {
      test.info().annotations.push({
        type: 'skip-no-media',
        description:
          'No media available to open — skipping the View Context screenshot.',
      });
      return;
    }
    const { actionsMenu } = opened;

    // Click "View Context" — opens the <media-container> overlay that loads a
    // wider time window of recordings around the selected one (see
    // media-detail-panel.component.html: `openContextFromActions()` →
    // `<media-container ... withExport="true">`).
    const viewContextItem = actionsMenu
      .locator('buttonfield button, button')
      .filter({ hasText: /view context/i })
      .first();

    await viewContextItem.waitFor({ state: 'visible', timeout: 10_000 });
    await viewContextItem.click();

    // The context overlay is rendered by <media-container> as a <Modal> with
    // class `media-container-modal` and header "Context". Target the visible
    // `.bg.open` overlay (the <modal> host element itself has no display).
    const contextHost = page
      .locator('media-container modal, modal.media-container-modal')
      .filter({ has: page.locator('modalheader, ModalHeader, modal-header').filter({ hasText: /^\s*Context\s*$/i }) })
      .first();
    const overlay = contextHost.locator('.bg.open').first();
    await expect(overlay).toBeVisible({ timeout: 30_000 });

    // Wait for the timeline + recordings to settle a bit before screenshotting.
    await page.waitForTimeout(1_500);

    await capture(page, 'hub-media-context.png');
  });
});

