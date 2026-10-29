import { test, expect } from '@playwright/test';
import { textContrast } from './utils/contrast';

const accents = [
  { product: 'agent', rgb: [147, 55, 52] },
  { product: 'factory', rgb: [86, 97, 143] },
  { product: 'vault', rgb: [86, 97, 143] },
  { product: 'hub', rgb: [162, 57, 215] },
];

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} code blocks`, () => {
    test.use({ colorScheme });

    test('fixes the reported indented code block without changing inline code', async ({ page }) => {
      await page.goto('/docs/factory/installation-cloud/');
      const pre = page.locator('#content pre').first();
      const code = pre.locator('code');
      await expect(code).toHaveText('git clone https://github.com/kerberos-io/factory');
      await expect(code).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(code).toHaveCSS('border-top-width', '0px');
      await expect(code).toHaveCSS('padding', '0px');
      await expect(pre).toHaveCSS('padding-left', '20px');
      await expect(pre).toHaveCSS('padding-right', '20px');
      await expect(code).toHaveCSS('font-size', await pre.evaluate(element => getComputedStyle(element).fontSize));
      expect(await textContrast(code)).toBeGreaterThanOrEqual(4.5);
      const inline = page.locator('#content p code').first();
      await expect(inline).toHaveCSS('border-top-width', '1px');
      await expect(inline).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    });

    test('uses a darker product accent and scrolls long code without wrapping', async ({ page }) => {
      for (const { product, rgb } of accents) {
        await page.goto(`/docs/${product}/`);
        await page.locator('#content .content').evaluate(element => {
          const pre = document.createElement('pre');
          pre.dataset.codeFixture = 'palette';
          const code = document.createElement('code');
          code.textContent = `printf '%s\\n' '${'long-command-'.repeat(30)}'\n  preserve indentation\n`;
          pre.append(code);
          element.append(pre);
        });
        const pre = page.locator('pre[data-code-fixture="palette"]');
        const actual = await pre.evaluate(element => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas is required to inspect code backgrounds');
          context.fillStyle = getComputedStyle(element).backgroundColor;
          context.fillRect(0, 0, 1, 1);
          return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
        });
        const expected = rgb.map((channel, index) => channel * 0.28 + [11, 17, 20][index] * 0.72);
        for (const [index, channel] of actual.entries()) {
          expect(Math.abs(channel - expected[index]), `${product} background channel ${index}`).toBeLessThanOrEqual(1);
        }
        await expect(pre).toHaveCSS('overflow-x', 'auto');
        await expect(pre.locator('code')).toHaveCSS('white-space', 'pre');
        expect(await pre.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
        await pre.evaluate(element => { element.scrollLeft = 100; });
        expect(await pre.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
        expect(await textContrast(pre.locator('code'))).toBeGreaterThanOrEqual(4.5);
      }
    });

    test('keeps fenced syntax readable and the copy button keyboard and touch accessible', async ({ page }) => {
      await page.goto('/docs/hub/installation/');
      const block = page.locator('.hextra-code-block').first();
      await expect(block).toHaveClass(/dark/);
      await expect(block.locator('pre')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      const tokens = block.locator('.chroma span');
      for (const token of await tokens.all()) {
        if ((await token.textContent())?.trim()) {
          expect(await textContrast(token)).toBeGreaterThanOrEqual(4.5);
        }
      }
      const copy = block.locator('.hextra-code-copy-btn');
      await expect(copy).toHaveAccessibleName('Copy code');
      await page.keyboard.press('Tab');
      await copy.focus();
      await expect(copy.locator('..')).toHaveCSS('opacity', '1');
      if (await page.evaluate(() => matchMedia('(hover: none)').matches)) {
        const size = await copy.boundingBox();
        expect(size?.width).toBeGreaterThanOrEqual(44);
        expect(size?.height).toBeGreaterThanOrEqual(44);
      }
      const expected = await block.locator('code').last().innerText();
      await copy.click();
      await expect(copy).toHaveClass(/copied/);
      await expect(copy).toHaveAccessibleName('Copied!');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected.replace(/\n\n/g, '\n'));
    });

    test('keeps filename headers separate from the code and preserves Mermaid surfaces', async ({ page }) => {
      await page.goto('/tutorials/hub/setup-hls-live-view/');
      const block = page.locator('.hextra-code-block').filter({ has: page.locator('.hextra-code-filename') }).first();
      const header = block.locator('.hextra-code-filename');
      const pre = block.locator('pre').first();
      await expect(header).toBeVisible();
      await expect(header).toHaveCSS('position', 'static');
      const headerBounds = await header.boundingBox();
      const codeBounds = await pre.boundingBox();
      const copyBounds = await block.locator('.hextra-code-copy-btn').boundingBox();
      expect(headerBounds).not.toBeNull();
      expect(codeBounds).not.toBeNull();
      if (!headerBounds || !codeBounds || !copyBounds) throw new Error('Code header, body, and copy control must have layout bounds');
      expect(codeBounds.y).toBeGreaterThanOrEqual(headerBounds.y + headerBounds.height - 1);
      expect(copyBounds.y).toBeGreaterThanOrEqual(headerBounds.y);
      expect(copyBounds.y + copyBounds.height).toBeLessThanOrEqual(headerBounds.y + headerBounds.height);
      await expect(pre).toHaveCSS('padding-top', '16px');
      await expect(pre.locator('code')).toHaveCSS('border-top-width', '0px');
      await page.locator('#content .content').evaluate(element => {
        const diagram = document.createElement('pre');
        diagram.className = 'mermaid';
        diagram.textContent = 'graph LR; A-->B';
        element.append(diagram);
      });
      await expect(page.locator('pre.mermaid')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    });
  });
}
