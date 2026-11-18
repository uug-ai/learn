import { test, expect, type Page } from '@playwright/test';

const guide = (page: Page) => page.locator('[data-support-guide]');
const result = (page: Page) => guide(page).locator('[data-guide-result]:visible');

test.beforeEach(async ({ page }) => {
  await page.goto('/support/');
});

test('support: no eyebrows, podcast or separate emergency section', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Support');
  await expect(page.locator('.tutorial-catalog__eyebrow, .tutorial-section-heading__eyebrow')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Listen to the overview' })).toHaveCount(0);
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.locator('#emergency-support')).toHaveCount(0);
  await expect(page.locator('#how-to-get-the-best-support')).toBeVisible();
  await expect(page.locator('.support-hero__action').nth(1)).toHaveAttribute('href', 'tel:+3293908078');
  await expect(page.locator('a[href*="ZgotmplZ"]')).toHaveCount(0);
});

test('support: guide sends urgent production issues to email and phone', async ({ page }) => {
  await expect(guide(page)).toBeVisible();
  await expect(result(page)).toContainText('Answer the questions');
  await expect(page.locator('[data-guide-urgency]')).toBeHidden();

  await page.getByText('Something is not working', { exact: true }).click();
  await expect(page.locator('[data-guide-urgency]')).toBeVisible();
  await expect(result(page)).toContainText('Answer the questions');

  await page.getByText('Yes, production is down or recordings are at risk').click();
  await expect(result(page)).toHaveCount(1);
  await expect(result(page).locator('h3')).toHaveText('Production emergency');
  await expect(result(page).getByRole('link', { name: /Email with URGENT/ }))
    .toHaveAttribute('href', 'mailto:support@uug.ai?subject=URGENT');
  await expect(result(page).getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:+3293908078');

  await page.getByText('No, but it blocks my work').click();
  await expect(result(page).locator('h3')).toHaveText('Email support');
  await expect(result(page).getByRole('link', { name: 'what to include' })).toHaveAttribute('href', '#how-to-get-the-best-support');
});

for (const [topic, channel, href] of [
  ['Account or billing', 'Email support', 'mailto:support@uug.ai'],
  ['A bug or feature request', 'GitHub', 'https://github.com/kerberos-io'],
  ['A new project or pricing', 'Contact form', 'https://uug.ai/contact'],
  ['A security vulnerability', 'Security reports', 'https://uug.ai/security'],
]) {
  test(`support: guide recommends ${channel} for "${topic}"`, async ({ page }) => {
    await page.getByText(topic, { exact: true }).click();
    await expect(page.locator('[data-guide-urgency]')).toBeHidden();
    await expect(result(page).locator('h3')).toHaveText(channel);
    await expect(result(page).getByRole('link').first()).toHaveAttribute('href', href);
  });
}

test('support: changing the topic clears the urgency answer, and start over resets', async ({ page }) => {
  await page.getByText('Something is not working', { exact: true }).click();
  await page.getByText('Yes, production is down or recordings are at risk').click();
  await page.getByText('Account or billing', { exact: true }).click();
  await expect(page.locator('[data-guide-urgency]')).toBeHidden();
  await expect(page.locator('input[name="support-urgency"]:checked')).toHaveCount(0);
  await expect(result(page).locator('h3')).toHaveText('Email support');

  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.locator('input:checked')).toHaveCount(0);
  await expect(result(page)).toContainText('Answer the questions');
  await expect(page.getByRole('button', { name: 'Start over' })).toBeHidden();
});

test('support: guide works with the keyboard', async ({ page }) => {
  await page.locator('input[name="support-topic"]').first().focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-guide-urgency]')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(result(page).locator('h3')).toHaveText('Email support');
});

test('support: every channel stays listed below the guide', async ({ page }) => {
  const links = page.locator('.support-all-channels a');
  await expect(links).toHaveCount(5);
  await expect(links).toHaveText(['Email support', 'Phone', 'Contact form', 'GitHub', 'Security reports']);
});

test('support: fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/support/');
  await page.getByText('Something is not working', { exact: true }).click();
  await page.getByText('Yes, production is down or recordings are at risk').click();
  await expect(result(page).locator('h3')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('support: hides the guide and keeps the channel list', async ({ page }) => {
    await expect(guide(page)).toBeHidden();
    await expect(page.locator('.support-all-channels a')).toHaveCount(5);
  });
});
