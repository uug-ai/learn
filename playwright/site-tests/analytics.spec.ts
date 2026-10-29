import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const local = 'http://127.0.0.1:4177';
const production = 'https://learn.uug.ai';
const consentKey = 'uug-analytics-consent';
const measurementId = 'G-ZW744GSN4M';

async function fixture(context: BrowserContext, host = 'learn.uug.ai') {
  const googleRequests: string[] = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === host) {
      const response = await context.request.get(`${local}${url.pathname}${url.search}`);
      await route.fulfill({ response });
    } else if (url.hostname === 'www.googletagmanager.com') {
      googleRequests.push(url.href);
      await route.fulfill({ contentType: 'application/javascript', body: '/* GA test fixture: no telemetry */' });
    } else if (url.hostname === 'uug.ai' || url.hostname === 'app-demo.kerberos.io') {
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>CTA destination fixture</title>' });
    } else if (url.hostname === '127.0.0.1') {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  return googleRequests;
}

async function events(page: Page) {
  return page.evaluate(() => {
    const dataLayer: ArrayLike<unknown>[] = Reflect.get(window, 'dataLayer') || [];
    return dataLayer.filter(entry => entry[0] === 'event')
      .map(entry => ({ name: entry[1], parameters: entry[2] }));
  });
}

async function analyticsStorage(page: Page) {
  return page.evaluate(() => {
    const dataLayer: ArrayLike<unknown>[] = Reflect.get(window, 'dataLayer') || [];
    return dataLayer.filter(entry => entry[0] === 'consent')
      .map(entry => (entry[2] as { analytics_storage?: string }).analytics_storage)
      .at(-1);
  });
}

test('measures cookielessly before a choice, and rejection keeps cookies off across navigation', async ({ context, page }) => {
  const requests = await fixture(context);
  await page.goto(`${production}/docs/hub/organisations/`);
  await expect(page.getByRole('region', { name: 'We use cookies' })).toBeVisible();
  await expect.poll(() => requests.length).toBe(1);
  expect(await analyticsStorage(page)).toBe('denied');
  expect((await events(page)).map(event => event.name)).toEqual(['page_view']);
  await page.getByRole('button', { name: 'Reject cookies', exact: true }).click();
  await expect(page.locator('#learn-cookie-banner')).toBeHidden();
  expect(await analyticsStorage(page)).toBe('denied');
  await page.goto(`${production}/docs/agent/getting-started/`);
  await expect(page.locator('#learn-cookie-banner')).toBeHidden();
  expect(await analyticsStorage(page)).toBe('denied');
  expect(await page.evaluate(key => localStorage.getItem(key), consentKey)).toBe('denied');
});

