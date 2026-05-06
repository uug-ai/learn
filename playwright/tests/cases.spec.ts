import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import { capture } from './utils/screenshots';

/**
 * Drives the Hub UI to capture the screenshots used by the
 * `learn/app/content/docs/hub/cases/index.md` documentation page.
 *
 * Captured files (overwritten on each run):
 *   - hub-cases-list.png        — the /cases overview page
 *   - hub-cases-create.png      — the "Create case" modal opened from /watchlist
 *   - hub-cases-created.png     — the success confirmation after creating a case
 */
test.describe('Hub — cases documentation screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('captures the cases overview', async ({ page }) => {
    await page.goto('/cases');

    await expect(page.locator('text=Cases').first()).toBeVisible();

    // Either the cases list or the empty-state placeholder is acceptable —
    // both are valid documentation screenshots.
    await Promise.race([
      page.locator('tasks-list').first().waitFor({ state: 'visible' }),
      page
        .locator('text=No cases found')
        .first()
        .waitFor({ state: 'visible' }),
    ]).catch(() => {
      /* fall through — screenshot will still be taken */
    });

    await capture(page, 'hub-cases-list.png');
  });

  test('captures the create-case flow from the watchlist', async ({ page }) => {
    // Cases are created from the watchlist (or media) page by selecting a
    // recording and pressing "Create case". We use the watchlist because it
    // exposes the same Create case modal and is reachable from the sidebar.
    await page.goto('/watchlist');
    await expect(page.locator('text=Watchlist').first()).toBeVisible();

    const createCaseTrigger = page
      .locator('button, a, [role="button"], button-field')
      .filter({ hasText: /create case/i })
      .first();

    const triggerVisible = await createCaseTrigger
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!triggerVisible) {
      test.info().annotations.push({
        type: 'skip-create',
        description:
          'No notifications/recordings available to create a case from. ' +
          'Skipping the modal capture — only the cases list will be updated.',
      });
      return;
    }

    await createCaseTrigger.click();

    const modal = page
      .locator('Modal, .modal')
      .filter({ hasText: /create case/i });
    await expect(modal.first()).toBeVisible();
    await capture(page, 'hub-cases-create.png');

    const titleInput = modal
      .locator('input[type="text"], input:not([type])')
      .first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Documentation example case');
    }

    const confirmButton = modal
      .locator('button-field, button')
      .filter({ hasText: /^create case$/i })
      .last();

    if (await confirmButton.isEnabled().catch(() => false)) {
      await confirmButton.click();

      const success = page.locator(
        'text=A case was created for this recording',
      );
      await success
        .waitFor({ state: 'visible', timeout: 15_000 })
        .catch(() => {
          /* still capture whatever is on screen */
        });
      await capture(page, 'hub-cases-created.png');
    }
  });
});
