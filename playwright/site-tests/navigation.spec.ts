import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { textContrast } from './utils/contrast';

test('keeps company naming out of editorial content while preserving technical identifiers and legal notices', () => {
  const contentRoot = resolve(__dirname, '../../app/content');
  const companyNaming = /(?<![\w./@-])(?:augment\s+vision|uug(?:\.ai)?)(?![\w/@-]|\.\w)/i;
  for (const file of readdirSync(contentRoot, { recursive: true })) {
    if (!file.endsWith('.md')) continue;
    const editorial = readFileSync(join(contentRoot, file), 'utf8').replace(/^Copyright[^\n]*$/gm, '');
    expect(editorial, file).not.toMatch(companyNaming);
  }
});

test('uses UUG header and favicon artwork while retaining Learn metadata', async ({ page, request }) => {
  for (const path of ['/', '/docs/', '/docs/prologue/', '/docs/prologue/how/', '/docs/prologue/mission/',
    '/docs/prologue/glossary/', '/docs/agent/license/', '/docs/factory/license/', '/docs/vault/license/',
    '/guides/', '/guides/onboarding/', '/guides/platform-engineering/',
    '/tutorials/hub/apply-mongodb-indexes/', '/release-notes/']) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: 'UUG', exact: true })).toHaveAttribute('href', '/');
    await expect(page).toHaveTitle(/Learn$/);
    expect(await page.title()).not.toMatch(/augment vision|\buug\b/i);
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /augment vision|\buug\b/i);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Learn');
    await expect(page.locator('link[rel="icon shortcut"]')).toHaveAttribute('href', '/favicon.ico?v=uug-midnight');
    for (const size of [16, 32]) {
      await expect(page.locator(`link[rel="icon"][sizes="${size}x${size}"]`))
        .toHaveAttribute('href', `/favicon-${size}x${size}.png?v=uug-midnight`);
    }
    await expect(page.locator('link[rel="apple-touch-icon"]'))
      .toHaveAttribute('href', '/apple-touch-icon.png?v=uug-midnight');
    await expect(page.locator('link[rel="manifest"]'))
      .toHaveAttribute('href', '/site.webmanifest?v=uug-midnight');
  }
  await page.goto('/docs/prologue/glossary/');
  await expect(page.locator('#ecosystem')).toHaveCount(1);
  await expect(page.locator('#augment-vision')).toHaveCount(1);
  await page.goto('/tutorials/hub/apply-mongodb-indexes/');
  await expect(page.locator('.tutorial-byline__name')).toHaveText('Cedric Verstraeten');
  await expect(page.locator('.tutorial-byline__avatar')).toHaveAttribute('src', 'https://github.com/cedricve.png?size=72');

  const manifestResponse = await request.get('/site.webmanifest');
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ name: 'Learn', short_name: 'Learn' });
  for (const icon of manifest.icons) {
    expect(icon.src).toContain('?v=uug-midnight');
    expect((await request.get(icon.src)).status()).toBe(200);
  }
  for (const [icon, hash] of Object.entries({
    'favicon.ico': 'd9b96051c5b6a75741d9e1c8983c0e6bd1f971fa99d36de1a7a6e8ab0e4bb9eb',
    'favicon-16x16.png': '03bfeb9505d5b58423fbc6076f407a539d1efccf6f8a71a19bb8b5ab94eae409',
    'favicon-32x32.png': '65bdd9cb2cafbd9e55900d3f6ee70720a5389742c4a43bf4b058b58e92938412',
    'apple-touch-icon.png': 'ed86bd5522deaab2219720cab66498fe9e50185df94d4d28b8f67f97e58e46be',
    'android-chrome-192x192.png': 'f0da0ec1c130d0548c8efb2ef1a1ff6010fc7908b3ebeadb9028e7c7bed9d8d2',
    'android-chrome-512x512.png': '5e2b33290650b5c951941de7ce664abb517f6809d50903050b4570b18c8bb04f',
  })) {
    const response = await request.get(`/${icon}?v=uug-midnight`);
    expect(response.status(), icon).toBe(200);
    expect(createHash('sha256').update(await response.body()).digest('hex'), icon).toBe(hash);
  }
});

