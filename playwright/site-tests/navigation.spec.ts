import { test, expect } from '@playwright/test';
import { textContrast } from './utils/contrast';

const products = [
  {
    slug: 'hub',
    accent: '#a239d7',
    article: 'organisations',
    gettingStarted: 'Getting started',
    topics: [
      'Analytics', 'Audit events', 'Authentication', 'Cases', 'Cleanup', 'Configuration', 'Domains',
      'Feature flags', 'Floor plans', 'License', 'Live view', 'Maps', 'Markers',
      'Media processing', 'MP4 Verification', 'Notifications', 'ONVIF',
      'Organisations and projects', 'Pipeline', 'Recordings', 'Roles', 'SSO',
      'White-label', 'Workflows',
    ],
    topic: { slug: 'organisations', title: 'Organisations and projects' },
  },
  {
    slug: 'agent',
    accent: '#933734',
    article: 'first-things-first',
    gettingStarted: 'Getting Started',
    topics: ['License'],
    topic: { slug: 'license', title: 'License' },
  },
  {
    slug: 'factory',
    accent: '#4a786a',
    article: 'getting-started',
    gettingStarted: 'Getting Started',
    topics: ['Configuration & engines', 'License'],
    topic: { slug: 'configuration-and-engines', title: 'Configuration & engines' },
  },
  {
    slug: 'vault',
    accent: '#56618f',
    article: 'getting-started',
    gettingStarted: 'Getting Started',
    topics: ['Accounts', 'API', 'Configuration', 'Forwarding', 'Integrations', 'License', 'Machine learning', 'Providers'],
    topic: { slug: 'accounts', title: 'Accounts' },
  },
];

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile product navigation' : 'desktop product navigation', () => {
    test.use({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      colorScheme: 'light',
    });

    for (const product of products) {
      test(`${product.slug}: renders a product overview with an illustration and getting-started links`, async ({ page }) => {
        await page.goto(`/docs/${product.slug}/`);
        await expect(page.locator('.learn-product-page')).toHaveAttribute('data-product', product.slug);
        await expect(page.locator('#content h1')).toHaveText(new RegExp(`^${product.slug}$`, 'i'));
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
        const content = page.locator('#content .content');
        await expect(content.locator(':scope > p').first()).not.toBeEmpty();
        await expect(content.locator(':scope > h2')).toHaveText([/^How /, /^Where to start/]);
        await expect(content.locator(':scope > ol > li')).toHaveCount(3);

        const figure = content.locator('.iso-illustration-figure');
        await expect(figure).toBeVisible();
        await expect(figure.locator('.iso-illustration')).toHaveAttribute('aria-label',
          product.slug === 'vault' ? /Kerberos Vault/ : /Kerberos Hub/);
        await expect(figure.locator('svg')).toBeVisible();
        await expect(page.locator('link[rel="stylesheet"][href*="iso-illustration"]')).toHaveCount(1);
        const figureBounds = await figure.boundingBox();
        const svgBounds = await figure.locator('svg').boundingBox();
        if (!figureBounds || !svgBounds) throw new Error('The overview illustration must have layout bounds');
        expect(svgBounds.width).toBeLessThanOrEqual(figureBounds.width + 1);

        const startLinks = content.locator('h2:has(#where-to-start) + ul > li > a');
        await expect(startLinks).toHaveCount(3);
        for (const [index, slug] of [
          'first-things-first',
          'getting-started',
          product.slug === 'hub' ? 'pipeline' : 'installation',
        ].entries()) {
          await expect(startLinks.nth(index)).toHaveAttribute('href', `/docs/${product.slug}/${slug}/`);
        }
      });

      test(`${product.slug}: keeps introductory guides first and groups every other topic alphabetically`, async ({ page }) => {
        const productPath = `/docs/${product.slug}/`;
        await page.goto(productPath);
        await expect(page.locator('.learn-product-page')).toHaveAttribute('data-product', product.slug);
        if (mobile) {
          await page.getByRole('button', { name: 'Menu', exact: true }).click();
        }
        const sidebar = page.locator('aside.hextra-sidebar-container');
        const section = sidebar.locator(`a[href="${productPath}"]:visible`).locator('..').locator('..');
        await expect(section).toHaveAttribute('data-product', product.slug);
        await expect(section).toHaveCSS('--learn-product-accent', product.accent);
        const children = section.locator(':scope > .hextra-sidebar-children > ul > li');
        await expect(children.locator(':scope > .hextra-sidebar-item > a'))
          .toHaveText(['First things first', product.gettingStarted, 'Installation']);
        await expect(children).toHaveCount(4);
        const topicGroup = children.last();
        const toggle = topicGroup.getByRole('button', { name: 'Topics', exact: true });
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const topicLinks = topicGroup.locator(':scope > .hextra-sidebar-children > ul > li > .hextra-sidebar-item > a');
        await expect(topicLinks).toHaveText(product.topics);
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(topicLinks.first()).not.toBeInViewport();
        await toggle.press('Enter');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await topicGroup.getByRole('link', { name: product.topic.title, exact: true }).click();
        await expect(page).toHaveURL(new URL(`${productPath}${product.topic.slug}/`, page.url()).href);
        await expect(page.locator('#content h1')).toHaveText(product.topic.title);
        if (mobile) {
          await page.getByRole('button', { name: 'Menu', exact: true }).click();
        }
        const activeLink = sidebar.locator('a.hextra-sidebar-active-item:visible');
        await expect(activeLink).toHaveAttribute('href', `${productPath}${product.topic.slug}/`);
        await expect(section.getByRole('button', { name: 'Topics', exact: true })).toHaveAttribute('aria-expanded', 'true');
        await page.goto(`${productPath}installation/`);
        if (mobile) {
          await page.getByRole('button', { name: 'Menu', exact: true }).click();
        }
        await expect(section.getByRole('button', { name: 'Topics', exact: true })).toHaveAttribute('aria-expanded', 'false');
        await expect(section.getByRole('link', { name: 'Installation', exact: true })).toBeVisible();
      });
    }

    test('limits product colors to content links and interaction states in light and dark modes', async ({ page }) => {
      await page.goto('/docs/');
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') {
          await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
        }
        for (const product of products) {
          await page.goto(`/docs/${product.slug}/${product.topic.slug}/`);
          if (mobile) {
            await page.getByRole('button', { name: 'Menu', exact: true }).click();
          }
          const sidebar = page.locator('aside.hextra-sidebar-container');
          const productLink = sidebar.locator(`a[href="/docs/${product.slug}/"]:visible`);
          const section = productLink.locator('..').locator('..');
          await expect(section).toHaveCSS('--learn-product-accent', product.accent);
          expect(await productLink.evaluate(element => getComputedStyle(element, '::before').content))
            .toBe('none');
          const active = section.locator('.hextra-sidebar-active-item');
          await expect(active).toBeVisible();
          await page.mouse.move(0, 0);
          const color = await active.evaluate(element => getComputedStyle(element).color);
          const inactive = section.getByRole('link', { name: 'Installation', exact: true });
          const topicsToggle = section.getByRole('button', { name: 'Topics', exact: true });
          await expect(productLink).not.toHaveCSS('color', color);
          await expect(inactive).not.toHaveCSS('color', color);
          await expect(topicsToggle).not.toHaveCSS('color', color);
          await inactive.hover();
          await expect(inactive).toHaveCSS('color', color);
          await page.mouse.move(0, 0);
          await expect(inactive).not.toHaveCSS('color', color);
          expect(await textContrast(productLink), `${product.slug} label in ${theme} mode`).toBeGreaterThanOrEqual(4.5);
          expect(await textContrast(active), `${product.slug} active topic in ${theme} mode`).toBeGreaterThanOrEqual(4.5);
          await page.keyboard.press('Tab');
          await active.focus();
          await expect(active).toHaveCSS('outline-style', 'solid');
          await expect(active).toHaveCSS('outline-color', color);
          if (mobile) {
            await page.getByRole('button', { name: 'Menu', exact: true }).click();
          }

          await page.goto(`/docs/${product.slug}/${product.article}/`);
          await expect(page.locator('.learn-product-page')).toHaveAttribute('data-product', product.slug);
          const title = page.locator('#content h1');
          await expect(title).not.toHaveCSS('color', color);
          const contentLink = page.locator('#content .content p a[href]').first();
          const breadcrumb = page.locator('#content > div:first-child a').last();
          const pager = page.locator('#content > div > a[title]').first();
          const tocLink = page.locator('.hextra-toc a[href^="#"]').first();
          await expect(contentLink).toHaveCSS('color', color);
          await page.mouse.move(0, 0);
          for (const link of [breadcrumb, pager, tocLink]) {
            await expect(link).not.toHaveCSS('color', color);
          }
          await breadcrumb.hover();
          await expect(breadcrumb).toHaveCSS('color', color);
          expect(await textContrast(contentLink), `${product.slug} article link in ${theme} mode`).toBeGreaterThanOrEqual(4.5);
          await contentLink.hover();
          await expect(contentLink).toHaveCSS('color', color);
          await page.keyboard.press('Tab');
          await contentLink.focus();
          await expect(contentLink).toHaveCSS('outline-color', color);
          if (!mobile) {
            await tocLink.click();
            await expect(tocLink).toHaveClass(/hextra-toc-active/);
            await tocLink.hover();
            await expect(tocLink).toHaveCSS('color', color);
            await page.mouse.move(0, 0);
            await expect(tocLink).not.toHaveCSS('color', color);
          }
          await expect(page.locator('.learn-topbar')).toHaveCSS('--primary-color', theme === 'dark' ? '#6f5cff' : '#2713ff');
        }
      }
    });

    test('opens the topic group for deep links without reordering or truncating workflow guides', async ({ page }) => {
      await page.goto('/docs/hub/workflows/ingest/blocks/detection/');
      await expect(page.locator('.learn-product-page')).toHaveAttribute('data-product', 'hub');
      if (mobile) {
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
      }
      const sidebar = page.locator('aside.hextra-sidebar-container');
      const hub = sidebar.locator('a[href="/docs/hub/"]:visible').locator('..').locator('..');
      await expect(hub.getByRole('button', { name: 'Topics', exact: true })).toHaveAttribute('aria-expanded', 'true');
      const workflows = hub.locator('a[href="/docs/hub/workflows/"]').locator('..').locator('..');
      await expect(workflows.locator(':scope > .hextra-sidebar-children > ul > li > .hextra-sidebar-item > a'))
        .toHaveText(['Stages', 'External stages', 'Triggers', 'Ingest', 'Observability']);
      await expect(workflows.getByRole('link', { name: 'Ingest', exact: true })).toBeVisible();
      await expect(workflows.getByRole('link', { name: 'Blocks', exact: true })).toBeVisible();
      await expect(hub.getByRole('link', { name: 'ANPR stage', exact: true })).toHaveCount(0);
    });

    test('preserves nested Vault provider and API guides', async ({ page }) => {
      for (const route of ['providers/amazon-s3', 'api/signed-urls']) {
        await page.goto(`/docs/vault/${route}/`);
        await expect(page.locator('.learn-product-page')).toHaveAttribute('data-product', 'vault');
        if (mobile) {
          await page.getByRole('button', { name: 'Menu', exact: true }).click();
        }
        const sidebar = page.locator('aside.hextra-sidebar-container');
        const vault = sidebar.locator('a[href="/docs/vault/"]:visible').locator('..').locator('..');
        await expect(vault.getByRole('button', { name: 'Topics', exact: true })).toHaveAttribute('aria-expanded', 'true');
        const parentPath = route.startsWith('providers/') ? 'providers' : 'api';
        const parent = vault.locator(`a[href="/docs/vault/${parentPath}/"]`).locator('..').locator('..');
        const links = parent.locator(':scope > .hextra-sidebar-children > ul > li > .hextra-sidebar-item > a');
        await expect(links).toHaveText(parentPath === 'providers'
          ? ['Amazon S3', 'Azure Storage Account', 'Ceph', 'Google Cloud Storage', 'Minio']
          : ['Signed URLs']);
        await expect(vault.locator(`a[href="/docs/vault/${route}/"]`)).toBeVisible();
      }
    });

    test('hub: links the authentication overview and SSO integration guide', async ({ page }) => {
      await page.goto('/docs/hub/getting-started/');
      const content = page.locator('#content .content');
      await content.getByRole('link', { name: 'Authentication', exact: true }).click();
      await expect(page).toHaveURL(/\/docs\/hub\/authentication\/$/);
      await expect(page.locator('#content h1')).toHaveText('Authentication');
      for (const heading of [
        'Password sign-in', 'Two-factor authentication (2FA)', 'Passkeys',
        'Single sign-on with OIDC', 'Recovery and troubleshooting',
      ]) {
        await expect(content.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
      }
      await content.getByRole('link', { name: 'SSO integration guide', exact: true }).click();
      await expect(page).toHaveURL(/\/docs\/hub\/sso\/$/);
      await content.getByRole('link', { name: 'Authentication', exact: true }).click();
      await expect(page).toHaveURL(/\/docs\/hub\/authentication\/$/);
    });
  });
}

