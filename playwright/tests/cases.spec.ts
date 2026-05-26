import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import { capture } from './utils/screenshots';

/**
 * Drives the Hub UI to capture the screenshots used by the
 * `learn/app/content/docs/hub/cases/index.md` documentation page.
 *
 * Captured files (overwritten on each run):
 *   - hub-cases-list.png         — the /cases overview page
 *   - hub-cases-opened.png       — an expanded case showing the playlist tab,
 *                                  description, labels, assignees, visibility
 *                                  and the new retention row.
 *   - hub-cases-attachments.png  — the Attachments tab of an open case
 *                                  showing the drag-and-drop upload area
 *                                  and the list of attached files.
 *   - hub-cases-create.png       — the "Create case" modal opened from /watchlist
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

  test('captures an opened case from the cases overview', async ({ page }) => {
    await page.goto('/cases');
    await expect(page.locator('text=Cases').first()).toBeVisible();

    // Wait for at least one case row in the table (tasks-line is the row
    // component used by tasks-list — see hub-frontend tasks-list.component.html).
    const firstCase = page.locator('tasks-line .task-item').first();
    const hasCase = await firstCase
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasCase) {
      test.info().annotations.push({
        type: 'skip-open',
        description:
          'No cases available to open — skipping the opened-case screenshot.',
      });
      return;
    }

    // Clicking the row header toggles `open` and renders the body
    // (see tasks-line.component.html: `(click)="onTaskHeaderClick()"`).
    const header = firstCase.locator('> .header').first();
    await header.scrollIntoViewIfNeeded().catch(() => undefined);
    await header.click({ force: true });

    // Wait for the expanded body to render before capturing.
    await firstCase
      .locator('.body')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {
        /* still capture whatever is visible */
      });

    // Scroll the opened row into view so the screenshot is centered on it.
    await firstCase.scrollIntoViewIfNeeded().catch(() => undefined);

    await capture(page, 'hub-cases-opened.png');
  });

  test('captures the Attachments tab of an opened case', async ({ page }) => {
    await page.goto('/cases');
    await expect(page.locator('text=Cases').first()).toBeVisible();

    // Locate and expand the first case in the list (same flow as the
    // "opened case" test above).
    const firstCase = page.locator('tasks-line .task-item').first();
    const hasCase = await firstCase
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasCase) {
      test.info().annotations.push({
        type: 'skip-no-case',
        description:
          'No cases available to open — skipping the attachments-tab screenshot.',
      });
      return;
    }

    const header = firstCase.locator('> .header').first();
    await header.scrollIntoViewIfNeeded().catch(() => undefined);
    await header.click({ force: true });

    await firstCase
      .locator('.body')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {
        /* still capture whatever is visible */
      });

    // Switch to the Attachments tab. See tasks-line.component.html:
    // `<button class="case-detail-tab" ... (click)="setPlaylistTab('attachments')">`.
    const attachmentsTab = firstCase
      .locator('.case-detail-tab')
      .filter({ hasText: /attachments/i })
      .first();

    const hasAttachmentsTab = await attachmentsTab
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasAttachmentsTab) {
      test.info().annotations.push({
        type: 'skip-no-tab',
        description:
          'Attachments tab is not present on this build — skipping screenshot.',
      });
      return;
    }

    await attachmentsTab.click();

    // Wait for the attachments-panel to render before capturing.
    await firstCase
      .locator('attachments-panel')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {
        /* still capture whatever is visible */
      });

    await firstCase.scrollIntoViewIfNeeded().catch(() => undefined);

    await capture(page, 'hub-cases-attachments.png');
  });

  test('captures the create-case flow from the watchlist', async ({ page }) => {
    // Cases are created from a recording. The Watchlist exposes the same
    // "Add Case" action on every notification row, which opens the
    // "Create case" modal (see watch-line.component.html and
    // watchlist.component.html in hub-frontend).
    await page.goto('/watchlist');
    await expect(page.locator('text=Watchlist').first()).toBeVisible();

    // Wait for at least one notification row.
    const firstRow = page.locator('watch-line .task-item').first();
    const hasRow = await firstRow
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasRow) {
      test.info().annotations.push({
        type: 'skip-create',
        description:
          'No notifications available on the watchlist — nothing to create a case from.',
      });
      return;
    }

    // Expand the row so the action bar (with "Add Case") becomes visible.
    await firstRow.locator('.header').click();

    const addCaseButton = firstRow
      .locator('button-field, button')
      .filter({ hasText: /^add case$/i })
      .first();

    const canAddCase = await addCaseButton
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!canAddCase) {
      test.info().annotations.push({
        type: 'skip-create',
        description:
          'The selected notification already has a case or the "Add Case" action is hidden.',
      });
      return;
    }

    await addCaseButton.click();

    // The Create-case modal lives at the top of watchlist.component.html and
    // contains an <ExportMedia> component plus left/right action buttons.
    const modal = page
      .locator('Modal, modal, .modal')
      .filter({ hasText: /create case/i })
      .first();
    await expect(modal).toBeVisible();
    await capture(page, 'hub-cases-create.png');

    // The right-side confirm button is also labelled "Create case". It only
    // becomes enabled once media is selected; the modal pre-filters to the
    // notification's media via [sourceFilter], so it's usually already enabled.
    const confirmButton = modal
      .locator('button-field, button')
      .filter({ hasText: /^create case$/i })
      .last();

    const enabled = await confirmButton
      .isEnabled({ timeout: 5_000 })
      .catch(() => false);

    if (!enabled) {
      test.info().annotations.push({
        type: 'skip-confirm',
        description:
          'Create case button is disabled — media selection is required and was not auto-applied.',
      });
      return;
    }

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
  });
});