test('uses muted gray-yellow warning boxes in both themes', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.goto('/tutorials/hub/apply-mongodb-indexes/');
      await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      const warning = page.locator('.content [class~="hx:bg-amber-100"]').first();
      await expect(warning).toBeVisible();
      await expect(warning).toContainText('The current checker compares and applies');
      await expect(warning).toHaveCSS('background-color', theme === 'dark' ? 'rgb(41, 40, 32)' : 'rgb(243, 241, 231)');
      await expect(warning).toHaveCSS('border-top-color', theme === 'dark' ? 'rgb(81, 76, 56)' : 'rgb(215, 208, 182)');
      await expect(warning).toHaveCSS('color', theme === 'dark' ? 'rgb(212, 207, 185)' : 'rgb(98, 91, 69)');
      await expect(warning.locator('svg')).toBeVisible();
      expect(await textContrast(warning)).toBeGreaterThanOrEqual(4.5);
      const bounds = await warning.boundingBox();
      if (!bounds) throw new Error('The warning box must have layout bounds');
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
  }
});

test('uses blue-purple tutorial hyperlinks in both themes', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.goto('/tutorials/hub/apply-mongodb-indexes/');
      await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      const color = theme === 'dark' ? 'rgb(156, 143, 255)' : 'rgb(39, 19, 255)';
      const link = page.locator('.content p a').filter({ hasText: 'CLI' }).first();
      await expect(link).toHaveCSS('color', color);
      await expect(link).toHaveCSS('text-decoration-line', 'underline');
      expect(await textContrast(link)).toBeGreaterThanOrEqual(4.5);
      await link.hover();
      await expect(link).toHaveCSS('color', color);
      await link.focus();
      await expect(link).toHaveCSS('color', color);
      await expect(link).toBeFocused();
      await expect(page.locator('.tutorial-byline__author')).not.toHaveCSS('color', color);
    }
  }
});

test('uses solid backgrounds for branded tutorial panels in both themes', async ({ page }) => {
  for (const path of ['/tutorials/hub/apply-mongodb-indexes/', '/tutorials/agent/connect-any-camera/']) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.goto(path);
        await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
        const panel = page.locator('.tutorial-panel--brand').first();
        await expect(panel).toBeVisible();
        await expect(panel).toHaveCSS('background-image', 'none');
        await expect(panel).toHaveCSS('background-color', theme === 'dark' ? 'rgb(28, 28, 42)' : 'rgb(239, 234, 251)');
        await expect(panel.locator('.tutorial-panel__title')).toHaveText("What you'll do");
        expect(await textContrast(panel.locator('.tutorial-panel__title'))).toBeGreaterThanOrEqual(4.5);
        expect(await textContrast(panel.locator('li').first())).toBeGreaterThanOrEqual(4.5);
        const bounds = await panel.boundingBox();
        if (!bounds) throw new Error('The tutorial panel must have layout bounds');
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      }
    }
  }
});

test('shows the Claude and UUG banner on the tutorial and its catalog card', async ({ page, request }) => {
  const tutorials = [
    {
      path: '/tutorials/hub/connect-mcp-to-claude/', title: 'Connect Hub MCP to Claude Code',
      alt: 'Claude and UUG logos side by side on a black background.',
    },
    {
      path: '/tutorials/hub/connect-your-vms-to-claude/', title: 'Connect your VMS to Claude',
      alt: 'Claude and the platform wordmark side by side on a black background.',
    },
  ];
  const artworkPath = '/images/tutorial-claude-uug.svg';
  const artwork = await request.get(artworkPath);
  expect(artwork.ok()).toBe(true);
  expect(artwork.headers()['content-type']).toContain('image/svg+xml');
  const svg = await artwork.text();
  expect(svg).toContain('fill="#000"');
  expect(svg).toContain('>Claude</text>');
  expect(svg).toContain('id="uug-wordmark" aria-label="UUG" data-font-family="Outfit" data-font-weight="600"');
  expect(svg).not.toContain('Arial');

  for (const tutorial of tutorials) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.goto(tutorial.path);
        await expect(page.locator('.tutorial-byline__name')).toHaveText('Cedric Verstraeten');
        await expect(page.locator('.tutorial-byline__author')).toHaveAttribute('href', 'https://github.com/cedricve');
        await expect(page.locator('.tutorial-byline__avatar')).toHaveAttribute('src', 'https://github.com/cedricve.png?size=72');
        await page.evaluate((mode) => {
          document.documentElement.classList.toggle('dark', mode === 'dark');
        }, theme);
        const banner = page.locator('.tutorial-header img');
        await expect(banner).toHaveAttribute('src', artworkPath);
        await expect(banner).toHaveAttribute('alt', tutorial.alt);
        await expect(banner).toBeVisible();
        await expect(banner).toHaveJSProperty('complete', true);
        await expect(banner).toHaveJSProperty('naturalWidth', 1200);
        const bounds = await banner.boundingBox();
        if (!bounds) throw new Error('The Claude tutorial banner must have layout bounds');
        expect(bounds.width / bounds.height).toBeCloseTo(10 / 3, 1);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        const pixel = await sharp(await banner.screenshot())
          .extract({ left: 20, top: 20, width: 1, height: 1 })
          .removeAlpha().raw().toBuffer();
        expect([...pixel]).toEqual([0, 0, 0]);
      }
    }
  }

  await page.goto('/tutorials/');
  for (const tutorial of tutorials) {
    const card = page.locator('.tutorial-card').filter({
      has: page.getByRole('heading', { name: tutorial.title, exact: true }),
    }).first();
    await expect(card.locator('.tutorial-card__media')).toHaveAttribute('href', tutorial.path);
    await expect(card.locator('.tutorial-card__media img')).toHaveAttribute('src', artworkPath);
    await expect(card.locator('.tutorial-card__media img')).toHaveJSProperty('naturalWidth', 1200);
  }
});

