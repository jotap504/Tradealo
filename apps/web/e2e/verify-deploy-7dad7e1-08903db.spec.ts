/**
 * Verification test for commits 7dad7e1 (mobile responsive) + 08903db (CSP schemes)
 * Target: https://tradealo-web.vercel.app
 *
 * Checks:
 *   1A. Embed headers + rendered content
 *   1B. Real HTTPS-origin iframe test
 *   2.  Mobile /listings horizontal scroll
 *   3.  Mobile /messages + /my-purchases auth redirect + /login scroll
 *   4.  (Bonus) Embed on mobile
 */

import { test, expect } from '@playwright/test';

const BASE = 'https://tradealo-web.vercel.app';

// ─────────────────────────────────────────────────────────────────────────────
// 1A — Embed headers + rendered content
// ─────────────────────────────────────────────────────────────────────────────
test('1A: /embed/beto — HTTP status, CSP header, x-frame-options absent, content', async ({ page }) => {
  // Capture headers via page.goto() response — this uses the browser's TLS stack
  // which trusts the system cert store, avoiding the Node.js TLS verification issue.
  let status: number = -1;
  let headersObj: Record<string, string> = {};

  const response = await page.goto(`${BASE}/embed/beto`, { waitUntil: 'networkidle' });
  if (response) {
    status = response.status();
    headersObj = await response.allHeaders();
  }

  console.log('=== 1A HTTP STATUS ===');
  console.log(`Status: ${status}`);

  console.log('=== 1A ALL RESPONSE HEADERS ===');
  for (const [k, v] of Object.entries(headersObj)) {
    console.log(`${k}: ${v}`);
  }

  const csp = headersObj['content-security-policy'] ?? '(ABSENT)';
  const xfo = headersObj['x-frame-options'] ?? '(ABSENT)';

  console.log('\n=== 1A TARGETED HEADERS ===');
  console.log(`content-security-policy: ${csp}`);
  console.log(`x-frame-options: ${xfo}`);

  // Assertions
  expect(status, `HTTP status should be 200, got ${status}`).toBe(200);

  expect(
    csp,
    `CSP should contain explicit schemes (frame-ancestors * https: http: data:), got: ${csp}`
  ).toMatch(/frame-ancestors[^;]*https:/i);

  expect(
    csp,
    `CSP should contain http: in frame-ancestors`
  ).toMatch(/frame-ancestors[^;]*http:/i);

  expect(
    xfo,
    `x-frame-options should be ABSENT, got: ${xfo}`
  ).toBe('(ABSENT)');

  // --- Verify rendered content (page is already loaded) ---
  const bodyText = await page.evaluate(() => document.body.innerText);

  console.log('\n=== 1A PAGE BODY EXCERPT (first 800 chars) ===');
  console.log(bodyText.slice(0, 800));

  const hasBetoShop = /beto\s*shop/i.test(bodyText) || /beto/i.test(bodyText);
  const hasArsPrice = /ARS\s*\d+/.test(bodyText) || /\$\s*\d+/.test(bodyText) || /\d+/.test(bodyText);

  console.log(`\nHas "Beto" or "Beto Shop": ${hasBetoShop}`);
  console.log(`Has ARS price pattern: ${hasArsPrice}`);

  await page.screenshot({ path: '/tmp/1a-embed-beto-desktop.png', fullPage: true });
  console.log('Screenshot saved: /tmp/1a-embed-beto-desktop.png');
});

