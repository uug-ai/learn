# Learn — Playwright screenshot scripts

This folder contains [Playwright](https://playwright.dev) scripts that drive
the Hub frontend and capture screenshots used by the documentation pages
under `learn/app/content/docs/hub`.

The goal is to make documentation screenshots **reproducible**: instead of
manually re-cropping PNGs every time the UI changes, you re-run the relevant
spec and the images on disk are overwritten in place.

## Setup

```bash
cd learn/playwright
npm ci
npx playwright install-deps         
npx playwright install chromium
cp .env.example .env
```

Use the committed lockfile to install the matching Sharp native image-processing
libraries, including their security fixes. Run `npm audit` after dependency updates.

Edit `.env` and provide:

| Variable        | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `HUB_BASE_URL`  | Base URL of the running Hub frontend, e.g. `http://localhost:4200`.  |
| `HUB_USERNAME`  | Login username or email for the `uugai` account.                      |
| `HUB_PASSWORD`  | Password for the `uugai` account.                                     |
| `SCREENSHOT_DIR`| _(optional)_ Override the output folder for screenshots.             |
| `HUB_RECORDINGS_PATH` | _(optional)_ Recordings route with filters, e.g. `/media?date=2026-10-16&devices=front-door`. Used by the recordings spec; defaults to `/media`. |

By default screenshots are written to
`learn/app/content/docs/hub/<topic>/`, next to the Markdown page that
references them.

Documentation screenshots must only use the **uugai** account and its approved
demo footage. Login and the shared capture helper check that the signed-in
username is exactly `uugai`; captures fail before writing an image if another
account is active or the account cannot be verified. Do not hide or relabel a
different account's identity to bypass this check. The same rule applies to
manual browser captures.

## Available scripts

| Command                     | What it does                                                                  |
| --------------------------- | ----------------------------------------------------------------------------- |
| `npm run cases`             | Captures the cases overview and the create-case flow (`docs/hub/cases`).      |
| `npm run cases:headed`      | Same, but with a visible browser window — useful for debugging.               |
| `npm run media`             | Captures the recording side-panel / context flows (`docs/hub/cases`).         |
| `npm run recordings`        | Captures the overview, grid, side panel, context player, and detail page (`docs/hub/recordings`). |
| `npm run recordings:headed` | Same, but with a visible browser window. |
| `npm run livestream`        | Captures the `/livestream` page (`docs/hub/livestream`).                      |
| `npm run livestream:headed` | Same, but with a visible browser window.                                      |
| `npm test`                  | Runs every spec in `tests/`.                                                  |

The recordings spec only opens existing footage and UI panels: it does not
create cases, send shares, request forwarding, or edit recordings. Use an
account and `HUB_RECORDINGS_PATH` with at least one playable recording. Missing
footage fails the capture rather than silently keeping stale screenshots.

## Adding a new topic

Every documentation page that needs screenshots follows the same recipe
— see the full guide in [`../TEMPLATE.md`](../TEMPLATE.md) for the
end-to-end workflow (where to find the source of truth in the monorepo,
how to start the Hub stack, how to wire the spec into the docs).

The fastest path is the scaffolder, which generates the doc page, the
Playwright spec and the npm scripts in one shot:

```bash
cd learn/playwright
npm run new -- <topic> --title="<Title>" --route="/<route>"
```

See `scripts/new-hub-page.mjs --help` for the full option list.

If you'd rather write the files by hand:

1. Make sure `learn/app/content/docs/hub/<topic>/index.md` exists.
2. Copy `tests/TEMPLATE.spec.ts.example` to `tests/<topic>.spec.ts` and
   replace every `<TOPIC>` placeholder with the docs slug (the folder name
   under `docs/hub/`).
3. In the new spec:
   - call `login(page)` from `tests/utils/auth.ts`,
   - navigate to the page you want to document (using the helpers in
     `tests/utils/page.ts` — `gotoAndWait`, `revealHoverControls`,
     `isPresent`, `skipBecause`),
   - call the topic-bound `shoot` helper returned by
     `captureFor('<topic>')` from `tests/utils/screenshots.ts`.
4. Name every screenshot `hub-<topic>-<thing>.png` so files from different
   topics never collide on disk.
5. Reference the captured PNGs from the Markdown page using Hugo's
   `figure` shortcode:

   ```text
   {{< figure src="hub-<topic>-overview.png" alt="..." caption="..." class="stretch">}}
   ```

6. Add convenience scripts to `package.json`:

   ```json
   "<topic>":        "playwright test tests/<topic>.spec.ts",
   "<topic>:headed": "playwright test tests/<topic>.spec.ts --headed"
   ```

### Selector conventions

- Angular components such as `<Breadcrumb>` and `<ButtonField>` are emitted
  as the lower-case tags `breadcrumb` / `buttonfield` in the DOM, so most
  selectors use the pattern `page.locator('buttonfield, ButtonField, button')`.
- `<Modal>` keeps its host element hidden — target the visible `.bg.open`
  child to know the modal is on screen.
- Hover-revealed controls (stream controls, action menus, …) require an
  explicit `hover()` plus a short `waitForTimeout()` before capturing.
- When the underlying data can legitimately be empty (no cases, no
  recordings, no devices, …) annotate and `return` instead of asserting, so
  the spec still passes on environments without seeded data:

  ```ts
  test.info().annotations.push({
    type: 'skip-no-data',
    description: 'No <thing> available — skipping <screenshot>.',
  });
  return;
  ```

## How it works

- `playwright.config.ts` loads `.env.local` first (gitignored, developer
  overrides) then `.env`, sets `baseURL` to `HUB_BASE_URL`, and uses a
  single Chromium project at 1450×750 with a 2× device scale factor for
  crisp screenshots.
- `tests/utils/auth.ts` submits the login form using the selectors defined
  in `hub-frontend/kerberos.ng/src/app/login/login.component.html`.
- `tests/utils/screenshots.ts` exposes `capture(page, file, { topic })`
  and the topic-bound `captureFor(topic)` factory. Screenshots default to
  `learn/app/content/docs/hub/<topic>/` and can be redirected with the
  `SCREENSHOT_DIR` env var.
- `tests/utils/chrome.ts` hides UI chrome (e.g. the non-production
  environment banner) so it never leaks into documentation screenshots.
