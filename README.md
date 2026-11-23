# Documentation

A modern, fast, and feature-rich documentation website built with [Hugo](https://gohugo.io/) and the [Hextra](https://github.com/imfing/hextra) theme.

## Features

- 📝 **Fast & Lightweight**: Built with Hugo, one of the fastest static site generators
- 🎨 **Modern Design**: Clean and responsive UI powered by the Hextra theme
- 🔍 **Full-Text Search**: Built-in search functionality
- 🌙 **Dark Mode**: Automatic dark mode support
- 📱 **Mobile-Friendly**: Fully responsive design
- 🚀 **SEO Optimized**: Built-in SEO best practices
- 📦 **Easy to Deploy**: Static files that can be hosted anywhere

## Favicons

The icons in `app/static/` use the same white UUG wordmark on a midnight
background as the website: ICO, 16/32px browser PNGs, a 180px Apple touch icon,
and 192/512px app icons. The custom
`app/layouts/_partials/favicons.html` partial and `app/static/site.webmanifest`
use `?v=uug-midnight` URLs to refresh older cached artwork. The manifest and
page titles retain **Learn**, while the header wordmark is **UUG**. The
documentation refers to Agent, Factory, Vault and Hub without a company prefix.
Keep functional domains, repository and package names, API schemas, and legal
copyright notices unchanged when updating editorial naming.

## Tutorial artwork

The Claude Code and Claude web UI tutorials share the black Claude/UUG banner in
`app/assets/images/tutorial-claude-uug.svg`, selected by their `header` front
matter for article headers and catalog cards. Tutorial headers also accept
`header-art.*` page resources (including SVGs); other tutorials retain their
product illustrations.
The banner's UUG lettering is outlined from the self-hosted Outfit font at weight
600 with 0.12em tracking, matching the navbar without relying on fonts inside images.
The MongoDB indexes tutorial uses `app/assets/images/tutorial-mongodb-cli.svg`
for a matching black banner with the MongoDB leaf and a CLI terminal.

The **Connect your VMS to Claude** tutorial documents the web connector flow
inspected on 9 November 2026: Settings > Customize > Connectors, No sign-in,
the built-in authorization request header, and Streamable HTTP. It does not
require an OAuth flow or an `Accept` override. Recheck the UI before updating
these steps; inspecting setup is not proof of a successful live connection.
Its screenshots retain the full landscape browser viewport at 1600px wide
(approximately 16:10), with the sidebar collapsed and placeholder credentials.

Branded tutorial panels, including "What you'll do", use the solid
`--surface-strong` background in both themes, retaining accent borders and icons.
Editorial hyperlinks use the blue-purple `--link-color`, matching the primary
accent in light mode with a lighter tint for dark-mode contrast. Product
documentation retains its product-specific link accents.
Warning callouts use muted gray-yellow backgrounds, borders, and text in both
themes; other callout types retain their existing colors.

## Tutorial SEO

Tutorial front matter supplies `date`, optional `lastmod`, and an optional
`author` map with `name`, `url`, and `avatar`. The parameter-free
`tutorial-byline` shortcode and Article JSON-LD use these same fields.
Keep existing publication dates, update `lastmod` only for meaningful content
changes, and do not invent author credits for unattributed pages.

Every tutorial requires `images: ['social.png']`. Its page-bundle PNG is a
1200x630 raster preview derived from the existing banner. With Hugo running,
run `npm run tutorial-social-images -- http://127.0.0.1:1313` in `playwright/`
after changing artwork. Generate the preview before adding a new tutorial's
`images` entry; the build explicitly rejects missing previews. Open Graph,
Twitter large-image cards, and Article JSON-LD share the preview.
Tutorial metadata also includes ordered BreadcrumbList JSON-LD.

Production builds generate a plain-text `robots.txt` with the canonical sitemap;
development builds disallow crawling. Nginx serves generated pages and static
assets directly and returns the generated 404 page with HTTP 404 for missing
URLs, rather than silently serving the homepage. The container smoke test
checks those responses, crawler policy, and a published tutorial.

Run `npm run test:navigation -- --grep 'tutorial SEO'` in `playwright/` to check
the full tutorial catalog's metadata, bylines, image dimensions, sitemap,
robots policy, and missing-page behavior. These tests are also included in the
normal navigation suite. Publishing a release still requires a separate GitOps
production promotion before the new pages and SEO fixes reach `learn.uug.ai`.

## Blog design and comparisons

The blog catalog and article templates reuse the tutorial catalog's card,
typography and illustration styles, with blog-specific layout rules in
`app/assets/css/blog.css`. Blog cards show reading time and an editorial category,
not tutorial level or prerequisites. They retain topic links and pagination.
Articles retain the existing `authors` list (`name`, optional `link` and `image`),
publication dates, podcast controls, page overview and previous/next navigation.
Do not invent an author for an unattributed article.

Articles end with **You might also be interested in**, reusing the blog cards.
Show up to three other blog posts: shared-topic matches first, newest first in
each group, then recent posts to fill any remaining slots. Never recommend the
current article, and omit the section when there are no other posts.
The comparison articles explicitly credit Cedric Verstraeten through the same
`authors` front matter used by the existing blog, including byline, avatar and
structured author metadata.

Article headers start with the breadcrumb and the title: there is no
**All articles** link or category label above the title, and body text, the
lead, tables, panels and figures all use the full article width.

The security article `/blog/zero-known-cves/` uses the `blog-release-gate`
illustration: a build passing GOVULNCHECK, TRIVY (with a red alarm) and SBOM
scanners and a release gate showing 0 CVEs, then signing and production. It
is drawn in uug-ai/design (`renderIsoSvg('blog-release-gate', 'ISO_ID')` in
`src/components/IsoIllustration/figures.ts`) and exported unchanged, with a
trailing newline, to `app/assets/iso/blog-release-gate.svg`. Its page-bundle
`social.png` is the dark-mode, reduced-motion render of that header, fitted
to 1200x630 on `#0b0b12`, the same recipe as the tutorial previews. Its
external figures were checked against the linked sources on 23 November 2026.

Blog pages can select an existing `illustration` from `app/assets/iso/` and an
`artworkAlt`; the default is the ecosystem illustration. `category` defaults to
Perspective. An optional `header` selects a page-bundle or `app/assets/` image
instead, for both the article and its cards. Set `artworkAlt` to describe it;
`headerWidth` and `headerHeight` default to 1200 and 675. Card images are contained
so brand marks are not cropped. An optional page-bundle `images: ['social.png']` supplies the raster
social preview. `article-seo.html` shares article/breadcrumb metadata with
tutorials while retaining their required-image validation; blog articles emit
BlogPosting metadata and support the existing authors list.

The Arcules comparison lives at `/blog/arcules-vs-augment-vision/`. Its former
tutorial URL is a Hugo alias, and the original social-image URL is retained under
`app/static/tutorials/hub/arcules-vs-augment-vision/` for previously shared links.
The comparison is an intentional exception to general editorial naming rules.
It is a sourced, first-party comparison, not a setup tutorial or benchmark.
Its black comparison banner is a page-bundle resource (`header-art.svg`), keeping
the article and its image together, and follows the Claude tutorial: the official
[Milestone wordmark](https://www.milestonesys.com/Static/Img/Global/logo.svg),
retained at `app/assets/images/milestone-logo.svg`, identifies the current
Arcules provider beside a typeset product label; the outlined UUG wordmark is
reused unchanged from `tutorial-claude-uug.svg`. It is not a recreated legacy
Arcules logo or a product screenshot. All marks belong to their owners and are
used to identify the compared products. Regenerate the banner and its 1200x630
social preview with `node scripts/generate-comparison-headers.mjs` in
`playwright/`. The article's three `rete` drawings explain operating boundaries,
storage choices and a WAN outage; keep their deployment-specific captions and
editable Draw payloads intact.

The matching Alta comparison is `/blog/avigilon-alta-vs-augment-vision/`. It
focuses on Alta Video, not Alta Access or Avigilon Unity, and explicitly covers
Alta's external S3-compatible storage, licensed CIFS backup, APIs and export
verification. Its three editable diagrams explain camera paths, recording and
backup placement, and example integration contracts. The official Avigilon
wordmark is retained in `app/assets/images/avigilon-logo.svg`, extracted from the
inline header SVG at [Avigilon Alta](https://www.avigilon.com/alta) on
18 November 2026. Its paths are unchanged; the comparison banner uses white
`currentColor` and a typeset Alta product label. The shared comparison-header
generator regenerates both articles' self-contained page-bundle headers and
social previews. Both comparisons are intentional editorial-naming exceptions.

Use **UUG** as the platform name in comparison titles, prose, diagrams and
artwork descriptions. Keep the published `*-vs-augment-vision` URL slugs unchanged
for compatibility with existing links.

Comparison body imagery must show real application screens, not marketing
composites or generated interfaces. The page-bundle `arcules-views.webp` comes
from the [Arcules Views guide](https://help.arcules.com/en/articles/2042903-views);
`alta-video-view.webp` comes from the
[Alta Video view guide](https://docs.avigilon.com/bundle/alta-video/page/Products/aware/vidview/awarevideoview.htm)
(`Resources/Images/screens/video-view2.png` in that documentation bundle).
Both were retrieved on 18 November 2026. The shared
`app/static/images/blog/uug-hub-recordings.webp` is derived from the existing
`app/content/docs/hub/recordings/hub-recordings-grid.png` documentation capture.
All three preserve the complete application screen and its native dimensions,
encoded with Sharp WebP quality 90, effort 6. Each is under 400 KiB.
Keep source-linked captions, descriptive alt text, explicit image dimensions,
lazy loading and a link to the full-size image. Use the built-in `figure`
shortcode with `class="blog-product-image"` for responsive, uncropped display.
Do not present these different documentation deployments as a matched benchmark
or evidence of feature parity. Vendor screenshot copyrights remain with their owners.
Both articles also reuse the existing
`/docs/hub/workflows/images/hub-workflow-designer.png` capture directly from the
external-stages guide. It illustrates the forwarder connection to a custom-model
worker, not model training or weights upload. Keep the distinction between
production configuration-based workflow registration and the visual designer,
and do not imply that custom stages or the forwarder are enabled in every offering.
Both comparison introductions also reuse
`/docs/hub/analytics/hub-analytics-overview.png` alongside the respective vendor's
interface image. Its caption identifies the actual Hub Analytics dashboard shown, rather
than presenting it as a new capture of the Dashboard home page.

Run `npm run test:navigation -- --grep 'blog|tutorial SEO' --timeout=120000`
in `playwright/` for the responsive blog layouts, comparison redirect, article
metadata, social preview and tutorial SEO regressions. Use
the `blog articles retain authors` test for the existing blog author's byline
and podcast integration.

## Architecture drawings

[Draw](https://draw.uug.ai/) is the single drawing and architecture
editor. The navigation and documentation card open Draw, and every `rete` diagram's
**Edit in Draw** link carries its original editable configuration as base64-encoded
UTF-8 JSON in `#diagram=…`. No diagram payload is sent in an HTTP path or query.
Learn keeps the embedded diagram renderer for documentation, not a second editor.

The **How it works** guide uses six editable diagrams for the solution stack,
Agent internals, single-camera processing, scaling, Vault storage and Hub
integration. Keep these as `rete` shortcodes rather than static image exports so
readers can open each architecture in Draw.

Diagram fullscreen fills the browser viewport, including the header area, and
can be closed with its toolbar button or Escape. While active, the podcast
article's stacking isolation is released so it cannot trap the drawing below
the site navigation; normal podcast highlighting is unchanged after exit.

The legacy `/designer/` page redirects to Draw while preserving its raw fragment,
so existing standard-base64 and unpadded URL-safe share links continue to work.
Draw waits for onboarding and a live board connection before importing, fits and
selects the shapes, and replaces the fragment with the collaboration URL only after
server acknowledgement. Publish Draw's automatic-import support before promoting
these Learn changes.

Run `npm run test:draw` in `playwright/` to check navigation, every architecture
diagram's payload and legacy redirects. The suite discovers diagram pages from
the content tree automatically, so new diagrams are covered too.

## Prerequisites

- [Hugo](https://gohugo.io/installation/) (Extended version >= 0.112.0)
- [Git](https://git-scm.com/)

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/uug-ai/documentation.git
cd documentation
```

2. Install the Hextra theme:
```bash
cd app
hugo mod get -u github.com/imfing/hextra
```

To work on the theme locally, vendor it into the project:
```bash
cd app
hugo mod vendor
```

This makes the Hextra source available under `app/_vendor/github.com/imfing/hextra/`, including editable CSS files such as `assets/css/styles.css` and `assets/css/custom.css`.

Or if using Git submodules:
```bash
git submodule add https://github.com/imfing/hextra.git app/themes/hextra
git submodule update --init --recursive
```

### Local Development

1. Navigate to the app directory:
```bash
cd app
```

2. Start the Hugo development server:
```bash
hugo server -D
```

3. Open your browser and visit `http://localhost:1313`

The site will automatically reload when you make changes to the content.

### Platform Engineering guides

The [Platform Engineering section](app/content/guides/platform-engineering/_index.md)
connects the monorepo development workspace to GitHub delivery, GitOps
promotion, Argo CD reconciliation, and rollout verification. Its
[source map](app/content/guides/platform-engineering/sources.md) records the
private repository revisions supporting the documented behavior. When changing
these guides, recheck the consuming workflow or Application, keep recommendations
distinct from configured controls, and use sanitized examples rather than raw
environment values. Existing section URLs remain unchanged.

### Product documentation navigation

Agent, Factory, Vault, and Hub keep **First things first**, **Getting started**,
and **Installation** at the top of their sidebars, followed by a collapsible
**Topics** group. All other published, visible pages in each product appear
there automatically, sorted A-Z by their navigation title. Nested guides
retain their own weight-based order. The group opens on the product overview
and when reading any topic or its nested guides. Page URLs and breadcrumbs
do not change.

The introductory pages and group label are configured in
each product's `app/content/docs/<product>/_index.md` under `sidebar`.
The shared `app/layouts/_partials/docs/topic-navigation.html` partial also
keeps article footer links in the same order. Other documentation sections
keep their existing navigation. The tracked vendored Hextra sidebar and
pager templates use this partial; preserve those integrations when updating
the theme.

Run `npm run test:navigation` in `playwright/` to check desktop/mobile grouping,
alphabetical ordering, nested guides, footer navigation, and product colors.

The header wordmark is **UUG**, configured by `params.navbar.brandText` in
`app/hugo.yaml`; page titles and installable app metadata retain **Learn**.
The global header matches the website and design toolkit at 77px tall: a 4px
gradient accent, a 72px content row, and a 1px bottom border. Topbar controls use
flex layout to avoid extra inline baseline spacing. The navigation tests also
verify this height on home, documentation, and tutorial pages in both themes.

Each product's content hyperlinks and hover/focus states use its product
accent. Headings, idle menu links, breadcrumbs, page
overview, and previous/next links stay neutral. Product names have no decorative
circles; the current-page sidebar highlight retains the product accent:

| Product | Accent |
| --- | --- |
| Agent | Brick red `#933734` |
| Factory | Green `#4a786a` |
| Vault | Slate blue `#56618f` |
| Hub | Orchid `#a239d7` |

The `sidebar.product` field on each product overview scopes these accents to
that product's entire sidebar branch. The documentation article template also
resolves this identity from the page's ancestors so every nested guide carries
the same product color, without repeating front matter. The color rules live
in `app/assets/css/custom.css`. Link text and highlights adapt to light/dark
mode for at least 4.5:1 text contrast, which
the navigation tests measure. The global navbar and non-product sections retain
the shared palette. A link into another product's docs takes the *destination*
product's color (see [Linking between products](#linking-between-products));
sidebar branches always retain their own product colors.

### Linking between products

Each product section stands on its own, but readers move between products at
a few seams: an Agent uploads to Vault (Agent *Connect to Vault* ↔ Vault
*Accounts*), Vault passes recordings to Hub (Vault *Integrations* ↔ Hub
*Pipeline*), and an Agent connects to Hub (Agent *Connect to Hub* ↔ Hub
*Configuration → Assign an Agent*). Explain only your own product's side of a
seam and link to the other side at the step where the reader needs it.

- **Write internal links as absolute paths**, `[Accounts](/docs/vault/accounts)`,
  not `{{< relref >}}` and not relative paths. The link render hook
  (`app/layouts/_markup/render-link.html`) resolves them to the page, and
  warns during the build when a path does not resolve to a page (an alias
  doesn't count).
- **Cross-product links are marked automatically.** When the destination is in
  another product (Agent, Vault, Hub, Factory), the hook adds
  `class="learn-xlink"` and `data-product`, so the link takes that product's
  color and screen readers hear "(Vault documentation)". Product names come
  from `app/data/products.yaml`; product detection is shared with the article
  layout in `app/layouts/_partials/docs/product.html`.
- **Pages at a seam end with a "Works with" panel.** List the counterpart pages
  in front matter; the build fails if a page doesn't exist:

  ```yaml
  connects:
    - page: /docs/vault/accounts
      why: Create the account whose access and secret key the Agent uploads with.
    - page: /docs/hub/configuration#assign-an-agent
      title: Assign an Agent   # optional, defaults to the page's link title
      why: Find the keys in Hub and assign the Agent to a site.
  ```

### Product overviews

The Agent, Factory, Vault, and Hub landing pages at `/docs/<product>/` introduce
the product, show an animated illustration, explain its workflow in three steps,
and link to the next guides. Content lives in each product's
`app/content/docs/<product>/_index.md`.

Each product has its own artwork, rendered with the `iso-figure` shortcode
(`figure="agent-link"`, `"factory"`, `"vault"` and `"hub"`). To replace one, add
the SVG under `app/assets/iso/` and change the shortcode's `figure`, `alt`, and
`caption` in the corresponding overview. The shared shortcode handles the animation styles
and accessible description; no template changes are needed.

The navigation tests also check these overviews, their illustrations, and
getting-started links on desktop and mobile.

### Code blocks

Indented and fenced code use a single padded charcoal surface with a subtle
6% product accent tint and a muted border. Pages outside product documentation
use the same charcoal with a subtle blue tint.
Code inside a block has no inline-code chip, border, or extra padding; inline
code in prose keeps its existing treatment. Long lines scroll horizontally and
retain whitespace.
Fenced code resets Hextra's inner `pre` margin so its text has balanced vertical
spacing, including single-line examples.

Fenced blocks use a component-local dark theme in the tracked Hextra
`app/_vendor/github.com/imfing/hextra/layouts/_markup/render-codeblock.html`
hook, reusing the theme's dark syntax palette in either page theme. Preserve
this class when updating Hextra. Filename headers stay above the code, and
copy controls remain visible on touch devices and when keyboard-focused.
Mermaid diagrams are not given a code surface.

Run `npm run test:code-blocks` in `playwright/` for the focused desktop/mobile
checks, including the draft Factory cloud-installation page from the UI report,
product tint values, text contrast, scrolling, filename layout, and copying.

### Article podcasts

The [podcast template](podcast/README.md) scaffolds source-linked, two-host
episodes for any documentation page, using a consistent conversational outline
and shared interactive player. Generation and review remain local until an
episode is approved. Approved episodes are exported into site assets and
enabled with a page's `podcast` front matter.
All 104 published, substantive articles include an overview through a headphone
**Listen to the overview** button with an estimated duration. Coverage includes
all product documentation and overviews, CLI and platform references, tutorials,
completed engineering guides, the CORS knowledge-base article, blog posts,
release notes, and support. The 68 episodes added beyond Hub use the existing
female host and Kokoro's `am_puck` male guide; the organisations overview is
preserved. Drafts, empty pages, "To be written" placeholders, catalogues, and
navigation-only pages intentionally have no podcast.
Episodes introduce the mental model and one everyday example rather than
narrating setup details. The compact player offers playback and chapters,
remembers progress in this browser, and keeps audio controls reachable while
reading, without transcript or download links. A single soft background marks
the current topic's section, without badges or marks on earlier topics.
The bottom playbar also shows the current section beside the audio controls,
updating as playback moves or seeks between topics.
Playback scrolls to each new section below the fixed header; chapter selection
also brings its section into view. It does not keep scrolling within a topic
and respects reduced-motion preferences.
Playback never starts automatically. Documentation, general articles, blog posts,
and release notes share the same header control and player while retaining their
own layouts and metadata. Pages without a podcast do not load podcast assets.
Source review and automated audio checks do not constitute human listening
approval; listen before a production release.
See the [publication workflow](podcast/README.md#publish-an-approved-episode-to-learn)
and run `npm test` in `podcast/` for source, coverage, audio-integrity, and timing
checks. Run `npm run podcast` in `playwright/` for playback and chapter-link tests
on every published episode, plus the shared player's interaction tests.

## Google Analytics and calls to action

Production Learn uses its own web stream
(`G-ZW744GSN4M`, stream ID `16226732617`) in the existing GA4 property
(`540298183`). The public website retains its separate stream
(`G-PLRKXEQ42W`). Filter by Stream name, hostname, or `site_area = learn`.
Separate streams and consent choices are not a guarantee of uninterrupted
cross-site user/session attribution.

The measurement ID is configured through `services.googleAnalytics.ID` and
the permitted hostname through `params.analytics.productionHost` in
`app/hugo.yaml`. The Hextra analytics override loads the local consent controller
only in production builds, and only on HTTPS `learn.uug.ai`; localhost,
development builds, and other preview hosts never initialize production
analytics. Changing the ID
requires a rebuild, not an environment variable in the nginx container.

To debug the consent banner locally, start the dev server with
`HUGO_PARAMS_ANALYTICS_DEBUG=true hugo server -D`. Non-production builds then
render the banner and run the consent controller on any host, but log every
`gtag` call to the browser console instead of loading Google. Production builds
ignore the flag.

Learn uses Google Consent Mode v2 in advanced mode: the GA tag loads on every
page with all consent types denied, so until a reader accepts (and after they
reject) GA receives only cookieless pings, which Google uses for modelled
reporting. Accept cookies grants `analytics_storage`; advertising consent always
stays denied. The banner tells readers about the cookieless collection. Get
privacy sign-off before changing this behaviour.

Readers accept or reject analytics cookies in the banner, which appears until they
choose; there is no footer link to reopen it.
Learn uses the `learn` cookie prefix and limits cookies to `learn.uug.ai`.
Rejecting returns GA to cookieless pings and clears only Learn's accessible GA
cookies, leaving the public website's shared parent-domain cookies alone.
Consent is stored per origin in `uug-analytics-consent`; a choice on `uug.ai`
does not automatically count as a choice on `learn.uug.ai`. Blocked storage is
reported and the choice then applies only to the current page.

Every page offers View demo and Talk to our team in the footer. The controller
also classifies existing onboarding, support, GitHub, website, product, and
explicit download links, without changing their destinations or blocking
navigation:

| Event | Meaning | Parameters beyond page context |
| --- | --- | --- |
| `page_view` | One page view per page load (cookieless until consent) | None |
| `view_demo` | Demo launch intent | `cta_id`, `cta_placement`, `destination_host` |
| `contact_sales_click` | Click to the public contact page, not a submitted lead | Same CTA parameters |
| `learn_resource_click` | Existing resource/onboarding/support link | Same CTA parameters |
| `learn_podcast_start` | First playback per article audio element, not merely opening the player | None |

Page context is `site_area: learn`, `content_section` (docs, tutorials, guides,
etc.), and `product_id` where the route identifies Agent, Factory, Hub, or
Vault. A product link uses its destination product as `product_id`.
`cta_id` is a bounded label such as `github`, `support`, `support_email`,
`getting_started`, `product`, `website`, or `download`; `cta_placement` is
`footer`, `navigation`, `article`, or `sidebar`. No custom events include link
text, email addresses, search input, query strings, or fragments. Page locations
omit all query parameters (including UTMs); own-site referrers omit queries and
external referrers retain only their origin. Enhanced measurement is disabled
on the Learn stream to avoid duplicate automatic interactions and uncontrolled
search/form/link parameters; the explicit page-view and CTA events still work.
The public website's enhanced-measurement settings are unchanged.

GA Admin has event-scoped custom dimensions for `site_area`, `content_section`,
`product_id`, `cta_id`, and `cta_placement`. `view_demo` and
`contact_sales_click` are key events, counted once per session with no default
monetary value. They measure intent, not successful demos or submitted enquiries.
Key-event definitions are property-wide: use the Learn stream filter for Learn
results. Existing career dimensions and job-application events are unchanged.
Do not mark all resource clicks or page views as conversions. Actual enquiry
completion remains the responsibility of the public website. New custom
dimensions can take 24-48 hours to appear in reports.

Validate without sending production telemetry:

```bash
cd playwright
npm run test:learn-analytics
```

The tests serve a production Hugo build locally and proxy an HTTPS Learn
fixture to it. Google scripts and external CTA destinations are intercepted
inside the local Playwright runner; no forms are submitted. They cover
consent/rejection, persistence, withdrawal, privacy, event shapes, podcast
deduplication, and localhost gating.
Deploy/rebuild the Learn site before expecting production traffic in the new
stream. Local tests intentionally intercept telemetry rather than polluting GA.

## Project Structure

```
.
├── app/
│   ├── archetypes/       # Content templates
│   ├── assets/           # CSS, JS, images
│   ├── content/          # Documentation content (Markdown files)
│   ├── data/             # Data files
│   ├── i18n/             # Internationalization files
│   ├── layouts/          # Custom layout templates
│   ├── static/           # Static files (copied as-is)
│   ├── themes/           # Hugo themes
│   └── hugo.toml         # Hugo configuration
├── Dockerfile            # Docker configuration
└── README.md            # This file
```

## Creating Content

### Adding a New Page

Create a new Markdown file in the `app/content/` directory:

```bash
cd app
hugo new docs/your-page.md
```

Edit the file with your content:

```markdown
---
title: "Your Page Title"
date: 2025-11-07
draft: false
---

Your content here...
```

### Organizing Content

Content is organized in the `app/content/` directory. Create subdirectories to structure your documentation:

```
content/
├── _index.md          # Homepage
├── docs/
│   ├── _index.md      # Docs section index
│   ├── getting-started/
│   ├── guides/
│   └── reference/
```

### Adding release notes

Create one Markdown page per GitOps release, using the release tag as the file
name:

```bash
cd app
hugo new --kind release-notes release-notes/2026-09-04.md
```

Set the release date, concise summary, and customer-facing topic `tags` in the
generated front matter, replace the placeholder with the public release body,
and set `draft: false`. Omit generated pull request lists and internal-only
details. Tags are shown on release overview/detail pages, link to filtered Hugo
taxonomy pages, and are included as page-level terms in global search. The
`/release-notes/` page sorts releases newest first, paginates them in groups of
ten, and builds each page's version navigation from those releases.

## Configuration

The main configuration file is `app/hugo.toml`. Customize it to match your project:

```toml
baseURL = 'https://docs.example.com/'
languageCode = 'en-us'
title = 'Your Documentation Site'
theme = 'hextra'
```

## Building for Production

To build the static site for production:

```bash
cd app
hugo --minify
```

The generated site will be in the `app/public/` directory.

## Deployment

The hosted `https://learn.uug.ai` site uses versioned
`ghcr.io/uug-ai/learn` images managed by `uug-ai/gitops` and Argo CD.
After merging a change, run the **Bump release** workflow with a patch bump.
Like Hub Frontend, it offers a **hardened** checkbox (off by default), a
**publish** checkbox (on by default), and **existing_tag** for retries without
creating a new version or moving its source tag.
With hardening enabled, both amd64/arm64 images must pass the native build,
runtime smoke, vulnerability and secret checks before publication with SBOMs,
provenance and signatures. The release remains a draft until publication and
verification succeed, and its notes record whether hardening was verified.
Without hardening, the standard image build runs without those additional gates.
Turning **publish** off validates without creating a release, pushing images or
opening a GitOps PR. Leave **existing_tag** empty to validate the selected branch;
set it to validate or retry an existing tag that includes the hardening setup.

The bump workflow is the sole release entrypoint; the old automatic
`release: created` workflow is removed so it cannot bypass draft-release gating.
Successful publication opens a GitOps PR for
`environments/staging/learn/deployment.yaml`.
That PR does not deploy production. After the release checks pass, merge the
staging update and promote the same versioned image in
`environments/production/learn/deployment.yaml` through a separate GitOps PR.
Argo CD automatically reconciles the merged production manifest. Verify the
public HTTPS site after rollout; publishing a GitHub release alone is not
confirmation of a production deployment.

On staging (`*.uug.lol`) only, `app/assets/js/inspect.js` loads the
[inspect](https://inspect.uug.ai) bug-report tool (launcher button or
Alt+Shift+I). Reports become issues in `uug-ai/learn`, which are public
because the repository is public.

For the first image using this runtime, include the container port change from
80 to 8080 in the same GitOps change as the new image tag, in each environment.
Services keep public port 80 and use the container's named `http` target port.
Do not roll out the port change on its own while an older port-80 image is
still selected.

The site can be deployed to various platforms:

- **GitHub Pages**: Use GitHub Actions workflow
- **Netlify**: Connect your repository and set build command to `cd app && hugo --minify`
- **Vercel**: Similar to Netlify
- **Docker**: Use the included Dockerfile

### Docker Deployment

Build and run with Docker:

```bash
docker build -t docs-site .
docker run --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m,mode=1777 -p 8080:8080 docs-site
```

Hugo and both base images are pinned. The final Chainguard Nginx image contains
only the server and generated site, runs as `65532:65532` on port 8080, and has
no shell, package manager or credential build arguments. Site files are owned
by root and readable, not writable, by the runtime user. Only `/tmp` needs to
be writable; `/healthz` provides readiness without invoking tools in the image.

Security CI runs the same shared hardening pipeline on pull requests, main
pushes and manual **Security scan** runs for both amd64 and arm64 without
publishing. It checks the image identity, entrypoint, working directory, runtime
files and package inventory, emits scan reports/SBOMs, and blocks MEDIUM, HIGH
or CRITICAL vulnerabilities (including unfixed findings) and detected secrets.
Learn uses the shared `standalone` profile with the Nginx entrypoint because
it serves Hugo-generated files, not Hub Frontend's Go configuration launcher
and npm-built application.

Run the native build checks and actual-container smoke locally with Docker:

```bash
docker build --target test .
docker build -t learn:smoke .
bash image/smoke-test.sh learn:smoke
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Adding or refreshing a Hub documentation page

The repeatable recipe for adding a new page under `app/content/docs/hub/`
— or for refreshing an existing one when the Hub frontend changes — is
documented in [`TEMPLATE.md`](TEMPLATE.md). It covers:

- where to look in the monorepo (`hub-frontend`, `hub-api` and the
  `hub-pipeline-*` services) for the source of truth behind each
  feature,
- the canonical page structure used by the existing pages,
- how to write a Playwright spec that regenerates every screenshot
  against a locally-running Hub stack (`hub-api` + `hub-frontend` on
  `http://localhost:4200`), starting from
  [`playwright/tests/TEMPLATE.spec.ts.example`](playwright/tests/TEMPLATE.spec.ts.example).

The **Cases** (`docs/hub/cases`) and **Live view** (`docs/hub/livestream`)
pages are both written against that template and can be used as
copy/paste references.

## Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Hextra Theme Documentation](https://imfing.github.io/hextra/)
- [Markdown Guide](https://www.markdownguide.org/)

## License

[Add your license here]

## Support

For issues and questions, please open an issue on GitHub.
