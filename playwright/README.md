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
npm install
npx playwright install-deps         
npx playwright install chromium
cp .env.example .env
```

Edit `.env` and provide:

| Variable        | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `HUB_BASE_URL`  | Base URL of the running Hub frontend, e.g. `http://localhost:4200`.  |
| `HUB_USERNAME`  | Email of a Hub user that can read media and create cases.            |
| `HUB_PASSWORD`  | Password for that user.                                              |
| `SCREENSHOT_DIR`| _(optional)_ Override the output folder for screenshots.             |

By default screenshots are written to
`learn/app/content/docs/hub/<topic>/`, next to the Markdown page that
references them.

## Available scripts

| Command                | What it does                                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| `npm run cases`        | Captures the cases overview and the create-case flow (`docs/hub/cases`).  |
| `npm run cases:headed` | Same, but with a visible browser window — useful for debugging.           |
| `npm test`             | Runs every spec in `tests/`.                                              |

## Adding a new topic

1. Make sure `learn/app/content/docs/hub/<topic>/index.md` exists.
2. Create `tests/<topic>.spec.ts` following the pattern in `tests/cases.spec.ts`:
   - call `login(page)` from `tests/utils/auth.ts`,
   - navigate to the relevant page,
   - call `capture(page, '<topic>-<thing>.png')` from `tests/utils/screenshots.ts`.
3. Reference the captured PNGs from the Markdown page using Hugo's
   `figure` shortcode.
4. Add an `npm run <topic>` script to `package.json` for convenience.

## How it works

- `playwright.config.ts` loads `.env`, sets `baseURL` to `HUB_BASE_URL`,
  and uses a single Chromium project at 1440×900 with a 2× device scale
  factor for crisp screenshots.
- `tests/utils/auth.ts` submits the login form using the selectors defined
  in `hub-frontend/kerberos.ng/src/app/login/login.component.html`.
- `tests/utils/screenshots.ts` writes `fullPage` PNGs to the documentation
  folder, creating it on demand.