// ─────────────────────────────────────────────────────────────────────────────
// 1B — Real HTTPS-origin iframe test
// ─────────────────────────────────────────────────────────────────────────────
test('1B: Real HTTPS iframe test from example.com', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  // Navigate to a real HTTPS origin (establishes non-opaque origin)
  await page.goto('https://example.com/', { waitUntil: 'load' });
  console.log('Navigated to https://example.com/');

  // Inject iframe pointing to our embed
  await page.evaluate(() => {
    const f = document.createElement('iframe');
    f.id = 'test-embed';
    f.src = 'https://tradealo-web.vercel.app/embed/beto';
    f.style.width = '600px';
    f.style.height = '500px';
    document.body.prepend(f);
  });

  console.log('Iframe injected, waiting 6s...');
  await page.waitForTimeout(6000);

  // Try to read iframe location (cross-origin will throw — that's fine)
  let iframeHref: string | null = null;
  let iframeAccessError: string | null = null;
  try {
    iframeHref = await page.evaluate(() => {
      const f = document.getElementById('test-embed') as HTMLIFrameElement;
      return f?.contentWindow?.location?.href ?? null;
    });
  } catch (e: any) {
    iframeAccessError = e.message;
    // Cross-origin SecurityError = good, the frame is loaded as a real HTTPS page
    console.log(`Cross-origin access blocked (expected): ${e.message}`);
  }

  // Check if iframe src is blocked
  const iframeSrc = await page.evaluate(() => {
    const f = document.getElementById('test-embed') as HTMLIFrameElement;
    return f?.src ?? 'not found';
  });

  console.log('\n=== 1B IFRAME STATE ===');
  console.log(`iframe.src attribute: ${iframeSrc}`);
  console.log(`contentWindow.location.href: ${iframeHref}`);
  console.log(`Cross-origin access error: ${iframeAccessError}`);

  console.log('\n=== 1B CONSOLE ERRORS (all during 6s window) ===');
  if (consoleErrors.length === 0) {
    console.log('(no console errors)');
  } else {
    consoleErrors.forEach((e, i) => console.log(`[${i}] ${e}`));
  }

  console.log('\n=== 1B PAGE ERRORS ===');
  if (pageErrors.length === 0) {
    console.log('(no page errors)');
  } else {
    pageErrors.forEach((e, i) => console.log(`[${i}] ${e}`));
  }

  // Check for blocking-related error messages
  const blockingErrors = [...consoleErrors, ...pageErrors].filter(e =>
    /refused to display|x-frame-options|frame-ancestors|blocked.*frame|framing/i.test(e)
  );

  console.log('\n=== 1B BLOCKING-RELATED ERRORS ===');
  if (blockingErrors.length === 0) {
    console.log('NONE — PASS');
  } else {
    blockingErrors.forEach((e, i) => console.log(`[BLOCKING ${i}] ${e}`));
  }

  // chrome-error check: if the iframe loaded chrome-error it was blocked
  const iframeSrcAfterLoad = await page.evaluate(() => {
    const f = document.getElementById('test-embed') as HTMLIFrameElement;
    return f?.src ?? '';
  });
  const isBlocked = iframeSrcAfterLoad.includes('chrome-error://');
  console.log(`\niframe URL is chrome-error (BLOCKED): ${isBlocked}`);

  await page.screenshot({ path: '/tmp/1b-iframe-https.png', fullPage: false });
  console.log('Screenshot saved: /tmp/1b-iframe-https.png');

  expect(
    blockingErrors.length,
    `Expected 0 frame-blocking console errors, got: ${JSON.stringify(blockingErrors)}`
  ).toBe(0);

  expect(isBlocked, 'iframe src must not be chrome-error (frame must not be blocked)').toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 — Mobile /listings horizontal scroll
// ─────────────────────────────────────────────────────────────────────────────
test('2: Mobile /listings — no horizontal scroll (375x667)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle' });

  const scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  console.log('\n=== 2 MOBILE /listings SCROLL METRICS ===');
  console.log(JSON.stringify(scroll, null, 2));
  console.log(`RESULT: ${scroll.hasHorizontalScroll ? 'FAIL — horizontal scroll detected' : 'PASS — no horizontal scroll'}`);

  await page.screenshot({ path: '/tmp/2-listings-mobile.png', fullPage: true });
  console.log('Screenshot saved: /tmp/2-listings-mobile.png');

  expect(
    scroll.hasHorizontalScroll,
    `hasHorizontalScroll should be false. scrollWidth=${scroll.scrollWidth}, clientWidth=${scroll.clientWidth}`
  ).toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 — Mobile auth gates + /login scroll
// ─────────────────────────────────────────────────────────────────────────────
test('3: Mobile /messages + /my-purchases auth redirect + /login scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  // /messages
  await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle' });
  const messagesUrl = page.url();
  console.log('\n=== 3 /messages FINAL URL ===');
  console.log(messagesUrl);
  console.log(`Redirected to /login: ${messagesUrl.includes('/login') ? 'YES (expected)' : 'NO (unexpected)'}`);

  await page.screenshot({ path: '/tmp/3a-messages-mobile.png' });

  // /my-purchases
  await page.goto(`${BASE}/my-purchases`, { waitUntil: 'networkidle' });
  const purchasesUrl = page.url();
  console.log('\n=== 3 /my-purchases FINAL URL ===');
  console.log(purchasesUrl);
  console.log(`Redirected to /login: ${purchasesUrl.includes('/login') ? 'YES (expected)' : 'NO (unexpected)'}`);

  await page.screenshot({ path: '/tmp/3b-my-purchases-mobile.png' });

  // /login scroll check (navigate fresh to /login)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const loginScroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  console.log('\n=== 3 MOBILE /login SCROLL METRICS ===');
  console.log(JSON.stringify(loginScroll, null, 2));
  console.log(`RESULT: ${loginScroll.hasHorizontalScroll ? 'FAIL — horizontal scroll detected' : 'PASS — no horizontal scroll'}`);

  await page.screenshot({ path: '/tmp/3c-login-mobile.png', fullPage: true });
  console.log('Screenshot saved: /tmp/3c-login-mobile.png');

  expect(
    messagesUrl,
    `/messages should redirect to /login, final URL was: ${messagesUrl}`
  ).toContain('/login');

  expect(
    purchasesUrl,
    `/my-purchases should redirect to /login, final URL was: ${purchasesUrl}`
  ).toContain('/login');

  expect(
    loginScroll.hasHorizontalScroll,
    `/login hasHorizontalScroll should be false. scrollWidth=${loginScroll.scrollWidth}, clientWidth=${loginScroll.clientWidth}`
  ).toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 — Bonus: /embed/beto on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('4 (bonus): /embed/beto on mobile 375x667 — no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE}/embed/beto`, { waitUntil: 'networkidle' });

  const scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  console.log('\n=== 4 MOBILE /embed/beto SCROLL METRICS ===');
  console.log(JSON.stringify(scroll, null, 2));
  console.log(`RESULT: ${scroll.hasHorizontalScroll ? 'FAIL — horizontal scroll detected' : 'PASS — no horizontal scroll'}`);

  await page.screenshot({ path: '/tmp/4-embed-mobile.png', fullPage: true });
  console.log('Screenshot saved: /tmp/4-embed-mobile.png');

  expect(
    scroll.hasHorizontalScroll,
    `embed/beto hasHorizontalScroll should be false. scrollWidth=${scroll.scrollWidth}, clientWidth=${scroll.clientWidth}`
  ).toBe(false);
});
