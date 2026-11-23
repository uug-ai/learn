import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { textContrast } from './utils/contrast';

const article = '/blog/arcules-vs-augment-vision/';
const legacy = '/tutorials/hub/arcules-vs-augment-vision/';
const title = 'Milestone Arcules vs UUG: managed simplicity or architectural control?';
const altaArticle = '/blog/avigilon-alta-vs-augment-vision/';
const altaTitle = 'Avigilon Alta vs UUG: cloud video service or composable stack?';
const securityArticle = '/blog/zero-known-cves/';
const securityTitle = 'No ignore file: how UUG ships video software with zero known CVEs';
const comparisons = [
  {
    path: article, brand: 'Milestone Arcules', label: 'Arcules',
    screenshot: {
      file: 'arcules-views.webp', width: 1916, height: 910,
      source: 'https://help.arcules.com/en/articles/2042903-views',
    },
    diagrams: [
      { nodes: 7, connections: 5, label: /Responsibility boundaries/ },
      { nodes: 9, connections: 5, label: /Four recording paths/ },
      { nodes: 4, connections: 3, label: /A WAN outage/ },
    ],
  },
  {
    path: altaArticle, brand: 'Avigilon Alta', label: 'Alta',
    screenshot: {
      file: 'alta-video-view.webp', width: 1915, height: 1017,
      source: 'https://docs.avigilon.com/bundle/alta-video/page/Products/aware/vidview/awarevideoview.htm',
    },
    diagrams: [
      { nodes: 7, connections: 5, label: /Operating boundaries/ },
      { nodes: 7, connections: 5, label: /Storage choices/ },
      { nodes: 6, connections: 4, label: /Integration models/ },
    ],
  },
];

