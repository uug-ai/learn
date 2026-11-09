import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('tutorial SEO includes consistent article data, breadcrumbs and raster social previews', async ({ page, request }) => {
  await page.goto('/tutorials/');
  const paths = await page.locator('.tutorial-card__media').evaluateAll(links =>
    [...new Set(links.map(link => link.getAttribute('href')))].filter((href): href is string => Boolean(href)),
  );
  expect(paths.length).toBeGreaterThanOrEqual(10);
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(data['@context']).toBe('https://schema.org');
    const article = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'Article');
    const breadcrumbs = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'BreadcrumbList');
    expect(article.url).toBe(canonical);
    expect(article.mainEntityOfPage['@id']).toBe(canonical);
    expect(article.headline).toBe((await page.locator('h1').innerText()).trim());
    expect(article.description).toBe(await page.locator('meta[name="description"]').getAttribute('content'));
    expect(Number.isNaN(Date.parse(article.datePublished))).toBe(false);
    expect(Date.parse(article.dateModified)).toBeGreaterThanOrEqual(Date.parse(article.datePublished));
    for (const [index, item] of breadcrumbs.itemListElement.entries()) {
      expect(item.position).toBe(index + 1);
      expect(new URL(item.item).protocol).toMatch(/^https?:$/);
    }
    expect(breadcrumbs.itemListElement.at(-1)).toMatchObject({ name: article.headline, item: canonical });
    const byline = page.locator('.tutorial-byline');
    if (await byline.count()) {
      expect(article.author['@type']).toBe('Person');
      expect(article.author.name).toBe(await byline.locator('.tutorial-byline__name').innerText());
      await expect(byline.locator('.tutorial-byline__author')).toHaveAttribute('href', article.author.url);
      await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', article.author.name);
      const dates = byline.locator('time');
      await expect(dates.nth(0)).toHaveAttribute('datetime', article.datePublished.slice(0, 10));
      await expect(dates.nth(1)).toHaveAttribute('datetime', article.dateModified.slice(0, 10));
    } else {
      expect(article.author).toBeUndefined();
    }
    const imageURL = await page.locator('meta[property="og:image"]').getAttribute('content');
    if (!imageURL) throw new Error(`Missing social image for ${path}`);
    expect(article.image).toEqual([imageURL]);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', imageURL);
    const image = await request.get(imageURL);
    expect(image.ok()).toBe(true);
    expect(image.headers()['content-type']).toContain('image/png');
    expect(await sharp(await image.body()).metadata()).toMatchObject({ width: 1200, height: 630 });
  }
});

test('tutorial SEO exposes a crawler policy, sitemap and real missing pages', async ({ page, request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['content-type']).toContain('text/plain');
  const policy = await robots.text();
  expect(policy).toContain('User-agent: *');
  expect(policy).toContain('Allow: /');
  expect(policy).toMatch(/^Sitemap: https?:\/\/[^ \n]+\/sitemap.xml$/m);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  for (const slug of ['apply-mongodb-indexes', 'connect-mcp-to-claude', 'connect-your-vms-to-claude']) {
    expect(await sitemap.text()).toContain(`/tutorials/hub/${slug}/</loc>`);
  }
  for (const path of ['/missing-seo-page/', '/missing-seo-asset.js']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: '404 - Page not found' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  }
});
