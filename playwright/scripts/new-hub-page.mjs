#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Scaffolds a new Hub documentation page — or extends an existing one —
 * following the recipe in `learn/TEMPLATE.md`.
 *
 * Three modes:
 *
 *   1. Create a brand-new page (default):
 *        npm run new -- <topic> [--title=...] [--route=...] ...
 *      Creates:
 *        - learn/app/content/docs/hub/<topic>/index.md
 *        - learn/playwright/tests/<topic>.spec.ts
 *        - npm scripts "<topic>" / "<topic>:headed" in package.json.
 *      Refuses to overwrite existing files unless `--force` is passed.
 *
 *   2. Append a section to an existing page:
 *        npm run new -- <topic> --add-section="<Section title>"
 *                                [--screenshot=<short-name>]
 *      Appends `## <Section title>` (with a TODO body) to the existing
 *      doc page. When `--screenshot=<short-name>` is also passed, a
 *      `figure` shortcode pointing at `hub-<topic>-<short-name>.png` is
 *      embedded under the new heading.
 *
 *   3. Append a screenshot capture to an existing spec:
 *        npm run new -- <topic> --add-capture="<short-name>"
 *                                [--describe="<what the test captures>"]
 *                                [--update-doc]
 *      Adds a new `test(...)` block to the spec that drives the page and
 *      writes `hub-<topic>-<short-name>.png`. With `--update-doc`, also
 *      appends a `figure` reference for that screenshot to the doc page.
 *
 * Run with `--help` for the full option list.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// learn/playwright/scripts/  →  monorepo/learn/
const LEARN_ROOT = path.resolve(__dirname, '..', '..');
const HUB_DOCS_ROOT = path.join(LEARN_ROOT, 'app', 'content', 'docs', 'hub');
const PLAYWRIGHT_ROOT = path.join(LEARN_ROOT, 'playwright');
const TESTS_DIR = path.join(PLAYWRIGHT_ROOT, 'tests');
const TEMPLATE_SPEC = path.join(TESTS_DIR, 'TEMPLATE.spec.ts.example');
const PACKAGE_JSON = path.join(PLAYWRIGHT_ROOT, 'package.json');

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

function parseArgs(argv) {
  const opts = { force: false };
  const positional = [];
  for (const raw of argv) {
    if (raw === '--force' || raw === '-f') {
      opts.force = true;
    } else if (raw === '--help' || raw === '-h') {
      opts.help = true;
    } else if (raw === '--update-doc') {
      opts['update-doc'] = true;
    } else if (raw.startsWith('--')) {
      const eq = raw.indexOf('=');
      if (eq === -1) {
        throw new Error(`Missing value for option ${raw} (use --name=value)`);
      }
      const key = raw.slice(2, eq);
      const value = raw.slice(eq + 1);
      opts[key] = value;
    } else {
      positional.push(raw);
    }
  }
  opts.topic = positional[0];
  return opts;
}

