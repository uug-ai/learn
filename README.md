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
background as the website and design toolkit: ICO, 16/32px browser PNGs, a
180px Apple touch icon, and 192/512px app icons. The custom
`app/layouts/_partials/favicons.html` partial and `app/static/site.webmanifest`
use `?v=uug-midnight` URLs to refresh older cached artwork. The manifest names
the app **UUG.AI Learn**.

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
the UUG palette. Cross-product links within an article use the current article's
color; sidebar branches always retain their own product colors.

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

Indented and fenced code use a single padded surface with a darkened product
accent background. Pages outside product documentation use the UUG blue accent.
Code inside a block has no inline-code chip, border, or extra padding; inline
code in prose keeps its existing treatment. Long lines scroll horizontally and
retain whitespace.

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

Production Learn uses its own **UUG.AI Learn** web stream
(`G-ZW744GSN4M`, stream ID `16226732617`) in the existing UUG.AI GA4 property
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
It publishes amd64/arm64 images, scans the published release, and opens a
GitOps PR for `environments/staging/learn/deployment.yaml`.
That PR does not deploy production. After the release checks pass, merge the
staging update and promote the same versioned image in
`environments/production/learn/deployment.yaml` through a separate GitOps PR.
Argo CD automatically reconciles the merged production manifest. Verify the
public HTTPS site after rollout; publishing a GitHub release alone is not
confirmation of a production deployment.

The site can be deployed to various platforms:

- **GitHub Pages**: Use GitHub Actions workflow
- **Netlify**: Connect your repository and set build command to `cd app && hugo --minify`
- **Vercel**: Similar to Netlify
- **Docker**: Use the included Dockerfile

### Docker Deployment

Build and run with Docker:

```bash
docker build -t docs-site .
docker run -p 8080:80 docs-site
```

The Nginx runtime requires `brotli-libs>=1.2.1-r0`, which fixes
CVE-2026-111497. The image build installs that minimum even when the upstream
Nginx image still contains an older Brotli package.

Security CI builds and smoke-tests both amd64 and arm64 runtimes, reports all
Trivy vulnerability severities, and fails on HIGH or CRITICAL findings without
excluding unfixed vulnerabilities. Release workflows also scan both platforms
of the actual published image. To rescan an existing image, run the **Security
scan** workflow with its `image_ref` input set to the image tag or immutable
digest.

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
