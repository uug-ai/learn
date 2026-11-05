import { test, expect } from '@playwright/test';

test('factory: links installation to the supported Kubernetes quickstart', async ({ page }) => {
  await page.goto('/docs/factory/installation/');
  await page.locator('#content').getByRole('link', { name: 'Quickstart', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/factory\/quickstart\/$/);
  const content = page.locator('#content');
  await expect(content.locator('h1')).toHaveText('Quickstart');
  await expect(content.locator('h2')).toHaveText(['Docker', 'Kubernetes', 'Add your first camera']);
  await expect(content).toContainText('MongoDB is not required.');
  await expect(content).toContainText('does not currently support a standalone Docker or Docker Compose deployment');
  await expect(content).toContainText('NodePort 30079');
  await expect(content.locator('pre').filter({ hasText: 'kubectl rollout status' }))
    .toContainText('kubectl port-forward -n kerberos-factory svc/factory-nodeport 8080:80');
  await expect(content.locator('pre').filter({ hasText: 'curl --fail' }))
    .toContainText('http://localhost:8080/healthz');
});
