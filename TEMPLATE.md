# How to write (or refresh) a Hub documentation page

This guide is the canonical recipe for adding a new page — or refreshing
an existing one — under `learn/app/content/docs/hub/`. Follow it whenever
the Hub frontend gains a new feature, an existing screen is redesigned,
or a screenshot in the docs no longer matches the live product.

It is the meta-template that the `Cases` page (`docs/hub/cases`) and the
`Live view` page (`docs/hub/livestream`) were both written against.

---

## TL;DR

1. **Find the source of truth.** Documentation pages describe how the
   *product* works, not how any single repository is wired. The text and
   the screenshots almost always pull from several monorepo projects at
   once — pick the right ones for the feature you are documenting (see
   [Where to look in the monorepo](#where-to-look-in-the-monorepo)).
2. **Scaffold the page and spec in one command:**

   ```bash
   cd learn/playwright
   npm run new -- <topic> --title="<Title>" --route="/<route>" --heading="<Heading>"
   ```

   This creates `learn/app/content/docs/hub/<topic>/index.md` (with the
   recommended section skeleton) and `learn/playwright/tests/<topic>.spec.ts`
   (generated from `tests/TEMPLATE.spec.ts.example`), and registers the
   matching `npm run <topic>` / `npm run <topic>:headed` scripts. See
   [Scaffolding a new page](#scaffolding-a-new-page) for the full option
   list.
3. **Fill in the page** following the Hugo frontmatter and section
   structure described in [Page structure](#page-structure).
4. **Adapt the spec** so it captures the screenshots referenced by the
   page (see [Generating the screenshots](#generating-the-screenshots)).
5. **Review locally** with `hugo server -D` and the headed Playwright run
   before opening a PR.

The rest of this document expands each step.

---

## Where to look in the monorepo

Most documentation pages cover a single product *feature* whose
implementation is spread across several services. Use the table below to
decide which repositories you need to read before writing the page.

| You're documenting…                          | Read first                                                                                                                        | Read next                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A page in the Hub UI (routes, buttons, copy) | `hub-frontend/kerberos.ng/src/app/**` — the Angular components, templates and i18n keys.                                          | `hub-api/api/**` for the REST endpoints the page hits, and `hub-api/api/internal/**/middleware` for the auth/permissions. |
| A REST or websocket endpoint                 | `hub-api/api/internal/**/handler` and `hub-api/api/internal/common/api/middleware/**`.                                            | `models/pkg/**` for the shared data structures, `database/pkg/**` for storage helpers.                                   |
| Background processing of a recording         | The matching `hub-pipeline-*` repo. See [the pipeline map](#the-pipeline-map) below.                                              | `queue/pkg/**` for the message bus contract and `models/` for the message payloads.                                      |
| A vault/storage concern                      | `vault/`                                                                                                                          | `hub-api/api/internal/storage/**`                                                                                        |
| A configuration knob                         | `helm-charts/charts/hub/values.yaml` (production defaults) and the matching `env` lookups in the service that consumes it.        | The relevant `*.env.example` and `.env.local`.                                                                            |
| An agent-side capability                     | `agent/` (Go) and `agent/ui/` (React UI).                                                                                         | `hub-api/api/internal/**/mqtt` for the messages exchanged with Hub.                                                       |

### The pipeline map

Every recording produced by an agent flows through one or more pipeline
services. Knowing which one owns which behaviour saves a lot of search
time:

| Pipeline service              | What it owns                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `hub-pipeline-analysis`       | Object/face detection and metadata enrichment.                                                |
| `hub-pipeline-export`         | The export and archive flow used by **Cases**.                                                |
| `hub-pipeline-notification`   | Channel delivery (email, Slack, webhooks, …) for events and alerts.                           |
| `hub-pipeline-redaction`      | Face redaction / blurring of recordings.                                                      |
| `hub-pipeline-sequence`       | Grouping consecutive recordings into a single sequence.                                       |
| `hub-pipeline-thumbnail`      | Thumbnail extraction shown in the Recordings and Cases UIs.                                   |

A documentation page for an end-user feature typically reads from at
least three of those layers. For example, the **Cases** page combines:

- `hub-frontend/kerberos.ng/src/app/home/cases/**` for the UI flows
  (overview, expanded row, modal, detail page, share modal).
- `hub-api/api/internal/cases/**` for the REST endpoints and the
  permission model (who can manage assignees, delete, share, …).
- `hub-pipeline-export/**` for the archiving job that copies the
  recording to the Vault archive provider.
- `helm-charts/charts/hub/values.yaml` for the `kerberosvault.archive.*`
  configuration the docs need to explain.

The Live view page (`docs/hub/livestream`) similarly draws from
`hub-frontend`, `hub-api` and the agent's MQTT/WebRTC stack.

---

## Page structure

Every page under `learn/app/content/docs/hub/<topic>/index.md` follows
the same shape — copy an existing one (`cases/index.md` and
`livestream/index.md` are good references) and adapt the content.

### Frontmatter

```yaml
---
title: "Live view"
description: "Watch your devices in real time from Kerberos Hub."
lead: "Watch your devices in real time from Kerberos Hub."
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 304   # see /docs/hub/_index.md for the existing ordering
toc: true
---
```

Pick a `weight` that places the page in a sensible spot relative to its
neighbours. The existing pages currently span roughly 301–399 for the
core Hub features.

### Recommended sections

Most pages cover the same set of questions; reuse the headings below as
a checklist and drop the ones that do not apply.

1. **Introduction** — one or two paragraphs answering *"what is this page
   in the Hub UI and what does it let me do?"*. Anchor the reader by
   stating the route (`/livestream`, `/cases`, …) and the sidebar entry
   that opens it. End the intro with the overview screenshot.
2. **How it works** — a short architectural note when the feature relies
   on non-obvious plumbing (MQTT/WebRTC for Live view, Vault archiving
   for Cases, the export pipeline for media downloads, …). Keep this
   high-level — a single diagram or a few bullets, not a tutorial.
3. **Walkthrough of the UI** — one subsection per pane / control group.
   Embed a screenshot for every non-trivial state and keep the captions
   self-contained (they should make sense in a search result excerpt).
4. **Permissions & roles** — when the feature has per-role behaviour,
   call it out explicitly: who can read, who can write, who can delete.
   Link to the central [roles documentation]({{< ref "/docs/hub/roles" >}})
   for the gory details.
5. **Configuration** — every Helm value, env var or feature flag the
   admin needs to know about, with a `values.yaml` snippet and the
   matching env var name.
6. **Troubleshooting** — a small FAQ-style block listing the failures
   users have actually hit in support tickets, with a copy/pasteable
   diagnosis.

### Embedding screenshots

Use Hugo's `figure` shortcode for every image so the docs render with a
consistent caption style and lightbox behaviour:

```text
{{</* figure src="hub-<topic>-overview.png" alt="..." caption="..." class="stretch" */>}}
```

Name every PNG `hub-<topic>-<thing>.png` so files from different topics
never collide on disk.

---

## Scaffolding a new page

The `learn/playwright/scripts/new-hub-page.mjs` helper bootstraps every
file a new doc page needs in one command, following this template. Run
it via the npm wrapper so paths resolve correctly:

```bash
cd learn/playwright
npm run new -- <topic>
```

Where `<topic>` is the lowercase, kebab-case slug used both as the
content folder (`docs/hub/<topic>/`) and the spec filename
(`tests/<topic>.spec.ts`).

### Options

| Flag                   | Default                            | Purpose                                                                  |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `--title=<text>`       | title-cased `<topic>`              | Frontmatter `title` and the heading the spec waits for.                  |
| `--description=<text>` | `Documentation for the <Title> page.` | Frontmatter `description` and `lead`.                                    |
| `--route=<path>`       | `/<topic>`                         | Frontend route the spec navigates to (`page.goto`).                      |
| `--heading=<text>`     | same as `--title`                  | Text the spec waits for to confirm the page rendered.                    |
| `--weight=<n>`         | `399`                              | Hugo menu weight — pick a value that slots between existing pages.       |
| `--force`, `-f`        | off                                | Overwrite the doc page, spec file or npm scripts if they already exist.  |

### What it generates

1. **`learn/app/content/docs/hub/<topic>/index.md`** — Hugo frontmatter,
   a `figure` reference to `hub-<topic>-overview.png`, and `TODO` markers
   for every recommended section (Introduction, How it works, Walkthrough,
   Permissions, Configuration, Troubleshooting).
2. **`learn/playwright/tests/<topic>.spec.ts`** — a copy of
   `tests/TEMPLATE.spec.ts.example` with every `<TOPIC>`, `<route>` and
   `<Page heading>` placeholder substituted. The instructional header from
   the template is stripped out (a short banner pointing back at
   `learn/TEMPLATE.md` replaces it).
3. **Two new npm scripts** in `learn/playwright/package.json`:
   - `npm run <topic>` — runs the spec headlessly.
   - `npm run <topic>:headed` — same, with a visible browser.

Example:

```bash
cd learn/playwright
npm run new -- devices \
    --title="Devices" \
    --route="/devices" \
    --weight=308
```

The scaffolder refuses to overwrite existing files unless you pass
`--force`, so it's safe to re-run with different options while iterating.

### Updating an existing page

The same script also supports incremental edits, so you can grow a page
section by section (or capture by capture) without hand-editing
boilerplate.

**Add a new section to an existing doc page:**

```bash
cd learn/playwright
npm run new -- <topic> --add-section="Pagination" --screenshot=pagination
```

Appends `## Pagination` (with a `TODO` body) to
`docs/hub/<topic>/index.md`. When `--screenshot=<name>` is also passed,
embeds a `figure` shortcode for `hub-<topic>-<name>.png` under the
heading so the screenshot is referenced as soon as you commit. Use
`--level=3` for an `###` subsection.

**Add a new screenshot capture to an existing spec:**

```bash
cd learn/playwright
npm run new -- <topic> --add-capture="empty-state" \
                       --describe="empty placeholder" \
                       --update-doc
```

Appends a new `test('captures the empty placeholder', ...)` block to
`tests/<topic>.spec.ts` that writes `hub-<topic>-empty-state.png`. With
`--update-doc`, the matching `figure` reference is also appended to the
doc page. Edit the generated test body to drive the UI to the state you
want to capture, then re-run `npm run <topic>`.

## Generating the screenshots

The screenshots that illustrate a Hub page are produced by Playwright
scripts living in `learn/playwright/`. Generating them is a two-step
process: stand up the Hub stack locally, then run the spec.

### 1. Start the Hub stack locally

The Playwright runner drives a real browser against
`http://localhost:4200`, so you need the frontend and its API up and
running before you launch it. The easiest way is to use the VS Code
tasks defined at the root of the monorepo:

- `stack: start frontend + api` — runs `hub-frontend` and `hub-api`
  side-by-side. This is what the spec expects.

Or manually from two terminals:

```bash
# Terminal 1 — Hub API (defaults to :8080)
cd hub-api
ENV_FILE=api/.env.local go run ./api serve

# Terminal 2 — Hub frontend (defaults to :4200)
cd hub-frontend/kerberos.ng
npm install --legacy-peer-deps
npm run start-dev
```

`api/.env.local` must point the API at a MongoDB and a Vault you can
reach (the dev container ships with both); copy `api/.env` as a starting
point and adapt the connection strings.

### 2. Configure the runner

```bash
cd learn/playwright
npm install
npx playwright install-deps
npx playwright install chromium
cp .env.example .env
```

Edit `.env` and set:

| Variable        | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `HUB_BASE_URL`  | `http://localhost:4200` for a local Hub stack.                        |
| `HUB_USERNAME`  | Email of a Hub user that can see the data you want to screenshot.    |
| `HUB_PASSWORD`  | Password for that user.                                              |
| `SCREENSHOT_DIR`| _(optional)_ override the output folder, relative to `learn/playwright/`. |

### 3. Write the spec

Use the scaffolder described in
[Scaffolding a new page](#scaffolding-a-new-page) — it copies the
template and substitutes every `<TOPIC>` / `<route>` / `<Page heading>`
placeholder for you, and registers the matching npm scripts:

```bash
cd learn/playwright
npm run new -- <topic> --title="<Title>"
```
The template wires up:

- `login(page)` — signs in with the credentials from `.env`.
- `captureFor('<topic>')` — returns a `shoot(page, file)` helper that
  writes 1450×750 PNGs to `learn/app/content/docs/hub/<topic>/`.
- `gotoAndWait`, `revealHoverControls`, `isPresent`, `skipBecause` from
  `tests/utils/page.ts` — small reusable helpers that keep each
  `test(...)` block to a handful of lines.

When the data needed for a screenshot may be missing on some
environments (no devices, no cases, no notifications, …) skip the
capture instead of failing the spec:

```ts
if (!(await isPresent(tile, 15_000))) {
  return skipBecause(testInfo, 'no-stream', 'No devices connected.');
}
```

This way the spec stays green on a freshly-seeded environment but still
reproduces the same UI captures on a dev account that has real data.

### 4. Run it

```bash
cd learn/playwright
npm run <topic>            # headless — what CI will do
npm run <topic>:headed     # visible browser — useful while iterating
```

(The npm scripts were registered for you by `npm run new`. If you wrote
the spec by hand instead, add them to `learn/playwright/package.json`
yourself next to the existing `cases` / `livestream` entries.)

The PNGs land directly in `learn/app/content/docs/hub/<topic>/`,
overwriting any previous version. Commit them together with the
Markdown changes so the docs and the spec stay in lockstep.

### 5. Preview the rendered docs

```bash
cd learn/app
hugo server -D    # or the VS Code task `learn: serve`
```

The site reloads on every change to either Markdown or PNG; visit
`http://localhost:1313/docs/hub/<topic>/` and double-check every
screenshot is rendered with the right caption and at the right size.

---

## Definition of done

Before opening a PR, confirm that:

- [ ] The page is reachable from the sidebar at the expected `weight`.
- [ ] Every screenshot referenced from the Markdown exists in the topic
      folder and was produced by the spec (no manual crops).
- [ ] The spec passes headlessly against a freshly logged-in Hub user.
- [ ] Captions are self-contained and explain *what the user is looking
      at*, not *how the screenshot was generated*.
- [ ] Configuration knobs documented on the page match the current
      defaults in `helm-charts/charts/hub/values.yaml` and the matching
      service env files.
- [ ] Related pages (e.g. `roles/`, `configuration/`) are cross-linked
      with `{{</* ref "..." */>}}` so navigation works in both directions.

---

## Existing pages to use as templates

| Topic        | Page                                          | Spec                                              |
| ------------ | --------------------------------------------- | ------------------------------------------------- |
| Cases        | `learn/app/content/docs/hub/cases/index.md`        | `learn/playwright/tests/cases.spec.ts`            |
| Live view    | `learn/app/content/docs/hub/livestream/index.md`   | `learn/playwright/tests/livestream.spec.ts`       |
| Recordings   | _(uses the `cases/` folder for shared captures)_   | `learn/playwright/tests/media.spec.ts`            |

When in doubt, copy the closest match and adapt — the two reference
pages above were written against this template and exercise every
convention it documents.
