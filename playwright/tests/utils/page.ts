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
