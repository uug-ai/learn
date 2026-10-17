import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import { captureFor } from './utils/screenshots';

const shoot = captureFor('videowall');

test('captures video wall management and editor tabs without saving', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await login(page);
  await page.goto('/videowall');
  await expect(page.locator('videowalllist .item').first()).toBeVisible();

  const name = process.env.HUB_VIDEOWALL_NAME || 'All cameras';
  await page.locator('.accounts > .control-bar input').fill(name);
  const wall = page.locator('videowalllist .item').filter({
    has: page.locator('.name').getByText(name, { exact: true }),
  });
  await expect(wall, 'Choose an existing uugai wall using HUB_VIDEOWALL_NAME.')
    .toHaveCount(1);
  await shoot(page, 'hub-videowall-overview.png');

  const edit = wall.locator('buttonfield[action="pen"] button');
  await expect(edit, 'The documentation account must be able to edit this wall.')
    .toBeVisible();
  await edit.focus();
  await edit.press('Enter');
  const modal = page.locator('modal .bg.open').filter({
    has: page.locator('.new-videowall'),
  });
  await expect(modal).toBeVisible();
  await expect(modal.locator('input[formcontrolname="name"]')).toHaveValue(name);
  await shoot(page, 'hub-videowall-information.png');

  const tabs = [
    { label: 'Devices', image: 'devices', content: '.grid-container.--three-columns' },
    { label: 'Layout', image: 'layout', content: '.vwl-item' },
    { label: 'Permissions', image: 'permissions', content: '.permissions' },
    { label: 'Schedule', image: 'schedule', content: '.weekly-schedule' },
    { label: 'Share', image: 'share', content: 'multiselect-overlay' },
  ];
  for (const tab of tabs) {
    await modal.locator('.new-videowall > .control-bar .tab')
      .filter({ hasText: tab.label }).click();
    await expect(modal.locator(tab.content).first()).toBeVisible();
    await shoot(page, `hub-videowall-${tab.image}.png`);
  }

  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(modal).toHaveCount(0);
});
