import { Page } from '@playwright/test';

/**
 * Hides UI chrome that should not appear in documentation screenshots, such
 * as the non-production environment banner that Hub renders at the top of
 * every page (see home.component.html / login.component.html in
 * hub-frontend: `<div class="environment {{config.environment}}">`).
 *
 * Safe to call multiple times — the injected style block is idempotent and
 * survives client-side navigation because it's added to the document head.
 */
export async function hideEnvironmentBar(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `.environment { display: none !important; }`,
  });
}

/**
 * Convenience wrapper that hides every "screenshot-noisy" element in one
 * call. Add new selectors here when more chrome needs to be filtered.
 */
export async function prepareForScreenshot(page: Page): Promise<void> {
  await hideEnvironmentBar(page);
}