test('consent loads one tag and one sanitized contextual page view, with advertising disabled', async ({ context, page }) => {
  const requests = await fixture(context);
  await page.goto(`${production}/docs/hub/organisations/?q=private-search&email=private@example.com#private-fragment`);
  await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toBe(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  const commands = await page.evaluate(() => {
    const dataLayer: ArrayLike<unknown>[] = Reflect.get(window, 'dataLayer') || [];
    return dataLayer.map(command => Array.from(command));
  });
  expect(await page.evaluate(() =>
    Object.prototype.toString.call(Reflect.get(window, 'dataLayer')[0]))).toBe('[object Arguments]');
  expect(commands).toContainEqual(['consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  }]);
  expect(commands).toContainEqual(['config', measurementId, expect.objectContaining({
    send_page_view: false,
    page_location: `${production}/docs/hub/organisations/`,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'learn.uug.ai',
    cookie_prefix: 'learn',
  })]);
  expect(await events(page)).toEqual([{
    name: 'page_view',
    parameters: { send_to: measurementId, site_area: 'learn', content_section: 'docs', product_id: 'hub' },
  }]);
  expect(JSON.stringify(commands)).not.toMatch(/private-search|private@example|private-fragment/);
  expect(await analyticsStorage(page)).toBe('granted');
  await expect(page.locator('#learn-cookie-banner')).toBeHidden();
  expect(requests).toHaveLength(1);
  expect((await events(page)).filter(event => event.name === 'page_view')).toHaveLength(1);
});

test('tracks footer demo and sales intent with bounded CTA context, without submitting anything', async ({ context, page }) => {
  await fixture(context);
  await page.goto(`${production}/docs/vault/first-things-first/`);
  await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'View demo', exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe('https://app-demo.kerberos.io/');
  await popup.close();
  const demo = (await events(page)).filter(event => event.name === 'view_demo');
  expect(demo).toEqual([{
    name: 'view_demo',
    parameters: {
      send_to: measurementId, site_area: 'learn', content_section: 'docs', product_id: 'vault',
      cta_id: 'view_demo', cta_placement: 'footer', destination_host: 'app-demo.kerberos.io',
    },
  }]);
  await page.getByRole('link', { name: 'Talk to our team', exact: true }).evaluate(link => {
    link.addEventListener('click', event => event.preventDefault());
  });
  await page.getByRole('link', { name: 'Talk to our team', exact: true }).click();
  expect((await events(page)).filter(event => event.name === 'contact_sales_click')).toEqual([{
    name: 'contact_sales_click',
    parameters: {
      send_to: measurementId, site_area: 'learn', content_section: 'docs', product_id: 'vault',
      cta_id: 'contact_sales', cta_placement: 'footer', destination_host: 'uug.ai',
    },
  }]);
  expect((await events(page)).some(event => event.name === 'generate_lead')).toBe(false);
});

test('tracks existing navigation and onboarding links without link text or query contents', async ({ context, page }) => {
  await fixture(context);
  await page.goto(`${production}/docs/agent/first-things-first/`);
  await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
  await page.evaluate(() => {
    const urls = [
      '/support/', '/docs/agent/getting-started/',
      'https://github.com/kerberos-io/agent?token=private',
      'mailto:support@uug.ai?body=private',
      'https://uug.ai/products/hub/?email=private@example.com',
    ];
    for (const href of urls) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'Private entered values must not be sent';
      link.addEventListener('click', event => event.preventDefault());
      document.querySelector('.content')!.append(link);
      link.click();
    }
  });
  const resourceEvents = (await events(page)).filter(event => event.name === 'learn_resource_click');
  expect(resourceEvents).toHaveLength(5);
  expect(resourceEvents.map(event => event.parameters)).toEqual(expect.arrayContaining([
    expect.objectContaining({ cta_id: 'support', cta_placement: 'article', product_id: 'agent' }),
    expect.objectContaining({ cta_id: 'getting_started' }),
    expect.objectContaining({ cta_id: 'github', destination_host: 'github.com' }),
    expect.objectContaining({ cta_id: 'support_email', destination_host: 'email' }),
    expect.objectContaining({ cta_id: 'product', product_id: 'hub' }),
  ]));
  expect(JSON.stringify(resourceEvents)).not.toMatch(/private|token|support@/i);
});

test('rejection keeps cookieless measurement and removes only Learn cookies, preserving public website cookies', async ({ context, page }) => {
  await fixture(context);
  await page.goto(`${production}/`);
  await context.addCookies([
    { name: '_ga', value: 'public-website', domain: '.uug.ai', path: '/', secure: true },
    { name: '_ga_PLRKXEQ42W', value: 'public-website', domain: '.uug.ai', path: '/', secure: true },
    { name: 'learn_ga', value: 'test', domain: 'learn.uug.ai', path: '/', secure: true },
    { name: 'learn_ga_ZW744GSN4M', value: 'test', domain: '.learn.uug.ai', path: '/', secure: true },
    { name: 'unrelated', value: 'keep', domain: 'learn.uug.ai', path: '/', secure: true },
  ]);
  await page.getByRole('button', { name: 'Reject cookies', exact: true }).click();
  expect(await analyticsStorage(page)).toBe('denied');
  await page.getByRole('link', { name: 'View demo', exact: true }).evaluate(link => {
    link.addEventListener('click', event => event.preventDefault());
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  expect((await events(page)).filter(event => event.name === 'view_demo')).toHaveLength(1);
  const cookies = await context.cookies(production);
  expect(cookies.some(cookie => cookie.name.startsWith('learn_ga'))).toBe(false);
  expect(cookies.filter(cookie => cookie.name.startsWith('_ga'))).toHaveLength(2);
  expect(cookies.some(cookie => cookie.name === 'unrelated')).toBe(true);
});

test('cross-tab withdrawal is respected and granting again does not duplicate page views', async ({ context, page }) => {
  await fixture(context);
  await page.goto(`${production}/`);
  await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
  const second = await context.newPage();
  await second.goto(`${production}/docs/`);
  await expect(second.locator('#learn-cookie-banner')).toBeHidden();
  await second.evaluate(key => localStorage.setItem(key, 'denied'), consentKey);
  await expect.poll(() => analyticsStorage(page)).toBe('denied');
  await second.evaluate(key => localStorage.setItem(key, 'granted'), consentKey);
  await expect.poll(() => analyticsStorage(page)).toBe('granted');
  expect((await events(page)).filter(event => event.name === 'page_view')).toHaveLength(1);
});

test('blocked storage is reported and does not prevent an explicit in-page choice', async ({ context, page }) => {
  await fixture(context);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage disabled for test'); };
    Storage.prototype.setItem = () => { throw new Error('Storage disabled for test'); };
  });
  await page.goto(`${production}/`);
  await expect(page.locator('[data-analytics-status]')).toContainText('could not be read');
  expect(await analyticsStorage(page)).toBe('denied');
  await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
  await expect(page.locator('[data-analytics-status]')).toContainText('could not be saved');
  expect(await analyticsStorage(page)).toBe('granted');
  expect((await events(page)).filter(event => event.name === 'page_view')).toHaveLength(1);
});

test('podcast starts are counted once per audio element after consent, not on opening the player', async ({ context, page }) => {
  await fixture(context);
  await page.goto(`${production}/docs/hub/organisations/`);
  await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
  await page.getByRole('button', { name: 'Listen to the overview', exact: true }).click();
  expect((await events(page)).filter(event => event.name === 'learn_podcast_start')).toEqual([]);
  await page.locator('#article-podcast audio').evaluate(audio => {
    audio.dispatchEvent(new Event('play'));
    audio.dispatchEvent(new Event('play'));
  });
  expect((await events(page)).filter(event => event.name === 'learn_podcast_start')).toHaveLength(1);
});

test('production output on localhost or an unapproved host never initializes analytics', async ({ context, page }) => {
  const requests = await fixture(context);
  await page.goto(local);
  await expect(page.locator('#learn-cookie-banner')).toBeHidden();
  expect(requests).toEqual([]);
  expect(await events(page)).toEqual([]);
});

for (const origin of ['https://preview.learn.example', 'https://learn.uug.ai.example', 'http://learn.uug.ai']) {
  test(`never initializes production analytics on ${origin}`, async ({ context, page }) => {
    const requests = await fixture(context, new URL(origin).hostname);
    await page.goto(`${origin}/`);
    await expect(page.locator('#learn-cookie-banner')).toBeHidden();
    expect(requests).toEqual([]);
    expect(await events(page)).toEqual([]);
  });
}

test('CTA navigation still works without analytics consent', async ({ context, page }) => {
  await fixture(context);
  await page.goto(`${production}/`);
  await page.getByRole('button', { name: 'Reject cookies', exact: true }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'View demo', exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe('https://app-demo.kerberos.io/');
  await popup.close();
  expect(await analyticsStorage(page)).toBe('denied');
});

test('tag load failures are reported without blocking the documentation', async ({ context, page }) => {
  await fixture(context);
  await context.route('https://www.googletagmanager.com/gtag/js?*', route => route.abort());
  await page.goto(`${production}/`);
  await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
  await expect(page.locator('[data-analytics-status]')).toContainText('could not be loaded');
  await expect(page.getByRole('heading', { name: 'Learning hub', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View demo', exact: true })).toHaveAttribute('href', 'https://app-demo.kerberos.io/');
});

test('mobile consent controls and CTA buttons fit the viewport in dark mode', async ({ context, page }) => {
  await fixture(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('color-theme', 'dark'));
  await page.goto(`${production}/`);
  await expect(page.locator('html')).toHaveClass(/dark/);
  const banner = page.getByRole('region', { name: 'We use cookies' });
  await expect(banner).toBeVisible();
  for (const control of [
    page.getByRole('button', { name: 'Accept cookies', exact: true }),
    page.getByRole('button', { name: 'Reject cookies', exact: true }),
  ]) {
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Reject cookies', exact: true }).click();
  await page.getByRole('link', { name: 'View demo', exact: true }).scrollIntoViewIfNeeded();
  for (const label of ['View demo', 'Talk to our team']) {
    const bounds = await page.getByRole('link', { name: label, exact: true }).boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
});