function titleCase(slug) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function printUsage() {
  console.log(`Usage:
  node learn/playwright/scripts/new-hub-page.mjs <topic> [options]
  npm  --prefix learn/playwright run new -- <topic> [options]

Modes:
  (default)            Scaffold a brand-new page + spec + npm scripts.
  --add-section=...    Append a new section to an existing doc page.
  --add-capture=...    Append a new test() + screenshot to an existing spec.

Create-mode options:
  --title=<text>         Frontmatter title (default: title-cased <topic>)
  --description=<text>   Frontmatter description (default: generated)
  --route=<path>         Frontend route, default "/<topic>"
  --heading=<text>       Heading the spec waits for (default: --title)
  --weight=<n>           Hugo menu weight (default: 399)
  --force, -f            Overwrite existing files

--add-section options:
  --add-section=<title>  Heading text of the new section (## by default).
  --level=<2|3>          Heading level (default: 2 — i.e. ##).
  --screenshot=<name>    Embed a figure for hub-<topic>-<name>.png under
                         the new heading.

--add-capture options:
  --add-capture=<name>   Short name of the capture (used in the test title,
                         the screenshot filename and the optional figure).
  --describe=<text>      Sentence used in the test title and figure caption
                         (default: derived from <name>).
  --update-doc           Also append a figure reference for the new
                         screenshot to the doc page.

General:
  --help, -h             Show this help
`);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeFileSafe(target, content, force) {
  if ((await exists(target)) && !force) {
    throw new Error(
      `${path.relative(LEARN_ROOT, target)} already exists. Re-run with --force to overwrite.`,
    );
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
}

function renderDocPage({ topic, title, description, weight }) {
  const today = new Date().toISOString().split('T')[0];
  return `---
title: "${title}"
description: "${description}"
lead: "${description}"
date: ${today}T00:00:00+00:00
lastmod: ${today}T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: ${weight}
toc: true
---

<!--
  Scaffolded from learn/TEMPLATE.md — see that guide for the canonical
  page structure, where to find the source of truth in the monorepo, and
  how to (re)generate the screenshots referenced below with Playwright.

  Reference pages to copy from:
    - learn/app/content/docs/hub/cases/index.md
    - learn/app/content/docs/hub/livestream/index.md
-->

The **${title}** page in Kerberos Hub <!-- TODO: 1–2 sentences explaining
what this page lets the user do and the route it lives on. -->.

{{< figure src="hub-${topic}-overview.png" alt="The ${title} page in Kerberos Hub." caption="The ${title} page in Kerberos Hub." class="stretch">}}

## How it works

<!--
  TODO: high-level architecture note (only when the feature relies on
  non-obvious plumbing). Drop this section entirely if not relevant.

  Tip: cross-reference the monorepo projects that own the behaviour
  described here (hub-frontend, hub-api, hub-pipeline-*, agent, vault).
-->

## Walkthrough

<!--
  TODO: one subsection per pane / control group. Embed a screenshot for
  every non-trivial state and keep the captions self-contained.
-->

### Filtering and searching

<!-- TODO: filters, sort, search field. Remove the section if not applicable. -->

### Actions

<!-- TODO: primary actions exposed by the page (buttons, menus, modals). -->

## Permissions and roles

<!--
  TODO: when the feature has per-role behaviour, call it out:
    - who can read
    - who can write
    - who can delete / share / export
  Link to {{< ref "/docs/hub/roles" >}} for the central role docs.
-->

## Configuration

<!--
  TODO: every Helm value, env var or feature flag the admin needs to
  know about, with a values.yaml snippet and the matching env var name.
  See learn/TEMPLATE.md for examples.
-->

## Troubleshooting

<!--
  TODO: small FAQ-style block listing the failures users have actually
  hit, with a copy/pasteable diagnosis.
-->
`;
}

async function renderSpecFromTemplate({ topic, route, heading }) {
  const template = await fs.readFile(TEMPLATE_SPEC, 'utf8');
  const marker = '// --- template-header-end ---';
  const idx = template.indexOf(marker);
  // Strip the instructional header (everything up to and including the
  // marker line) so the generated spec only contains executable code.
  let body = template;
  if (idx !== -1) {
    const eol = template.indexOf('\n', idx);
    body = template
      .slice(eol === -1 ? template.length : eol + 1)
      .replace(/^\s*\n+/, '');
  }
  // Prepend a short banner so the generated spec still points back at the
  // canonical guide.
  const header = `/**
 * Documentation screenshots for the "${heading}" page.
 *
 * Scaffolded from learn/playwright/tests/TEMPLATE.spec.ts.example — see
 * learn/TEMPLATE.md for the canonical recipe (selector conventions,
 * helpers, how to start the Hub stack before running this spec).
 */

`;
  return (header + body)
    .replace(/<TOPIC>/g, topic)
    .replace(/\/<route>/g, route)
    .replace(/<Page heading>/g, heading);
}

async function updatePackageJsonScripts(topic) {
  const raw = await fs.readFile(PACKAGE_JSON, 'utf8');
  const pkg = JSON.parse(raw);
  pkg.scripts ??= {};
  const changes = [];
  const add = (name, command) => {
    if (pkg.scripts[name] && pkg.scripts[name] !== command) {
      changes.push(`  ↻  overwriting existing script "${name}"`);
    } else if (!pkg.scripts[name]) {
      changes.push(`  +  adding script "${name}"`);
    }
    pkg.scripts[name] = command;
  };
  add(topic, `playwright test tests/${topic}.spec.ts`);
  add(`${topic}:headed`, `node scripts/run-headed.mjs tests/${topic}.spec.ts`);
  // Preserve a trailing newline if the source had one.
  const trailing = raw.endsWith('\n') ? '\n' : '';
  await fs.writeFile(
    PACKAGE_JSON,
    `${JSON.stringify(pkg, null, 2)}${trailing}`,
  );
  return changes;
}

// ---------------------------------------------------------------------------
// Update modes: --add-section and --add-capture
// ---------------------------------------------------------------------------

function renderSectionMarkdown({ topic, title, level, screenshot }) {
  const hashes = '#'.repeat(level);
  let block = `\n${hashes} ${title}\n\n<!-- TODO: describe ${title.toLowerCase()}. -->\n`;
  if (screenshot) {
    const file = `hub-${topic}-${screenshot}.png`;
    block += `\n{{< figure src="${file}" alt="${title}" caption="${title}" class="stretch">}}\n`;
  }
  return block;
}

function renderFigureMarkdown({ topic, screenshot, caption }) {
  const file = `hub-${topic}-${screenshot}.png`;
  return `\n{{< figure src="${file}" alt="${caption}" caption="${caption}" class="stretch">}}\n`;
}

async function appendToDoc(topic, content) {
  const docPath = path.join(HUB_DOCS_ROOT, topic, 'index.md');
  if (!(await exists(docPath))) {
    throw new Error(
      `${path.relative(LEARN_ROOT, docPath)} does not exist — scaffold the page first (run without --add-*).`,
    );
  }
  const current = await fs.readFile(docPath, 'utf8');
  const trimmed = current.replace(/\s+$/, '');
  await fs.writeFile(docPath, `${trimmed}\n${content}\n`);
  return docPath;
}

function renderTestBlock({ topic, captureSlug, describe }) {
  const filename = `hub-${topic}-${captureSlug}.png`;
  return `
  test('captures the ${describe}', async ({ page }, testInfo) => {
    await gotoTarget(page);

    // TODO: drive the UI to the state you want to capture.
    // Use isPresent / revealHoverControls / skipBecause from utils/page.ts
    // when the underlying data may be missing on some environments.

    await shoot(page, '${filename}');
  });
`;
}

async function appendToSpec(topic, testBlock) {
  const specPath = path.join(TESTS_DIR, `${topic}.spec.ts`);
  if (!(await exists(specPath))) {
    throw new Error(
      `${path.relative(LEARN_ROOT, specPath)} does not exist — scaffold the spec first (run without --add-*).`,
    );
  }
  const current = await fs.readFile(specPath, 'utf8');

  // Insert before the *last* `});` (closing of `test.describe`).
  const closingIdx = current.lastIndexOf('});');
  if (closingIdx === -1) {
    throw new Error(
      `Could not find a closing "});" in ${path.relative(LEARN_ROOT, specPath)}; insert the new test block manually.`,
    );
  }
  const before = current.slice(0, closingIdx).replace(/\s+$/, '');
  const after = current.slice(closingIdx);
  await fs.writeFile(specPath, `${before}\n${testBlock}${after}`);
  return specPath;
}

async function runAddSection(topic, opts) {
  const title = opts['add-section'];
  if (!title || !title.trim()) {
    throw new Error('--add-section requires a non-empty value (the section heading).');
  }
  const level = Number(opts.level ?? '2');
  if (![2, 3].includes(level)) {
    throw new Error('--level must be 2 or 3.');
  }
  const screenshot = opts.screenshot ? slugify(opts.screenshot) : undefined;
  const block = renderSectionMarkdown({ topic, title, level, screenshot });
  const docPath = await appendToDoc(topic, block.trimStart());

  console.log(`Appended section "${title}" to ${path.relative(LEARN_ROOT, docPath)}.`);
  if (screenshot) {
    console.log(`  →  embedded figure: hub-${topic}-${screenshot}.png`);
    console.log(
      `     Capture it with: npm run new -- ${topic} --add-capture="${screenshot}"`,
    );
  }
}

async function runAddCapture(topic, opts) {
  const rawName = opts['add-capture'];
  if (!rawName || !rawName.trim()) {
    throw new Error('--add-capture requires a non-empty value (the screenshot short name).');
  }
  const captureSlug = slugify(rawName);
  if (!captureSlug) {
    throw new Error(`Could not derive a slug from --add-capture="${rawName}".`);
  }
  const describe =
    (opts.describe && opts.describe.trim()) || captureSlug.replace(/-/g, ' ');
  const testBlock = renderTestBlock({ topic, captureSlug, describe });
  const specPath = await appendToSpec(topic, testBlock);
  console.log(
    `Appended test "captures the ${describe}" to ${path.relative(LEARN_ROOT, specPath)}.`,
  );
  console.log(`  →  will write hub-${topic}-${captureSlug}.png`);

  if (opts['update-doc']) {
    const figure = renderFigureMarkdown({
      topic,
      screenshot: captureSlug,
      caption: describe.charAt(0).toUpperCase() + describe.slice(1),
    });
    const docPath = await appendToDoc(topic, figure.trimStart());
    console.log(
      `  →  appended figure reference to ${path.relative(LEARN_ROOT, docPath)}`,
    );
  }

  console.log(`\nNext steps:
  1. Edit ${path.relative(LEARN_ROOT, specPath)} and replace the TODO
     with the steps that drive the UI to the desired state.
  2. Regenerate the screenshots:
       cd learn/playwright && npm run ${topic}
`);
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`error: ${error.message}\n`);
    printUsage();
    process.exit(2);
  }

  if (opts.help || !opts.topic) {
    printUsage();
    process.exit(opts.help ? 0 : 2);
  }

  const topic = opts.topic;
  if (!SLUG_RE.test(topic)) {
    console.error(
      `error: topic "${topic}" must be lowercase kebab-case (a-z, 0-9, -) and start with a letter.`,
    );
    process.exit(2);
  }

  // Update modes: skip the create flow entirely.
  if (opts['add-section'] !== undefined) {
    await runAddSection(topic, opts);
    return;
  }
  if (opts['add-capture'] !== undefined) {
    await runAddCapture(topic, opts);
    return;
  }

  const title = opts.title ?? titleCase(topic);
  const description = opts.description ?? `Documentation for the ${title} page.`;
  const route = opts.route ?? `/${topic}`;
  const heading = opts.heading ?? title;
  const weight = opts.weight ?? '399';

  if (!(await exists(TEMPLATE_SPEC))) {
    console.error(`error: spec template missing at ${TEMPLATE_SPEC}`);
    process.exit(1);
  }

  const docPath = path.join(HUB_DOCS_ROOT, topic, 'index.md');
  const specPath = path.join(TESTS_DIR, `${topic}.spec.ts`);

  const docContent = renderDocPage({ topic, title, description, weight });
  const specContent = await renderSpecFromTemplate({ topic, route, heading });

  await writeFileSafe(docPath, docContent, opts.force);
  await writeFileSafe(specPath, specContent, opts.force);
  const scriptChanges = await updatePackageJsonScripts(topic);

  const rel = (p) => path.relative(LEARN_ROOT, p);
  console.log(`Scaffolded "${title}" (slug: ${topic})\n`);
  console.log(`  📝  wrote ${rel(docPath)}`);
  console.log(`  🎭  wrote ${rel(specPath)}`);
  console.log(`  📦  updated ${rel(PACKAGE_JSON)}`);
  for (const change of scriptChanges) console.log(change);

  console.log(`
Next steps:
  1. Edit the new page and fill in the TODO sections:
       ${rel(docPath)}
  2. Edit the new spec, adjust selectors and add captures:
       ${rel(specPath)}
  3. Start the Hub stack (VS Code task "stack: start frontend + api",
     or run hub-api on :8080 and hub-frontend on :4200 manually).
  4. Make sure learn/playwright/.env has HUB_BASE_URL + HUB_USERNAME +
     HUB_PASSWORD set (copy from .env.example).
  5. Generate the screenshots:
       cd learn/playwright && npm run ${topic}
  6. Preview the rendered docs:
       cd learn/app && hugo server -D
`);
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exit(1);
});
