/**
 * Diagnostics for the livestream page — run when `npm run livestream`
 * captures empty tiles. Does NOT take any screenshots; instead, it
 * collects the signal needed to figure out where in the
 * MQTT / WebRTC / agent pipeline the stream is dying.
 *
 * Run with:
 *   npm --prefix learn/playwright run livestream:diagnose
 *
 * The report is printed to stdout and also attached to the Playwright
 * test report as `livestream-diagnostics.json`.
 */

import { test } from '@playwright/test';
import { login } from './utils/auth';
import { gotoAndWait } from './utils/page';

type StreamSnapshot = {
  index: number;
  cameraName: string | null;
  status: string | null;
  mode: string | null;
  cameraConnected: string | null;
  active: boolean | null;
  isInViewport: boolean | null;
  hasVideo: boolean;
  videoReadyState: number | null;
  videoSize: { w: number; h: number } | null;
  hasImage: boolean;
  imageSrcPrefix: string | null;
  imageSize: { w: number; h: number } | null;
  classes: string;
  visibleText: string;
};

test.describe.configure({ mode: 'serial' });

test('diagnose livestream page', async ({ page }, testInfo) => {
  const consoleEntries: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const failedRequests: Array<{ url: string; failure: string }> = [];
  const websockets: Array<{ url: string; status: string }> = [];

  page.on('console', (msg) => {
    consoleEntries.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    pageErrors.push(`${err.name}: ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('websocket', (ws) => {
    websockets.push({ url: ws.url(), status: 'opened' });
    ws.on('close', () => websockets.push({ url: ws.url(), status: 'closed' }));
    ws.on('socketerror', (err) =>
      websockets.push({ url: ws.url(), status: `error: ${err}` }),
    );
  });

  await login(page);
  await gotoAndWait(page, '/livestream', 'Live view', { settleMs: 1_000 });

  // Give MQTT / WebRTC ~8s to negotiate before we snapshot state.
  await page.waitForTimeout(8_000);

  const streams: StreamSnapshot[] = await page.evaluate(() => {
    function ngComponent(el: Element): any {
      const w = window as any;
      try {
        return w.ng?.getComponent?.(el) ?? null;
      } catch {
        return null;
      }
    }
    const tiles = Array.from(
      document.querySelectorAll('streamcomponent, StreamComponent, stream-component'),
    );
    return tiles.slice(0, 8).map((el, index) => {
      const cmp = ngComponent(el) ?? {};
      const video = el.querySelector('video') as HTMLVideoElement | null;
      const img = el.querySelector('img') as HTMLImageElement | null;
      const visibleText = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
      return {
        index,
        cameraName: cmp.cameraName ?? null,
        status: cmp.status ?? null,
        mode: cmp.mode ?? null,
        cameraConnected: cmp.cameraConnected ?? null,
        active: cmp.active ?? null,
        isInViewport: cmp.isInViewport ?? null,
        hasVideo: !!video,
        videoReadyState: video?.readyState ?? null,
        videoSize: video ? { w: video.videoWidth, h: video.videoHeight } : null,
        hasImage: !!img,
        imageSrcPrefix: img?.src ? img.src.slice(0, 80) : null,
        imageSize: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
        classes: (el.getAttribute('class') ?? '') + ' ' + (el.querySelector('.stream')?.getAttribute('class') ?? ''),
        visibleText,
      };
    });
  });

  const report = {
    url: page.url(),
    tileCount: streams.length,
    streams,
    websockets,
    failedRequests: failedRequests.slice(0, 30),
    pageErrors: pageErrors.slice(0, 30),
    consoleErrors: consoleEntries
      .filter((e) => e.type === 'error' || e.type === 'warning')
      .slice(0, 40),
    consoleAll: consoleEntries.slice(0, 80),
  };

  const serialized = JSON.stringify(report, null, 2);
  console.log('\n===== LIVESTREAM DIAGNOSTICS =====\n' + serialized);
  await testInfo.attach('livestream-diagnostics.json', {
    body: serialized,
    contentType: 'application/json',
  });
});