test('keeps footer navigation consistent with each product topic order', async ({ page }) => {
  const cases: [string, string, string?][] = [
    ['hub/installation', 'Getting started', 'Analytics'],
    ['hub/analytics', 'Installation', 'Audit events'],
    ['hub/audit-events', 'Analytics', 'Authentication'],
    ['hub/authentication', 'Audit events', 'Cases'],
    ['hub/pipeline', 'Organisations and projects', 'Recordings'],
    ['hub/workflows', 'White-label', undefined],
    ['agent/installation', 'Getting Started', 'License'],
    ['agent/license', 'Installation', undefined],
    ['factory/installation', 'Getting Started', 'Configuration & engines'],
    ['factory/configuration-and-engines', 'Installation', 'License'],
    ['factory/license', 'Configuration & engines', undefined],
    ['vault/installation', 'Getting Started', 'Accounts'],
    ['vault/api', 'Accounts', 'Configuration'],
    ['vault/providers', 'Machine learning', undefined],
  ];
  for (const [route, previous, next] of cases) {
    await page.goto(`/docs/${route}/`);
    const footerLinks = page.locator('#content > div > a[title]');
    await expect(footerLinks).toHaveText(next ? [previous, next] : [previous]);
  }
});

test('leaves other documentation navigation unchanged', async ({ page }) => {
  await page.goto('/docs/prologue/');
  await expect(page.locator('.learn-product-page')).toHaveCount(0);
  const sidebar = page.locator('aside.hextra-sidebar-container');
  const prologue = sidebar.locator('a[href="/docs/prologue/"]:visible').locator('..').locator('..');
  await expect(prologue.getByRole('button', { name: 'Topics', exact: true })).toHaveCount(0);
  await expect(prologue).not.toHaveAttribute('data-product');
  await expect(prologue.getByRole('link', { name: 'How it works', exact: true })).toBeVisible();
});
