import { test, Locator, Page } from '@playwright/test';
import { login } from './utils/auth';
import { captureFor } from './utils/screenshots';
import {
  gotoAndWait,
  isPresent,
  revealHoverControls,
  skipBecause,
  switchTileToSd,
  waitForStreamFrame,
} from './utils/page';

/**
 * Drives the Hub UI to capture the screenshots used by the
 * `learn/app/content/docs/hub/livestream/index.md` documentation page.
 *
 * Captured files (written to `docs/hub/livestream/`, overwritten on each
 * run):
 *
 *   - hub-livestream-overview.png    — the /livestream grid populated with
 *                                      whatever devices the test account
 *                                      has access to (or the empty-state
 *                                      placeholder when none are
 *                                      connected).
 *   - hub-livestream-filter.png      — the filter bar at the top of the
 *                                      page with the Sites multi-select
 *                                      open so every filter is visible
 *                                      next to the search field and the
 *                                      Status filter.
 *   - hub-livestream-grid-toggle.png — the grid-layout toggle (1/2/3/4
 *                                      column views) in the top right
 *                                      corner of the control bar.
 *   - hub-livestream-stream.png      — a single stream tile with the
 *                                      camera-name overlay, the SD/HD
 *                                      quality switcher and the
 *                                      hover-revealed control bar
 *                                      (talk, mute, fullscreen) visible.
 *                                      Skipped when no device is streaming.
 *   - hub-livestream-badges.png      — a stream tile's header showing the
 *                                      device name and the active /
 *                                      idle / alert badge published over
 *                                      MQTT.
 *
 * Selectors are taken from:
 *   - hub-frontend/kerberos.ng/src/app/home/livestream/livestream.component.html
 *   - hub-frontend/kerberos.ng/src/app/home/livestream/blocks/liveview/liveview.component.html
 *   - hub-frontend/kerberos.ng/src/app/shared/widgets/stream/stream.component.html
 */

const shoot = captureFor('livestream');

/**
 * Drives the browser to /livestream and waits until either the populated
 * grid container or the empty-state placeholder is on screen. Returns the
 * page once the view is in a stable state.
 */
async function gotoLivestream(page: Page): Promise<void> {
  await gotoAndWait(page, '/livestream', 'Live view', {
    settleMs: 750, // give MQTT a beat to publish badge updates
  });
  // Either the grid or the empty-state placeholder is acceptable.
  await Promise.race([
    page
      .locator('.grid-container')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 }),
    page
      .locator('placeholder, Placeholder')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 }),
  ]).catch(() => {
    /* still capture whatever is on screen */
  });
}

/**
 * Returns the first stream tile on /livestream, if any. A "tile" is either:
 *   - an `<app-liveview>` host (max-streams / numbered pagination modes), or
 *   - a `<block>` host wrapping a `<streamcomponent>` (default scroll mode).
 */
function firstStreamTile(page: Page): Locator {
  return page.locator('app-liveview, block:has(streamcomponent)').first();
}

/**
 * Iterates every tile on the page, scrolls it into view (so the
 * IntersectionObserver fires `resumeStream()`) and clicks its SD/HD
 * toggle into SD mode when the camera is connected. Returns the index
 * of the first connected tile, or -1 when none are online.
 *
 * Forcing SD avoids HD/WebRTC which needs UDP egress + ICE — those are
 * unreliable inside devcontainers and leave the tiles stuck on the
 * "PREVIEW / LIVE" placeholder.
 */
