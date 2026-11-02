import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const contentRoot = resolve(__dirname, '../../app/content');

function diagramPages(directory: string): { path: string; count: number }[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return diagramPages(file);
    if (!entry.name.endsWith('.md')) return [];
    const count = readFileSync(file, 'utf8').match(/\{\{<\s*rete\b/g)?.length ?? 0;
    if (!count) return [];
    const path = relative(contentRoot, file).split(sep).join('/')
      .replace(/(^|\/)_?index\.md$/, '$1').replace(/\.md$/, '').replace(/\/?$/, '/');
    return [{ path: `/${path}`, count }];
  });
}

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile Draw integration' : 'desktop Draw integration', () => {
    test.use({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });

    test('uses Draw as the only editor in navigation and the documentation card', async ({ page }) => {
      await page.goto('/docs/');
      if (mobile) await page.getByRole('button', { name: 'Menu', exact: true }).click();
      const link = page.getByRole('link', { name: 'Draw', exact: true });
      await expect(link).toHaveAttribute('href', 'https://draw.uug.ai/');
      await expect(page.locator('a[href="/designer/"]')).toHaveCount(0);
      await expect(page.locator('.hextra-card[href="https://draw.uug.ai/"]')).toBeVisible();
    });
  });
}

for (const { path, count } of diagramPages(contentRoot)) {
  test(`carries each original editable diagram to Draw: ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    const diagrams = page.locator('.rete-diagram-figure');
    await expect(diagrams).toHaveCount(count);
    await expect(page.locator('a[href*="/designer/"]')).toHaveCount(0);
    for (const figure of await diagrams.all()) {
      const edit = figure.getByRole('link', { name: 'Edit in Draw' });
      const href = await edit.getAttribute('href');
      expect(href).toMatch(/^https:\/\/draw\.uug\.ai\/#diagram=/);
      await expect(edit).toHaveAttribute('target', '_blank');
      await expect(edit).toHaveAttribute('rel', 'noopener noreferrer');
      const url = new URL(href!);
      expect(url.search).toBe('');
      const encoded = new URLSearchParams(url.hash.slice(1)).get('diagram')!.replace(/ /g, '+');
      expect(JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')))
        .toEqual(JSON.parse((await figure.locator('[data-rete-config]').getAttribute('data-rete-config'))!));
    }
  });
}

for (const fragment of ['', '#diagram=eyJub2RlcyI6W119+///==&fullscreen=1', '#diagram=eyJub2RlcyI6W119-_&fs=1']) {
  test(`preserves the old Designer link while retiring its editor: ${fragment || 'empty'}`, async ({ page }) => {
    await page.route('https://draw.uug.ai/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Draw</h1>' }));
    await page.goto(`/designer/${fragment}`);
    await page.waitForURL(`https://draw.uug.ai/${fragment}`);
    expect(new URL(page.url()).hash).toBe(fragment);
  });
}

test('keeps an accessible fallback without loading the old editor', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/designer/`);
    await expect(page.getByRole('link', { name: 'Continue to Draw' })).toHaveAttribute('href', 'https://draw.uug.ai/');
    await expect(page.locator('#designer')).toHaveCount(0);
    await expect(page.locator('script[src*="/js/designer."],link[href*="/css/designer."]')).toHaveCount(0);
    expect(await page.locator('noscript').textContent()).toContain('Enable JavaScript to carry an existing diagram into Draw automatically.');
  } finally {
    await context.close();
  }
});