test('blog catalog uses illustrated editorial cards and working topic links', async ({ page, request }) => {
  await page.goto('/blog/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');
  await expect(page.getByRole('heading', { name: 'Latest stories' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All articles' })).toBeVisible();
  const featured = page.locator('.blog-card.tutorial-card--featured');
  await expect(featured.getByRole('heading')).toHaveText(securityTitle);
  await expect(featured.locator('.tutorial-card__media')).toHaveAttribute('href', securityArticle);
  await expect(featured.locator('.iso-illustration svg.iso-figure--blog-release-gate')).toBeVisible();
  const headerImage = page.locator('.blog-card .blog-artwork--image img').first();
  await expect(headerImage).toBeVisible();
  await expect(headerImage).toHaveCSS('object-fit', 'contain');
  await expect(page.locator('.blog-card .iso-illustration svg').first()).toBeVisible();
  await expect(page.locator('.blog-card .iso-front').first()).not.toHaveCSS('fill', 'rgb(0, 0, 0)');
  await expect(page.locator('.blog-card .iso-illustration a')).toHaveCount(0);
  await expect(featured.locator('.tutorial-card__meta')).toContainText(/\d+ min read/);
  await expect(featured.locator('time')).toHaveAttribute('datetime', '2026-11-23');
  await expect(page.locator('.blog-card.tutorial-card--catalog')).toHaveCount(5);
  const topics = await page.locator('.blog-card .tutorial-card__tags a').evaluateAll(links =>
    [...new Set(links.map(link => link.getAttribute('href')))],
  );
  expect(topics.length).toBeGreaterThan(0);
  for (const topic of topics) {
    expect((await request.get(topic!)).status(), topic!).toBe(200);
  }
});

test('blog layouts fit mobile and desktop in both themes with readable text', async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/blog/', article, altaArticle, '/blog/2025-11-14-new-learning-platform/']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
        await expect(page.locator('h1')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} ${theme} ${width}`)
          .toBeLessThanOrEqual(width);
        const lead = page.locator(route === '/blog/' ? '.tutorial-catalog__lead' : '.blog-article__lead');
        expect(await textContrast(lead)).toBeGreaterThanOrEqual(4.5);
        if (route === '/blog/') {
          const card = page.locator('.blog-card.tutorial-card--catalog').first();
          await expect(card.locator('.tutorial-card__body > p')).toBeVisible();
          expect(await textContrast(card.locator('.tutorial-card__body > p'))).toBeGreaterThanOrEqual(4.5);
        } else {
          await expect(page.locator(`.blog-article__artwork ${[article, altaArticle].includes(route) ? 'img' : 'svg'}`)).toBeVisible();
          await expect(page.locator('.blog-byline')).toContainText(/\d+ min read/);
        }
      }
    }
  }
});

comparisons.forEach(comparison => test(`blog comparison ${comparison.brand} uses the branded banner and three working explanatory drawings`, async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(comparison.path, { waitUntil: 'domcontentloaded' });
  const banner = page.locator('.blog-article__artwork img');
  await expect(banner).toHaveAttribute('alt', new RegExp(`^${comparison.brand} versus UUG,`));
  await expect(banner).toHaveAttribute('src', `${comparison.path}header-art.svg`);
  expect(await banner.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const response = await request.get(`${comparison.path}header-art.svg`);
  expect(response.status()).toBe(200);
  const artwork = await response.text();
  expect(artwork).toContain('data:image/svg+xml;base64,');
  expect(artwork).toContain('id="uug-wordmark"');
  expect(artwork).toContain(`>${comparison.label}</text>`);
  expect(artwork).not.toContain('Hercules');
  expect(artwork).toContain(`<title>${comparison.brand} versus UUG</title>`);
  expect(artwork).not.toMatch(/Augment Vision/i);
  await expect(page.locator('.blog-article')).not.toContainText(/Augment Vision/i);
  const expected = comparison.diagrams;
  const figures = page.locator('.content .rete-diagram-figure');
  await expect(figures).toHaveCount(expected.length);
  await expect(page.locator('link[href*="/css/rete-diagram."]')).toHaveCount(1);
  await expect(page.locator('script[src*="/js/rete-diagram."]')).toHaveCount(1);
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      for (const [index, counts] of expected.entries()) {
        const figure = figures.nth(index);
        const diagram = figure.locator('.rete-diagram');
        await diagram.scrollIntoViewIfNeeded();
        await expect(diagram).toHaveAttribute('role', 'img');
        await expect(diagram).toHaveAttribute('aria-label', counts.label);
        expect(await diagram.getAttribute('aria-label')).not.toMatch(/Augment Vision/i);
        expect(await diagram.getAttribute('data-rete-config')).not.toMatch(/Augment Vision/i);
        await expect(diagram.locator('.rete-node')).toHaveCount(counts.nodes);
        await expect(diagram.locator('.rete-connection')).toHaveCount(counts.connections);
        await expect(figure.locator('figcaption')).toBeVisible();
        if (width === 375) {
          expect((await diagram.boundingBox())!.height).toBeLessThanOrEqual(320);
        }
        const clipped = await diagram.evaluate(container => {
          const bounds = container.getBoundingClientRect();
          return [...container.querySelectorAll('.rete-node')].some(node => {
            const box = node.getBoundingClientRect();
            return box.left < bounds.left - 1 || box.right > bounds.right + 1
              || box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1;
          });
        });
        expect(clipped, `diagram ${index + 1}, ${width}px, ${theme}`).toBe(false);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const first = figures.first().locator('.rete-diagram');
    await first.scrollIntoViewIfNeeded();
    await first.getByRole('button', { name: 'Toggle fullscreen' }).click();
    await expect(first).toHaveClass(/rete-diagram--pseudo-fullscreen/);
    await expect.poll(async () => (await first.boundingBox())!.height).toBe(900);
    await first.getByRole('button', { name: 'Toggle fullscreen' }).click();
    await expect(first).not.toHaveClass(/rete-diagram--pseudo-fullscreen/);
  }
  expect(errors).toEqual([]);
}));

comparisons.forEach(comparison => test(`blog comparison ${comparison.brand} includes sourced application screenshots`, async ({ page, request }) => {
  await page.goto(comparison.path, { waitUntil: 'domcontentloaded' });
  const expected = [
    { ...comparison.screenshot, path: `${comparison.path}${comparison.screenshot.file}` },
    {
      path: '/docs/hub/analytics/hub-analytics-overview.png', width: 1450, height: 750,
      source: '/docs/hub/analytics/',
    },
    {
      path: '/docs/hub/workflows/images/hub-workflow-designer.png', width: 1944, height: 1328,
      source: '/docs/hub/workflows/external-stages/',
    },
    {
      path: '/images/blog/uug-hub-recordings.webp', width: 2900, height: 1500,
      source: '/docs/hub/recordings/',
    },
  ];
  const figures = page.locator('.content .blog-product-image');
  await expect(figures).toHaveCount(expected.length);
  await expect(figures.nth(1).locator('xpath=preceding-sibling::h2[1]'))
    .toContainText('What is actually being compared?');
  await expect(figures.nth(1).locator('figcaption')).toContainText(/UUG Hub.s analytics dashboard/);
  for (const [index, screenshot] of expected.entries()) {
    const figure = figures.nth(index);
    const image = figure.locator('img');
    expect(await image.evaluate((img: HTMLImageElement) => new URL(img.src).pathname)).toBe(screenshot.path);
    await expect(image).toHaveAttribute('alt', /application.*showing/i);
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('width', String(screenshot.width));
    await expect(image).toHaveAttribute('height', String(screenshot.height));
    expect(await figure.locator(':scope > a').evaluate((link: HTMLAnchorElement) => new URL(link.href).pathname))
      .toBe(screenshot.path);
    await expect(figure.locator('figcaption a')).toHaveAttribute('href', screenshot.source);
    const response = await request.get(screenshot.path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain(screenshot.path.endsWith('.png') ? 'image/png' : 'image/webp');
    const body = await response.body();
    expect(body.byteLength).toBeLessThan(400 * 1024);
    const metadata = await sharp(body).metadata();
    expect([metadata.width, metadata.height]).toEqual([screenshot.width, screenshot.height]);
    if (screenshot.source.startsWith('/')) {
      expect((await request.get(screenshot.source)).status()).toBe(200);
    }
  }
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      for (const [index, screenshot] of expected.entries()) {
        const figure = figures.nth(index);
        const image = figure.locator('img');
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((img: HTMLImageElement) => img.decode());
        expect(await image.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]))
          .toEqual([screenshot.width, screenshot.height]);
        const box = (await image.boundingBox())!;
        expect(box.width / box.height).toBeCloseTo(screenshot.width / screenshot.height, 2);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await expect(image).toHaveCSS('object-fit', 'contain');
        expect(await textContrast(figure.locator('figcaption'))).toBeGreaterThanOrEqual(4.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
}));

comparisons.forEach(comparison => test(`blog comparison ${comparison.brand} explains custom AI model workflows`, async ({ page, request }) => {
  await page.goto(comparison.path, { waitUntil: 'domcontentloaded' });
  const heading = page.getByRole('heading', { level: 2, name: 'AI: packaged analytics versus custom-model workflows' });
  await expect(heading).toBeVisible();
  const section = await heading.evaluate(element => {
    const text: string[] = [];
    for (let sibling = element.nextElementSibling; sibling && sibling.tagName !== 'H2'; sibling = sibling.nextElementSibling) {
      text.push(sibling.textContent ?? '');
    }
    return text.join(' ');
  });
  for (const capability of ['Bring your own models', 'Chain AI stages', 'Choose where inference runs',
    'Bring results back into Hub', 'Python', 'vision-language model', 'PPE detector',
    'RabbitMQ or HTTPS', 'authenticated callback', 'detections', 'timeline markers',
    'Helm deployment configuration', 'Hosted availability depends on the service scope',
    'model quality']) {
    expect(section).toContain(capability);
  }
  await expect(page.getByRole('row').filter({ hasText: 'AI and model choice' }))
    .toContainText('Bring your own AI models through custom workflow stages');
  for (const path of ['/docs/hub/workflows/stages/', '/docs/hub/workflows/external-stages/',
    '/docs/hub/workflows/ingest/blocks/']) {
    await expect(page.locator(`.content a[href="${path}"]`).first()).toBeVisible();
    expect((await request.get(path)).status()).toBe(200);
  }
}));

test('Alta blog comparison distinguishes products and covers documented storage and integration options', async ({ page, request }) => {
  const response = await page.goto(altaArticle, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText(altaTitle);
  for (const detail of ['first-party comparison', 'Alta Video', 'Alta Access', 'Avigilon Unity',
    'Cloud Connectors', 'Storage Connect', 'CIFS', 'S3-compatible', 'APIs', 'chain-of-custody']) {
    await expect(page.locator('.content')).toContainText(detail);
  }
  await expect(page.locator('.content h2').filter({ hasText: /^\d+\./ })).toHaveCount(0);
  await expect(page.locator('.content')).not.toContainText("What you'll produce");
  await expect(page.locator('.content a[href="https://www.avigilon.com/vms/cloud"]').first()).toBeVisible();
  await expect(page.locator('.content a[href*="snp-verifyexport.htm"]').first()).toBeVisible();
  const links = await page.locator('.content a[href^="/"]').evaluateAll(nodes =>
    [...new Set(nodes.map(node => node.getAttribute('href')!.split('#')[0]))],
  );
  for (const link of links) expect((await request.get(link)).status(), link).toBe(200);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`${altaArticle}</loc>`);
  await page.goto('/tutorials/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(`a[href="${altaArticle}"]`)).toHaveCount(0);
});

test('blog comparison is editorial, preserves the old URL and leaves the tutorial catalog', async ({ page, request }) => {
  const alias = await request.get(legacy);
  expect(alias.status()).toBe(200);
  expect(await alias.text()).toContain(`content="0; url=${article}"`);
  await page.goto(legacy, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(new RegExp(`${article}$`));
  await expect(page.locator('h1')).toHaveText(title);
  await expect(page.locator('.blog-article__header .tutorial-section-heading__eyebrow')).toHaveCount(0);
  await expect(page.locator('.content')).toContainText('first-party comparison');
  await expect(page.locator('.tutorial-meta, .tutorial-byline')).toHaveCount(0);
  await expect(page.locator('.content h2').filter({ hasText: /^\d+\./ })).toHaveCount(0);
  await expect(page.locator('.content')).not.toContainText("What you'll produce");
  expect((await request.get(`${legacy}social.png`)).status()).toBe(200);
  await page.goto('/tutorials/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(`a[href="${legacy}"], a[href="${article}"]`)).toHaveCount(0);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`${article}</loc>`);
  expect(sitemap).not.toContain(`${legacy}</loc>`);
});

test('blog article keeps page overview controls and internal links working', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(article, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Show page overview', exact: true }).click();
  const overview = page.getByRole('navigation', { name: 'Table of contents', exact: true });
  await expect(overview).toBeVisible();
  await overview.getByRole('link', { name: 'The comparison at a glance', exact: true }).click();
  await expect(page).toHaveURL(/#the-comparison-at-a-glance$/);
  await page.getByRole('button', { name: 'Collapse page overview', exact: true }).click();
  await expect(overview).toBeHidden();
  const links = await page.locator('.content a[href^="/"]').evaluateAll(nodes =>
    [...new Set(nodes.map(node => node.getAttribute('href')!.split('#')[0]))],
  );
  for (const link of links) expect((await request.get(link)).status(), link).toBe(200);
});

test('blog articles retain authors, podcast controls and dated metadata', async ({ page }) => {
  await page.goto('/blog/2025-11-14-new-learning-platform/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.blog-byline__author')).toHaveText('Cedric Verstraeten');
  await expect(page.locator('.blog-byline__author')).toHaveAttribute('href', 'https://github.com/cedricve');
  await expect(page.locator('.blog-byline time').first()).toHaveAttribute('datetime', '2025-11-14');
  await expect(page.locator('.blog-article__lead')).toContainText('A new learning platform to consolidate');
  const listen = page.getByRole('button', { name: 'Listen to the overview', exact: true });
  await listen.click();
  await expect(page.getByRole('region', { name: 'Article podcast' })).toBeVisible();
  await expect(page.locator('.blog-article__header .tutorial-section-heading__eyebrow')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'All articles', exact: true })).toHaveCount(0);
  await page.locator('main a[href$="/blog/"]', { hasText: 'Blog' }).first().click();
  await expect(page).toHaveURL(/\/blog\/$/);
});

test('blog articles recommend other posts with shared topics first', async ({ page, request }) => {
  await page.goto('/blog/', { waitUntil: 'domcontentloaded' });
  const routes = await page.locator('.blog-card.tutorial-card--catalog h3 a').evaluateAll(links =>
    links.map(link => link.getAttribute('href')!),
  );
  const destinations = new Set<string>();
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const related = page.getByRole('region', { name: 'You might also be interested in', exact: true });
    const cards = related.locator('.blog-card');
    await expect(cards).toHaveCount(Math.min(3, routes.length - 1));
    const links = await cards.locator('h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!));
    expect(new Set(links).size).toBe(links.length);
    expect(links).not.toContain(route);
    for (const link of links) {
      expect(routes).toContain(link);
      destinations.add(link);
    }
    if ([article, altaArticle].includes(route)) {
      expect(links[0]).toBe(route === article ? altaArticle : article);
    }
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
        await related.scrollIntoViewIfNeeded();
        await expect(related.getByRole('heading', { level: 2 })).toHaveText('You might also be interested in');
        expect(await textContrast(cards.first().locator('.tutorial-card__body > p'))).toBeGreaterThanOrEqual(4.5);
        const boxes = [];
        for (const card of await cards.all()) {
          const box = (await card.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          boxes.push(box);
          const image = card.locator('.tutorial-card__media img');
          if (await image.count()) {
            await image.scrollIntoViewIfNeeded();
            await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
          } else {
            await expect(card.locator('.iso-illustration svg')).toBeVisible();
          }
        }
        if (width === 375) {
          expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
        } else {
          expect(boxes[1].y).toBeCloseTo(boxes[0].y, 0);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    }
  }
  for (const destination of destinations) {
    expect((await request.get(destination)).status()).toBe(200);
  }
});

test('blog SEO uses BlogPosting data, original authors and the new social preview', async ({ page, request }) => {
  for (const route of [article, altaArticle, '/blog/2025-11-14-new-learning-platform/']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(route);
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    const post = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'BlogPosting');
    const breadcrumbs = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'BreadcrumbList');
    expect(post.headline).toBe(await page.locator('h1').innerText());
    expect(post.url).toBe(canonical);
    expect(post.datePublished.slice(0, 10)).toBe([article, altaArticle].includes(route) ? '2026-11-18' : '2025-11-14');
    expect(breadcrumbs.itemListElement.at(-1)).toMatchObject({ name: post.headline, item: canonical });
    expect(post.author).toMatchObject({ '@type': 'Person', name: 'Cedric Verstraeten', url: 'https://github.com/cedricve' });
    await expect(page.locator('.blog-byline__author')).toHaveText('Cedric Verstraeten');
    await expect(page.locator('.blog-byline__author')).toHaveAttribute('href', 'https://github.com/cedricve');
    await expect(page.locator('.blog-byline__author img')).toHaveAttribute('src', 'https://github.com/cedricve.png');
    await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', 'Cedric Verstraeten');
    await expect(page.locator('meta[property="article:author"]')).toHaveAttribute('content', 'https://github.com/cedricve');
    if ([article, altaArticle].includes(route)) {
      expect(post.headline).toContain(' vs UUG:');
      expect(post.description).not.toMatch(/Augment Vision/i);
      for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]']) {
        await expect(page.locator(selector)).not.toHaveAttribute('content', /Augment Vision/i);
      }
      const imageURL = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(imageURL).toContain(`${route}social.png`);
      expect(post.image).toEqual([imageURL]);
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', imageURL!);
      const image = await request.get(imageURL!);
      expect(image.status()).toBe(200);
      expect(await sharp(await image.body()).metadata()).toMatchObject({ width: 1200, height: 630 });
    }
  }
});
