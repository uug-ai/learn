/**
 * Documentation screenshots for the "Analytics" page.
 *
 * Scaffolded from learn/playwright/tests/TEMPLATE.spec.ts.example — see
 * learn/TEMPLATE.md for the canonical recipe (selector conventions,
 * helpers, how to start the Hub stack before running this spec).
 *
 * Drives the Hub UI to capture the screenshots used by the
 * `learn/app/content/docs/hub/analytics/index.md` documentation page.
 *
 * Captured files (written to `docs/hub/analytics/`, overwritten on each
 * run):
 *
 *   - hub-analytics-overview.png        — the /analytics page rendered
 *                                         for the test user, with KPIs,
 *                                         alert track, hourly charts and
 *                                         the count / region tables.
 *   - hub-analytics-filters.png         — the date / sites / devices
 *                                         filter row at the top of the
 *                                         page, with the Sites
 *                                         multi-select dropdown open.
 *   - hub-analytics-kpis.png            — the 5-card KPI strip (Devices
 *                                         online, Total recordings,
 *                                         Objects counted, Objects in
 *                                         regions, Time in regions).
 *   - hub-analytics-counted-chart.png   — the "Counted per hour" chart
 *                                         block with the device / alerts
 *                                         direction toggle visible.
 *   - hub-analytics-recordings-chart.png — the "Recordings per hour"
 *                                          chart at the bottom of the
 *                                          page.
 *
 * Selectors are taken from:
 *   - hub-frontend/kerberos.ng/src/app/home/analytics/analytics.component.html
 *   - hub-frontend/kerberos.ng/src/app/home/analytics/blocks/**
 */

import { test, Page } from '@playwright/test';
import { login } from './utils/auth';
import { captureFor } from './utils/screenshots';
import { gotoAndWait, isPresent, skipBecause } from './utils/page';

const shoot = captureFor('analytics');

async function gotoAnalytics(page: Page): Promise<void> {
  await gotoAndWait(page, '/analytics', 'Analytics', {
    readySelector: '.stats.grid-container',
    settleMs: 800, // let the charts finish their initial paint
  });
}

test.describe('Hub — analytics documentation screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('captures the analytics overview', async ({ page }) => {
    await gotoAnalytics(page);
    await shoot(page, 'hub-analytics-overview.png');
  });

  test('captures the filter bar with the Sites filter open', async ({
    page,
  }) => {
    await gotoAnalytics(page);

    const filterBar = page.locator('.control-bar').first();
    await filterBar.waitFor({ state: 'visible', timeout: 15_000 });

    const sites = filterBar
      .locator('multiselect, MultiSelect')
      .filter({ hasText: /sites|site/i })
      .first();
    if (await isPresent(sites, 5_000)) {
      await sites.click({ force: true });
      await page.waitForTimeout(400);
    }

    await shoot(page, 'hub-analytics-filters.png');
  });

  test('captures the KPI strip', async ({ page }, testInfo) => {
    await gotoAnalytics(page);

    const strip = page.locator('.stats.grid-container.--five-columns').first();
    if (!(await isPresent(strip, 10_000))) {
      return skipBecause(
        testInfo,
        'no-kpi-strip',
        'KPI strip not rendered — analytics summary not available.',
      );
    }
    await strip.scrollIntoViewIfNeeded().catch(() => undefined);
    await shoot(page, 'hub-analytics-kpis.png');
  });

  test('captures the "Counted per hour" chart with its direction toggle', async ({
    page,
  }, testInfo) => {
    await gotoAnalytics(page);

    const chart = page
      .locator('block.objects-per-recording')
      .filter({ hasText: /counted per hour/i })
      .first();
    if (!(await isPresent(chart, 10_000))) {
      return skipBecause(
        testInfo,
        'no-counted-chart',
        '"Counted per hour" block not rendered for this user.',
      );
    }
    await chart.scrollIntoViewIfNeeded().catch(() => undefined);

    // Open the in/out direction picker so it's visible in the capture.
    const directionToggle = chart.locator('.alert-direction-toggle').first();
    if (await isPresent(directionToggle, 3_000)) {
      await directionToggle.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(300);
    }

    // The chart sits below the KPI strip, alert track and filter bar — scroll
    // the page down so the block lands inside the 1450×750 capture clip.
    const offsetY = await chart
      .evaluate((el) => (el as HTMLElement).getBoundingClientRect().top + window.scrollY - 24)
      .catch(() => 0);
    await shoot(page, 'hub-analytics-counted-chart.png', {
      scrollY: Math.max(0, Math.round(offsetY)),
    });
  });

  test('captures the "Recordings per hour" chart', async ({
    page,
  }, testInfo) => {
    await gotoAnalytics(page);

    const chart = page
      .locator('block.objects-per-recording')
      .filter({ hasText: /recordings per hour/i })
      .first();
    if (!(await isPresent(chart, 10_000))) {
      return skipBecause(
        testInfo,
        'no-recordings-chart',
        '"Recordings per hour" block not rendered for this user.',
      );
    }
    await chart.scrollIntoViewIfNeeded().catch(() => undefined);
    await shoot(page, 'hub-analytics-recordings-chart.png');
  });
});
