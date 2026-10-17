import { expect, Page } from '@playwright/test';

export async function assertScreenshotAccount(page: Page): Promise<void> {
  await expect(
    page.locator('navigation .profile-footer .username'),
    'Documentation captures require the signed-in uugai account. Do not capture another account or relabel its UI.',
  ).toHaveText('uugai');
}

/**
 * Logs in to the Hub frontend using the credentials provided through the
 * HUB_USERNAME / HUB_PASSWORD environment variables.
 *
 * Selectors are based on hub-frontend/kerberos.ng/src/app/login/login.component.html.
 */
export async function login(page: Page): Promise<void> {
  const username = process.env.HUB_USERNAME;
  const password = process.env.HUB_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'HUB_USERNAME and HUB_PASSWORD must be set (see .env.example).',
    );
  }

  await page.goto('/login');

  const usernameField = page.locator('#login__username');
  await usernameField.waitFor({ state: 'visible' });

  await usernameField.fill(username);
  await page.locator('#login__password').fill(password);

  await Promise.all([
    page.waitForURL((url) => !/\/login(\b|\/)/.test(url.pathname), {
      timeout: 30_000,
    }),
    page.locator('input[type="submit"][value="Sign in"]').click(),
  ]);
  await assertScreenshotAccount(page);
}