test('shows MongoDB and CLI artwork with Cedric as the indexes tutorial author', async ({ page, request }) => {
  const path = '/tutorials/hub/apply-mongodb-indexes/';
  const artworkPath = '/images/tutorial-mongodb-cli.svg';
  const artwork = await request.get(artworkPath);
  expect(artwork.ok()).toBe(true);
  expect(await artwork.text()).toContain('<title>MongoDB and CLI</title>');

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.goto(path);
      await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      await expect(page.locator('.tutorial-byline__name')).toHaveText('Cedric Verstraeten');
      await expect(page.locator('.tutorial-byline__author')).toHaveAttribute('href', 'https://github.com/cedricve');
      const banner = page.locator('.tutorial-header img');
      await expect(banner).toHaveAttribute('src', artworkPath);
      await expect(banner).toHaveAttribute('alt', 'MongoDB logo and a CLI terminal side by side on a black background.');
      await expect(banner).toHaveJSProperty('naturalWidth', 1200);
      const bounds = await banner.boundingBox();
      if (!bounds) throw new Error('The MongoDB tutorial banner must have layout bounds');
      expect(bounds.width / bounds.height).toBeCloseTo(10 / 3, 1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      const pixel = await sharp(await banner.screenshot())
        .extract({ left: 20, top: 20, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
      expect([...pixel]).toEqual([0, 0, 0]);
    }
  }

  await page.goto('/tutorials/');
  const card = page.locator('.tutorial-card').filter({
    has: page.getByRole('heading', { name: 'Apply MongoDB indexes with the CLI', exact: true }),
  }).first();
  await expect(card.locator('.tutorial-card__media img')).toHaveAttribute('src', artworkPath);
  await expect(card.locator('.tutorial-card__media img')).toHaveJSProperty('naturalWidth', 1200);
});

test('publishes the Claude web connector tutorial with working screenshots and cross-links', async ({ page, request }) => {
  const path = '/tutorials/hub/connect-your-vms-to-claude/';
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Connect your VMS to Claude', exact: true })).toBeVisible();
  for (const heading of [
    '1. Create a dedicated Hub access token', '2. Open Claude',
    '3. Enter your VMS endpoint', '4. Configure authentication and request headers',
    '5. Enable the connector in a conversation', '6. Search recordings, then request one link',
    '7. Disconnect or rotate the token', 'Troubleshooting',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  const content = page.locator('main');
  await expect(content).toContainText('No sign-in');
  await expect(content).toContainText('Streamable HTTP');
  await expect(content).toContainText('Bearer <HUB_ACCESS_TOKEN>');
  await expect(content).toContainText('do not need to add an Accept override');
  for (const filename of ['claude-connector-endpoint.webp', 'claude-connector-authentication.webp']) {
    const image = content.locator(`img[src$="${filename}"]`);
    await expect(image).toHaveCount(1);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    await expect(image).toHaveJSProperty('naturalWidth', 1600);
    const aspectRatio = await image.evaluate((element: HTMLImageElement) => element.naturalWidth / element.naturalHeight);
    expect(aspectRatio).toBeCloseTo(1.6, 2);
    expect((await request.get(`${path}${filename}`)).ok()).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const source of ['/tutorials/hub/', '/docs/hub/mcp/', '/tutorials/hub/connect-mcp-to-claude/']) {
    await page.goto(source);
    await expect(page.locator(`main a[href="${path}"]`).first()).toBeVisible();
  }
});

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
      'Organisations and projects', 'Pipeline', 'Quickstart', 'Recordings', 'Roles', 'SSO',
      'White-label', 'Workflows',
    ],
    topic: { slug: 'organisations', title: 'Organisations and projects' },
  },
  {
    slug: 'agent',
    accent: '#933734',
    article: 'first-things-first',
    gettingStarted: 'Getting Started',
    topics: ['Connect to Hub', 'Connect to Vault', 'License'],
    topic: { slug: 'license', title: 'License' },
  },
  {
    slug: 'factory',
    accent: '#4a786a',
    article: 'getting-started',
    gettingStarted: 'Getting Started',
    topics: ['Configuration & engines', 'License', 'Quickstart'],
    topic: { slug: 'configuration-and-engines', title: 'Configuration & engines' },
  },
  {
    slug: 'vault',
    accent: '#56618f',
    article: 'getting-started',
    gettingStarted: 'Getting Started',
    topics: ['Accounts', 'API', 'Configuration', 'Forwarding', 'Integrations', 'License', 'Machine learning', 'Providers', 'Quickstart'],
    topic: { slug: 'accounts', title: 'Accounts' },
  },
];

