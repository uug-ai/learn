import { Locator, Page, TestInfo, expect } from '@playwright/test';

/**
 * Small grab-bag of page-level helpers shared by every documentation spec.
 *
 * The goal is to keep individual specs tiny: each `test(...)` should read
 * like a short recipe ("go here, expand that, capture this"). Whenever a
 * pattern starts repeating across specs, move it here.
 */

/**
 * Navigates to `route` and waits until either:
 *   - a heading containing `headingText` becomes visible, or
 *   - a CSS selector explicitly passed via `options.readySelector` resolves.
 *
 * Adds a small idle timeout afterwards so async content (MQTT badges,
 * lazy-loaded charts, …) has a chance to render before the screenshot.
 */
export async function gotoAndWait(
  page: Page,
  route: string,
  headingText: string,
  options: {
    /** Extra selector that must be visible before continuing. */
    readySelector?: string;
    /** Override the default 30s wait for the heading. */
    timeout?: number;
    /** How long to wait after the page is ready (default 500 ms). */
    settleMs?: number;
  } = {},
): Promise<void> {
  const timeout = options.timeout ?? 30_000;
  await page.goto(route);
  await expect(page.locator(`text=${headingText}`).first()).toBeVisible({
    timeout,
  });
  if (options.readySelector) {
    await page
      .locator(options.readySelector)
      .first()
      .waitFor({ state: 'visible', timeout })
      .catch(() => undefined);
  }
  await page.waitForTimeout(options.settleMs ?? 500);
}

/**
 * Annotates the current test with a `skip-*` annotation and returns so the
 * caller can `return` early. We never call `test.skip()` here — we still
 * want the spec to pass on environments without seeded data, just without
 * producing a (potentially misleading) screenshot.
 *
 * ```ts
 * if (!(await tile.isVisible())) return skipBecause(testInfo, 'no-stream', 'no devices');
 * ```
 */
export function skipBecause(
  testInfo: TestInfo,
  type: string,
  description: string,
): void {
  testInfo.annotations.push({ type: `skip-${type}`, description });
}

/**
 * Hovers the given element and, optionally, dispatches a synthetic
 * `mousemove` so Angular components that flip a `controlsVisible`-style
 * flag on `mouseenter` / `mousemove` actually reveal their controls.
 *
 * Used by the livestream tile capture (stream controls) and any other
 * hover-only UI we want to capture in the docs.
 */
export async function revealHoverControls(
  target: Locator,
  options: { waitMs?: number; dispatchMove?: boolean } = {},
): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.hover({ force: true }).catch(() => undefined);
  if (options.dispatchMove !== false) {
    await target.dispatchEvent('mousemove').catch(() => undefined);
  }
  await target.page().waitForTimeout(options.waitMs ?? 200);
}

/**
 * Returns true if the locator becomes visible within `timeoutMs`. Never
 * throws — useful for "capture if present, skip otherwise" branches.
 */
export async function isPresent(
  locator: Locator,
  timeoutMs: number = 5_000,
): Promise<boolean> {
  return locator
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}

/**
 * Waits until a livestream tile is actually painting frames so the
 * screenshot doesn't capture a black placeholder.
 *
 * Handles both modes used by `StreamComponent`:
 *   - HD/WebRTC: a `<video>` element is mounted, gets a `srcObject` from
 *     the `RTCPeerConnection` and reaches `readyState >= 2` (HAVE_CURRENT_DATA)
 *     once the first frame is decoded.
 *   - SD/MQTT:  an `<img>`/canvas is repainted every ~1s with a base64
 *     JPEG. Detected via a non-empty `src` or any drawn canvas pixel.
 *
 * Never throws — returns `'video' | 'image' | 'none'` describing what (if
 * anything) became ready so the caller can branch / add an annotation.
 */
export async function waitForStreamFrame(
  tile: Locator,
  timeoutMs: number = 10_000,
): Promise<'video' | 'image' | 'none'> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await tile
      .evaluate((el: Element) => {
        const video = el.querySelector('video') as HTMLVideoElement | null;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          return 'video';
        }
        const img = el.querySelector('img') as HTMLImageElement | null;
        if (img && img.src && !img.src.endsWith('#') && img.naturalWidth > 0) {
          return 'image';
        }
        const canvas = el.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          return 'image';
        }
        return 'none';
      })
      .catch(() => 'none' as const);
    if (result !== 'none') {
      return result;
    }
    await tile.page().waitForTimeout(250);
  }
  return 'none';
}

/**
 * Switches a stream tile from HD/WebRTC to SD/MQTT mode.
 *
 * WebRTC requires UDP egress + ICE, which is unreliable inside
 * devcontainers — the tile mounts the `<video>` but never gets a frame.
 * SD mode polls JPEG snapshots over MQTT (TCP/WSS), which works as long
 * as the broker is reachable, so it's what we use to capture docs
 * screenshots that actually show camera content.
 *
 * No-op if the toggle isn't rendered or the tile is already in SD.
 * Returns true when the toggle was clicked.
 */
export async function switchTileToSd(tile: Locator): Promise<boolean> {
  const sdButton = tile.locator('.quality.sd').first();
  if (!(await sdButton.isVisible().catch(() => false))) {
    return false;
  }
  const alreadyActive = await sdButton
    .evaluate((el) => el.classList.contains('active'))
    .catch(() => false);
  if (alreadyActive) {
    return false;
  }
  await sdButton.click({ force: true }).catch(() => undefined);
  return true;
}
