import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const legacyProduct = /\bKerberos(?:\s|&(?:nbsp|#160|#x0*a0);)+(?:Hub|Vault|Factory)/i;

async function textFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return /\.(?:md|html|json|ya?ml|toml|xml|txt|svg|m?js|css)$/.test(entry.name) ? [path] : [];
  }));
  return files.flat();
}

test('uses short product names throughout authored Learn content and scaffolding', async () => {
  const directories = [
    'app/content', 'app/layouts', 'app/assets', 'app/data', 'app/static',
    'podcast/episodes', 'playwright/scripts',
  ];
  const files = (await Promise.all(directories.map(directory => textFiles(join(root, directory))))).flat();
  files.push(join(root, 'TEMPLATE.md'));
  expect(files.length).toBeGreaterThan(200);
  for (const file of files) {
    expect(await readFile(file, 'utf8'), relative(root, file)).not.toMatch(legacyProduct);
  }
  const agentHeader = await readFile(join(root, 'playwright/scripts/generate-webrtc-turn-header.mjs'), 'utf8');
  expect(agentHeader).toContain('Kerberos Agent');
  const installation = await readFile(join(root, 'app/content/docs/hub/installation/index.md'), 'utf8');
  expect(installation).toContain('kerberos-hub');
});

test('omits legacy product names from every published page, metadata, feeds and search', async ({ request }) => {
  test.setTimeout(120_000);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const paths = [...new Set([...((await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g))]
    .map(match => new URL(match[1], sitemap.url()).pathname))];
  expect(paths.length).toBeGreaterThan(100);
  paths.push('/en.search-data.json', '/index.xml');
  for (let offset = 0; offset < paths.length; offset += 8) {
    await Promise.all(paths.slice(offset, offset + 8).map(async path => {
      const response = await request.get(path);
      expect(response.ok(), path).toBe(true);
      const body = await response.text();
      expect(body, `${path}: metadata and attributes`).not.toMatch(legacyProduct);
      expect(body.replace(/<[^>]*>/g, ' '), `${path}: rendered text`).not.toMatch(legacyProduct);
    }));
  }
});

test('preserves existing heading deep links while displaying short product names', async ({ page }) => {
  test.setTimeout(120_000);
  const content = join(root, 'app/content');
  let anchors = 0;
  for (const file of await textFiles(content)) {
    if (!file.endsWith('.md')) continue;
    const source = await readFile(file, 'utf8');
    if (/^draft:\s*true\s*$/m.test(source)) continue;
    const headings = [...source.matchAll(/^#{1,6}\s+(.+?)\s+\{#([^}]*kerberos-(?:hub|vault|factory)[^}]*)\}\s*$/gm)];
    if (!headings.length) continue;
    const route = `/${relative(content, file).replace(/(?:\/_?index)?\.md$/, '')}/`;
    await page.goto(route);
    for (const [, title, id] of headings) {
      const anchor = page.locator(`[id="${id}"]`);
      await expect(anchor).toHaveCount(1);
      await expect(anchor.locator('..')).toHaveText(title);
      anchors++;
    }
  }
  expect(anchors).toBeGreaterThan(20);
});
