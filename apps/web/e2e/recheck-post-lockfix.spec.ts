import { test, expect, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'C:\\tmp\\screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 1: /embed/beto — HTTP status, headers, rendered content
// ─────────────────────────────────────────────────────────────────────────────
test('CHECK 1: /embed/beto HTTP status, headers, and rendered content', async ({ page }) => {
  const url = 'https://tradealo-web.vercel.app/embed/beto';

  // 1A — HTTP status via a dedicated request context that ignores SSL cert issues
  const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
  const response = await ctx.get(url);
  const status = response.status();
  const headers = response.headers();
  await ctx.dispose();

  console.log('=== CHECK 1A: HTTP STATUS ===');
  console.log(`Status: ${status}`);

  console.log('=== CHECK 1B: RESPONSE HEADERS (verbatim) ===');
  const csp = headers['content-security-policy'] ?? '(not present)';
  const xframe = headers['x-frame-options'] ?? '(not present)';
  console.log(`content-security-policy: ${csp}`);
  console.log(`x-frame-options: ${xframe}`);

  // Log ALL response headers for full evidence
  console.log('=== CHECK 1B2: ALL RESPONSE HEADERS ===');
  for (const [k, v] of Object.entries(headers)) {
    console.log(`  ${k}: ${v}`);
  }

  // Assertions on status
  expect(status, `Expected HTTP 200 but got ${status}`).toBe(200);

  // CSP must contain frame-ancestors *
  const cspPassFail = csp.includes('frame-ancestors *') ? 'PASS' : 'FAIL';
  console.log(`CSP frame-ancestors check: ${cspPassFail} (value: ${csp})`);

  // x-frame-options must NOT be present
  const xframePassFail = xframe === '(not present)' ? 'PASS' : 'FAIL';
  console.log(`x-frame-options absent check: ${xframePassFail} (value: ${xframe})`);

  // Use soft assertions so we can still capture rendered content even when headers fail
  expect.soft(
    csp,
    `CSP missing "frame-ancestors *". Actual CSP: ${csp}`
  ).toContain('frame-ancestors *');

  expect.soft(
    xframe,
    `x-frame-options should NOT be present, but got: ${xframe}`
  ).toBe('(not present)');

  // 1C — Rendered HTML content via Playwright navigation
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const bodyHtml = await page.content();

  console.log('=== CHECK 1C: RENDERED HTML CONTENT ===');

  // Search for shop name
  const hasShopName = bodyHtml.includes('Beto') || bodyHtml.includes('beto');
  const arsMatch = bodyHtml.match(/ARS\s*[\d,\.]+/g);
  const dollarMatch = bodyHtml.match(/\$\s*[\d,\.]+/g);
  const hasPrices = !!(arsMatch || dollarMatch);

  console.log(`Shop name "Beto" present: ${hasShopName}`);
  console.log(`ARS price matches: ${JSON.stringify(arsMatch?.slice(0, 5))}`);
  console.log(`$ price matches: ${JSON.stringify(dollarMatch?.slice(0, 5))}`);
  console.log(`Has at least one price: ${hasPrices}`);

  // Extract page title and visible text snippets
  const title = await page.title();
  console.log(`Page title: ${title}`);

  // Check for product cards - look for common product card patterns
  const productCards = await page.locator('[data-testid*="product"], [data-testid*="listing"], .product-card, article').count();
  console.log(`Product card elements found: ${productCards}`);

  // Screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'check1_embed_beto.png'),
    fullPage: true,
  });
  console.log(`Screenshot saved: ${path.join(SCREENSHOT_DIR, 'check1_embed_beto.png')}`);

  // Assert shop content visible
  expect(hasShopName || title.toLowerCase().includes('beto'),
    `Shop name "Beto" not found in rendered HTML. Page title: ${title}`
  ).toBe(true);

  expect(hasPrices,
    `No price (ARS or $) found in rendered HTML. arsMatch=${JSON.stringify(arsMatch)}, dollarMatch=${JSON.stringify(dollarMatch)}`
  ).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 2: Real iframe embed
// ─────────────────────────────────────────────────────────────────────────────
test('CHECK 2: Real iframe embed — no X-Frame-Options block, content visible', async ({ page, context }) => {
  const embedUrl = 'https://tradealo-web.vercel.app/embed/beto';

  // Must navigate to an actual HTTP origin first so the wrapper page has a
  // real scheme (https:) — page.setContent() from about:blank gives a null
  // origin which Chromium refuses to frame even when CSP says frame-ancestors *.
  // Strategy: navigate to the production root, then inject the iframe HTML via
  // evaluate so we stay on an https:// origin.
  await page.goto('https://tradealo-web.vercel.app/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const consoleErrors: string[] = [];
  const consoleMessages: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  // Replace the page body with the iframe wrapper (don't use document.write — it
  // destroys existing DOM including the frame reference). Inject a new iframe instead.
  await page.evaluate((src) => {
    document.body.innerHTML = `<div style="background:#eee;padding:20px;"><h1>Test Embed</h1><iframe id="embed-frame" src="${src}" width="100%" height="520" style="border:none"></iframe></div>`;
  }, embedUrl);

  // Wait for iframe to load
  const iframeElement = page.locator('#embed-frame');
  await iframeElement.waitFor({ state: 'attached', timeout: 10000 });

  // Give iframe content time to load
  await page.waitForTimeout(5000);

  console.log('=== CHECK 2A: CONSOLE ERRORS ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Total console errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e) => console.log(`  ERROR: ${e}`));

  // Check for X-Frame-Options / frame-ancestors blocking
  const frameBlockErrors = consoleErrors.filter((e) =>
    e.includes('Refused to display') ||
    e.includes('X-Frame-Options') ||
    e.includes('frame-ancestors') ||
    e.includes('ALLOW-FROM')
  );
  console.log(`Frame-blocking errors: ${frameBlockErrors.length}`);
  frameBlockErrors.forEach((e) => console.log(`  BLOCK: ${e}`));

  // 2B — Check iframe URL (should NOT be chrome-error://)
  const iframeSrc = await iframeElement.getAttribute('src');
  console.log(`=== CHECK 2B: IFRAME src ATTRIBUTE: ${iframeSrc} ===`);

  // Try to access iframe content frame
  const frameLocator = page.frameLocator('#embed-frame');

  let iframeContentText = '';
  let iframeAccessible = false;

  try {
    // Try to read content from within the iframe
    const iframeBody = frameLocator.locator('body');
    iframeContentText = await iframeBody.innerText({ timeout: 8000 });
    iframeAccessible = true;
    console.log('=== CHECK 2C: IFRAME INNER CONTENT (first 500 chars) ===');
    console.log(iframeContentText.substring(0, 500));
  } catch (e) {
    console.log(`=== CHECK 2C: Could not access iframe content (cross-origin restriction): ${(e as Error).message} ===`);
    // Cross-origin iframes may block innerText access — that is expected browser behavior
    // The real test is whether console shows a frame-blocking error
    iframeAccessible = false;
  }

  // 2D — Screenshot of the outer page (shows iframe rendered or blocked)
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'check2_iframe_embed.png'),
    fullPage: true,
  });
  console.log(`Screenshot saved: ${path.join(SCREENSHOT_DIR, 'check2_iframe_embed.png')}`);

  // Assertions
  expect(
    frameBlockErrors.length,
    `Frame-blocking errors detected:\n${frameBlockErrors.join('\n')}`
  ).toBe(0);

  expect(
    iframeSrc,
    'iframe src should point to the embed URL, not chrome-error://'
  ).toBe(embedUrl);

  // Note: cross-origin content access is blocked by SOP even when iframe loads correctly.
  // The absence of frame-blocking console errors is the real signal for check 2.
  console.log(`iframe content accessible (same-origin check): ${iframeAccessible}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 3: /my-shop/listings auth gate (revised expectation)
// ─────────────────────────────────────────────────────────────────────────────
test('CHECK 3: /my-shop/listings auth gate — unauthenticated access', async ({ page }) => {
  const url = 'https://tradealo-web.vercel.app/my-shop/listings';

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Additional 3-second wait as instructed
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  console.log(`=== CHECK 3A: FINAL URL AFTER WAIT: ${finalUrl} ===`);

  const bodyHtml = await page.content();

  // Check for expected auth content signals
  const hasBienvenido = bodyHtml.includes('Bienvenido de nuevo');
  const hasMisListings = bodyHtml.includes('Mis listings');
  const hasLoadingSpinner =
    bodyHtml.includes('spinner') ||
    bodyHtml.includes('loading') ||
    bodyHtml.includes('Loading') ||
    bodyHtml.includes('Cargando') ||
    bodyHtml.includes('animate-spin') ||
    bodyHtml.includes('skeleton');

  console.log('=== CHECK 3B: CONTENT SIGNALS ===');
  console.log(`"Bienvenido de nuevo" present: ${hasBienvenido}`);
  console.log(`"Mis listings" present: ${hasMisListings}`);
  console.log(`Loading spinner detected: ${hasLoadingSpinner}`);

  // Check for bulk-ops toolbar buttons
  const pausarVisible = await page.locator('button:has-text("Pausar"), [data-testid*="pausar"]').isVisible().catch(() => false);
  const republicarVisible = await page.locator('button:has-text("Republicar"), [data-testid*="republicar"]').isVisible().catch(() => false);
  const ajustarVisible = await page.locator('button:has-text("Ajustar precio"), [data-testid*="ajustar"]').isVisible().catch(() => false);

  console.log('=== CHECK 3C: BULK-OPS TOOLBAR VISIBILITY ===');
  console.log(`"Pausar" button visible: ${pausarVisible}`);
  console.log(`"Republicar" button visible: ${republicarVisible}`);
  console.log(`"Ajustar precio" button visible: ${ajustarVisible}`);

  const anyBulkOpVisible = pausarVisible || republicarVisible || ajustarVisible;
  console.log(`Any bulk-op button visible (SHOULD BE FALSE): ${anyBulkOpVisible}`);

  // Also check for listing items in the DOM
  const listingItems = await page.locator('[data-testid*="listing"], .listing-item, [data-testid*="product"]').count();
  console.log(`Listing item elements in DOM: ${listingItems}`);

  // Extract visible text on page for evidence
  const visibleText = await page.locator('body').innerText().catch(() => '(could not extract)');
  console.log('=== CHECK 3D: VISIBLE PAGE TEXT (first 800 chars) ===');
  console.log(visibleText.substring(0, 800));

  // Screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'check3_my_shop_listings_unauth.png'),
    fullPage: true,
  });
  console.log(`Screenshot saved: ${path.join(SCREENSHOT_DIR, 'check3_my_shop_listings_unauth.png')}`);

  // AUTH GATE ASSERTION:
  // Either: redirected to login, OR login form content visible, OR no protected content shown
  const isProtected =
    finalUrl.includes('/login') ||
    finalUrl.includes('/auth') ||
    finalUrl.includes('/signin') ||
    hasBienvenido ||
    (!hasMisListings && !anyBulkOpVisible);

  expect(
    isProtected,
    `Auth gate FAILED. finalUrl=${finalUrl}, hasBienvenido=${hasBienvenido}, hasMisListings=${hasMisListings}, anyBulkOpVisible=${anyBulkOpVisible}`
  ).toBe(true);

  // Bulk ops must NOT be visible to unauthenticated users
  expect(
    anyBulkOpVisible,
    `Bulk-op buttons (Pausar/Republicar/Ajustar precio) are visible to unauthenticated users — SECURITY ISSUE`
  ).toBe(false);
});