test('hub: links installation to a multi-service Kubernetes quickstart and states the Docker limitation', async ({ page }) => {
  await page.goto('/docs/hub/installation/');
  await page.locator('#content').getByRole('link', { name: 'Quickstart', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/hub\/quickstart\/$/);
  const content = page.locator('#content');
  await expect(content.locator('h1')).toHaveText('Quickstart');
  await expect(content.locator('h2')).toHaveText(['Docker', 'Kubernetes']);
  await expect(content).toContainText('There is no verified standalone Docker quickstart');
  await expect(content.locator('pre').filter({ hasText: 'helm upgrade --install hub' }))
    .toContainText('--version 0.170.1');
  await expect(content.locator('pre').filter({ hasText: 'svc/hub-api-svc' }))
    .toContainText('8081:8081');
  await expect(content.locator('pre').filter({ hasText: 'svc/hub-frontend-svc' }))
    .toContainText('8080:80');
  await expect(content).toContainText('Replace both seeded users');
});

test('vault: links the installation guide to the Docker and Kubernetes quickstart', async ({ page }) => {
  await page.goto('/docs/vault/installation/');
  await page.locator('#content').getByRole('link', { name: 'Quickstart', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/vault\/quickstart\/$/);
  await expect(page.locator('#content h1')).toHaveText('Quickstart');
  await expect(page.locator('#content h2')).toHaveText(['Docker', 'Kubernetes', 'Store your first recording']);
  await expect(page.locator('#content pre').filter({ hasText: 'docker run -d --name kerberos-vault' }))
    .toContainText('ghcr.io/uug-ai/vault:v1.7.19');
  await expect(page.locator('#content pre').filter({ hasText: 'kubectl rollout status' }))
    .toContainText('kubectl port-forward -n kerberos-vault svc/vault-nodeport 8080:80');
});

for (const width of [320, 390, 767, 768, 900, 1024, 1280]) {
  test(`navbar: keeps website text and icon spacing without overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/docs/hub/');
    await page.evaluate(() => document.fonts.ready);
    const header = page.locator('.learn-topbar');
    const brand = header.locator('.learn-topbar-brand');
    const brandText = header.locator('.learn-topbar-brand-text');
    const toggle = header.locator('.learn-theme-toggle');
    const github = header.getByRole('link', { name: 'GitHub', exact: true });

    for (const theme of ['light', 'dark']) {
      await expect(brand).toHaveText('UUG');
      await expect(brand).toHaveAttribute('href', '/');
      await expect(brandText).toHaveCSS('font-family', 'Outfit, sans-serif');
      await expect(brandText).toHaveCSS('font-size', '18.4px');
      await expect(brandText).toHaveCSS('font-weight', '600');
      await expect(brandText).toHaveCSS('letter-spacing', '2.208px');
      await expect(toggle).toHaveAttribute('aria-pressed', String(theme === 'dark'));
      await expect(github).toHaveAttribute('href', 'https://github.com/uug-ai/documentation');
      await expect(github).toHaveAttribute('target', '_blank');
      await expect(github).toHaveAttribute('rel', 'noreferrer');
      for (const control of [toggle, github]) {
        await expect(control).toHaveCSS('width', '44px');
        await expect(control).toHaveCSS('height', '44px');
      }

      const bounds = await header.evaluate(element => {
        const box = (selector: string) => {
          const target = element.querySelector(selector);
          if (!target) throw new Error(`Missing navbar element: ${selector}`);
          return target.getBoundingClientRect();
        };
        const toggle = box('.learn-theme-toggle');
        const github = box('.learn-topbar-icon-link');
        const children = [...element.querySelectorAll('.learn-topbar-inner > *')]
          .map(child => child.getBoundingClientRect())
          .filter(rect => rect.width > 0);
        return {
          centerGap: github.x + github.width / 2 - toggle.x - toggle.width / 2,
          brandWidth: box('.learn-topbar-brand').width,
          textWidth: box('.learn-topbar-brand-text').width,
          gaps: children.slice(1).map((child, index) => child.left - children[index].right),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      expect(bounds.centerGap).toBe(50);
      expect(bounds.brandWidth).toBeGreaterThanOrEqual(bounds.textWidth);
      expect(bounds.gaps.every(gap => gap >= -0.5)).toBe(true);
      expect(bounds.overflow).toBe(0);
      if (width >= 768) {
        await expect(header.locator('.learn-topbar-inner')).toHaveCSS('column-gap', '8px');
        const search = header.getByRole('searchbox');
        await search.focus();
        await expect(search).toBeFocused();
        await search.fill('Hub');
        await expect(search).toHaveValue('Hub');
        await search.fill('');
        await search.press('Escape');
      }
      await toggle.focus();
      await toggle.press('Enter');
    }

    if (width < 768) {
      await header.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(page.locator('aside.hextra-sidebar-container')).toBeInViewport();
      await expect(page.locator('aside.hextra-sidebar-container')
        .getByRole('link', { name: 'Documentation', exact: true })).toBeVisible();
    } else {
      const knowledgeBase = header.getByRole('button', { name: 'Knowledge base', exact: true });
      await knowledgeBase.click();
      await expect(header.getByRole('link', { name: /Tutorials/ })).toBeVisible();
    }
  });
}

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile product navigation' : 'desktop product navigation', () => {
    test.use({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      colorScheme: 'light',
    });

    test('matches the website and design header height across pages and themes', async ({ page }) => {
      for (const path of ['/', '/docs/hub/', '/tutorials/']) {
        await page.goto(path);
        const header = page.locator('.learn-topbar');
        const inner = page.getByRole('navigation', { name: 'Primary navigation' });
        const control = header.locator('.learn-topbar-control');
        for (const theme of ['light', 'dark']) {
          if (theme === 'dark') {
            await header.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
          }
          await expect(header).toHaveCSS('height', '77px');
          await expect(inner).toHaveCSS('height', '76px');
          await expect(control).toHaveCSS('height', '44px');
          expect(await header.evaluate(element => getComputedStyle(element, '::before').height))
            .toBe('4px');
        }
        await header.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
      }
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
          new RegExp(`Kerberos ${product.slug}`, 'i'));
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
      // The page overview starts collapsed; open it so its links can be checked.
      await page.addInitScript(() => localStorage.setItem('hextra-toc-collapsed', '0'));
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
          const contentLink = page.locator('#content .content p a[href]:not(.learn-xlink)').first();
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
    ['agent/installation', 'Getting Started', 'Connect to Hub'],
    ['agent/connect-to-vault', 'Connect to Hub', 'License'],
    ['agent/license', 'Connect to Vault', undefined],
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

test('colours cross-product links by destination and lists counterparts under Works with', async ({ page }) => {
  await page.goto('/docs/vault/getting-started/');
  const vaultColor = await page.locator('#content .content p a[href]:not(.learn-xlink)').first()
    .evaluate(element => getComputedStyle(element).color);

  await page.goto('/docs/agent/connect-to-vault/');
  const agentLink = page.locator('#content .content a[href^="/docs/agent/"]').first();
  const crossLink = page.locator('#content .content a.learn-xlink[href="/docs/vault/accounts/"]').first();
  await expect(crossLink).toHaveAttribute('data-product', 'vault');
  await expect(crossLink).toHaveCSS('color', vaultColor);
  await expect(agentLink).not.toHaveClass(/learn-xlink/);
  await expect(agentLink).not.toHaveCSS('color', vaultColor);
  await expect(crossLink.locator('.learn-sr-only')).toHaveText(' (Vault documentation)');
  expect(await textContrast(crossLink), 'cross-product link').toBeGreaterThanOrEqual(4.5);

  const panel = page.locator('#content aside.learn-works-with');
  await expect(panel.getByRole('heading', { name: 'Works with' })).toBeVisible();
  const cards = panel.locator('a.learn-works-with-card');
  await expect(cards.first()).toHaveAttribute('href', '/docs/vault/accounts/');
  await expect(cards.first()).toHaveAttribute('data-product', 'vault');
  await expect(cards.first().locator('.learn-works-with-product')).toHaveText('Vault');

  await page.goto('/docs/agent/license/');
  await expect(page.locator('#content aside.learn-works-with')).toHaveCount(0);
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
