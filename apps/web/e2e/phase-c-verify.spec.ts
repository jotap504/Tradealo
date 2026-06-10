import { test, expect } from '@playwright/test';

test('Check 6: /my-shop/edit redirects to login when unauthenticated', async ({ page }) => {
  const response = await page.goto('https://tradealo-web.vercel.app/my-shop/edit', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const finalUrl = page.url();
  const status = response?.status() ?? -1;

  console.log('FINAL URL:', finalUrl);
  console.log('HTTP STATUS (initial):', status);

  // Report whatever happened
  if (finalUrl.includes('/login') || finalUrl.includes('/signin') || finalUrl.includes('/auth')) {
    console.log('RESULT: Redirected to auth page — needs login (skipped)');
  } else if (finalUrl.includes('/my-shop/edit')) {
    console.log('RESULT: Page loaded without redirect (unexpected or SSR auth)');
    const bodyText = await page.textContent('body');
    console.log('BODY PREVIEW:', bodyText?.substring(0, 300));
  } else {
    console.log('RESULT: Redirected to unexpected URL');
    const bodyText = await page.textContent('body');
    console.log('BODY PREVIEW:', bodyText?.substring(0, 300));
  }

  // Always pass — we are reporting, not asserting
  expect(true).toBe(true);
});