async function switchConnectedTilesToSd(page: Page): Promise<number> {
  const tiles = page.locator('app-liveview, block:has(streamcomponent)');
  const count = await tiles.count();
  let first = -1;
  for (let i = 0; i < count; i++) {
    const candidate = tiles.nth(i);
    const isConnected = await candidate
      .evaluate((el: Element) => {
        const cmp = (window as any).ng?.getComponent?.(
          el.querySelector('streamcomponent, StreamComponent') ?? el,
        );
        return cmp?.cameraConnected === 'true' || cmp?.cameraConnected === '';
      })
      .catch(() => false);
    if (!isConnected) continue;
    await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
    await switchTileToSd(candidate);
    if (first === -1) first = i;
  }
  // Give the freshly-switched tiles a beat to receive their first MQTT
  // JPEG snapshot.
  if (first !== -1) await page.waitForTimeout(800);
  return first;
}

test.describe('Hub — livestream documentation screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('captures the livestream overview', async ({ page }) => {
    await gotoLivestream(page);
    await switchConnectedTilesToSd(page);
    await shoot(page, 'hub-livestream-overview.png');
  });

  test('captures the filter bar with the Sites filter open', async ({
    page,
  }) => {
    await gotoLivestream(page);

    const filterBar = page.locator('.control-bar').first();
    await filterBar.waitFor({ state: 'visible', timeout: 15_000 });

    // The control bar contains a SearchField, a Sites MultiSelect and a
    // Status MultiSelect. We open Sites so the dropdown panel is captured
    // next to the other filters.
    const sites = filterBar
      .locator('multiselect, MultiSelect')
      .filter({ hasText: /sites/i })
      .first();
    if (await isPresent(sites, 5_000)) {
      await sites.click({ force: true });
      await page.waitForTimeout(400);
    }

    await shoot(page, 'hub-livestream-filter.png');
  });

  test('captures the grid layout toggle', async ({ page }, testInfo) => {
    await gotoLivestream(page);
    await switchConnectedTilesToSd(page);

    const gridToggle = page.locator('gridtoggle, GridToggle').first();
    if (!(await isPresent(gridToggle, 5_000))) {
      return skipBecause(
        testInfo,
        'no-toggle',
        'GridToggle is not rendered on this build.',
      );
    }

    await revealHoverControls(gridToggle, { waitMs: 200 });
    await shoot(page, 'hub-livestream-grid-toggle.png');
  });

  test('captures a single stream tile with its control bar visible', async ({
    page,
  }, testInfo) => {
    await gotoLivestream(page);

    const firstConnectedIndex = await switchConnectedTilesToSd(page);
    if (firstConnectedIndex === -1) {
      return skipBecause(
        testInfo,
        'no-stream',
        'No livestream tiles are connected — no devices online.',
      );
    }

    const tile = page
      .locator('app-liveview, block:has(streamcomponent)')
      .nth(firstConnectedIndex);
    const stream = tile.locator('streamcomponent, StreamComponent').first();
    await tile.scrollIntoViewIfNeeded().catch(() => undefined);
    const ready = await waitForStreamFrame(tile, 15_000);
    if (ready === 'none') {
      skipBecause(
        testInfo,
        'no-stream-frame',
        'Connected tile rendered but no MQTT frame arrived within 15s.',
      );
    }

    await revealHoverControls(stream, { waitMs: 200 });
    await shoot(page, 'hub-livestream-stream.png');
  });

  test('captures the device-name + status badge on a tile header', async ({
    page,
  }, testInfo) => {
    await gotoLivestream(page);
    await switchConnectedTilesToSd(page);

    // The status badges (success / updating / alert / neutral) only appear
    // on the default scroll layout (the `<block>`-wrapped tiles).
    const tile = page.locator('block:has(streamcomponent)').first();
    if (!(await isPresent(tile, 10_000))) {
      return skipBecause(
        testInfo,
        'no-block-tile',
        'No <block> tiles on screen — likely numbered or maxStreams pagination.',
      );
    }

    const header = tile.locator('blockheader, BlockHeader').first();
    if (!(await isPresent(header, 5_000))) {
      return skipBecause(testInfo, 'no-header', 'No tile header rendered.');
    }
    await header.scrollIntoViewIfNeeded().catch(() => undefined);
    await shoot(page, 'hub-livestream-badges.png');
  });
});
