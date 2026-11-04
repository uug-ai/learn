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

const howItWorksDiagrams = [
  {
    caption: 'The Kerberos.io solution stack',
    nodes: ['camera-1', 'camera-2', 'factory', 'agent-1', 'agent-2', 'vault', 'storage', 'hub'],
    connections: ['camera-1:agent-1', 'camera-2:agent-2', 'factory:agent-1', 'factory:agent-2',
      'agent-1:vault', 'agent-2:vault', 'vault:storage', 'vault:hub'],
  },
  {
    caption: 'An Agent consists of both a backend and frontend.',
    nodes: ['camera', 'backend', 'frontend'],
    connections: ['camera:backend', 'frontend:backend'],
  },
  {
    caption: 'An Agent is monitoring a single camera stream.',
    nodes: ['camera', 'agent'],
    connections: ['camera:agent'],
  },
  {
    caption: 'Scaling out your Agents is not a complex task.',
    nodes: ['camera-1', 'camera-2', 'camera-3', 'camera-4', 'agent-1', 'agent-2', 'agent-3', 'agent-4'],
    connections: ['camera-1:agent-1', 'camera-2:agent-2', 'camera-3:agent-3', 'camera-4:agent-4'],
  },
  {
    caption: 'Bring your own storage using Vault',
    nodes: ['agent-1', 'agent-2', 'agent-3', 'vault', 'storage', 'integration'],
    connections: ['agent-1:vault', 'agent-2:vault', 'agent-3:vault', 'vault:storage', 'vault:integration'],
  },
  {
    caption: 'Vault connected to Hub.',
    nodes: ['agent-1', 'agent-2', 'vault', 'storage', 'hub'],
    connections: ['agent-1:vault', 'agent-2:vault', 'vault:storage', 'vault:hub'],
  },
];

for (const width of [1280, 390]) {
  for (const theme of ['light', 'dark']) {
    test(`how it works: all six illustrations render as editable diagrams at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: 'light' });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/docs/prologue/how/');
      if (theme === 'dark') {
        await page.locator('.learn-topbar').getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
      }
      expect(await page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(theme === 'dark');

      const figures = page.locator('.rete-diagram-figure');
      await expect(figures).toHaveCount(howItWorksDiagrams.length);
      await expect(page.locator('#content .content figure:not(.rete-diagram-figure)')).toHaveCount(0);
      await expect(page.locator('link[href*="/css/rete-diagram."]')).toHaveCount(1);
      await expect(page.locator('script[src*="/js/rete-diagram."]')).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready);

      for (const [index, expected] of howItWorksDiagrams.entries()) {
        const figure = figures.nth(index);
        const diagram = figure.locator('.rete-diagram');
        await diagram.scrollIntoViewIfNeeded();
        await expect(figure.locator('figcaption')).toHaveText(expected.caption);
        await expect(diagram).toHaveAttribute('role', 'img');
        await expect(diagram).toHaveAttribute('aria-label', /\S/);
        const config: {
          nodes: { id: string; x: number; y: number; w: number; h: number }[];
          connections: { from: string; to: string }[];
        } = JSON.parse((await diagram.getAttribute('data-rete-config'))!);
        expect(config.nodes.map(node => node.id)).toEqual(expected.nodes);
        expect(config.connections.map(connection => `${connection.from}:${connection.to}`)).toEqual(expected.connections);
        await expect(diagram.locator('.rete-node')).toHaveCount(expected.nodes.length);
        await expect(diagram.locator('.rete-connection')).toHaveCount(expected.connections.length);
        const editHref = await figure.getByRole('link', { name: 'Edit in Draw' }).getAttribute('href');
        expect(editHref).toMatch(/^https:\/\/draw\.uug\.ai\/#diagram=/);
        const encoded = new URLSearchParams(new URL(editHref!).hash.slice(1)).get('diagram')!.replace(/ /g, '+');
        expect(JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))).toEqual(config);

        for (const [nodeIndex, node] of config.nodes.entries()) {
          for (const other of config.nodes.slice(nodeIndex + 1)) {
            expect(node.x + node.w <= other.x || other.x + other.w <= node.x
              || node.y + node.h <= other.y || other.y + other.h <= node.y,
            `${expected.caption}: ${node.id} overlaps ${other.id}`).toBe(true);
          }
        }
        const clipping = await diagram.evaluate(container => {
          const bounds = container.getBoundingClientRect();
          return Array.from(container.querySelectorAll<HTMLElement>('.rete-node')).filter(node => {
            const rect = node.getBoundingClientRect();
            return node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth
              || rect.left < bounds.left || rect.top < bounds.top
              || rect.right > bounds.right || rect.bottom > bounds.bottom;
          }).map(node => node.dataset.nodeId);
        });
        expect(clipping, expected.caption).toEqual([]);
        for (const badge of await diagram.locator('.rete-node__badge').all()) {
          await expect(badge).toHaveJSProperty('complete', true);
          expect(await badge.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const firstDiagram = figures.first().locator('.rete-diagram');
      await firstDiagram.getByRole('button', { name: 'Toggle fullscreen' }).click();
      await expect(firstDiagram).toHaveClass(/rete-diagram--pseudo-fullscreen/);
      await expect.poll(() => firstDiagram.evaluate(container => {
        const points = [[8, 8], [innerWidth / 2, 30], [innerWidth - 8, 8],
          [8, innerHeight - 8], [innerWidth - 8, innerHeight - 8]];
        const button = container.querySelector('.rete-toolbar__btn');
        if (!button) throw new Error('Fullscreen exit button is missing');
        const buttonBounds = button.getBoundingClientRect();
        return {
          covered: points.every(([x, y]) => container.contains(document.elementFromPoint(x, y))),
          exitVisible: button.contains(document.elementFromPoint(
            buttonBounds.x + buttonBounds.width / 2, buttonBounds.y + buttonBounds.height / 2)),
        };
      })).toMatchObject({ covered: true, exitVisible: true });
      const fullscreenBounds = await firstDiagram.boundingBox();
      expect(fullscreenBounds).toEqual({ x: 0, y: 0, width, height: 900 });
      await page.keyboard.press('Escape');
      await expect(firstDiagram).not.toHaveClass(/rete-diagram--pseudo-fullscreen/);
      await expect(page.locator('body')).not.toHaveClass(/rete-diagram-fs-lock/);
      await expect(page.locator('.learn-podcast-topic-content')).toHaveCSS('isolation', 'isolate');
      await firstDiagram.getByRole('button', { name: 'Toggle fullscreen' }).click();
      await firstDiagram.getByRole('button', { name: 'Toggle fullscreen' }).click();
      await expect(firstDiagram).not.toHaveClass(/rete-diagram--pseudo-fullscreen/);
      expect(errors).toEqual([]);
    });
  }
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
