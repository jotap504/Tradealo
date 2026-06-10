import { test, expect, request as playwrightRequest } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const API_BASE =
  process.env.PLAYWRIGHT_API_URL ?? 'https://tradealo.onrender.com/api/v1';
const WEB_BASE =
  process.env.PLAYWRIGHT_BASE_URL ?? 'https://tradealo-web.vercel.app';

test.setTimeout(180_000);

test('logo.png is served by the web', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${WEB_BASE}/logo.png`, {
    failOnStatusCode: false,
    timeout: 30_000,
  });
  const bytes = (await res.body()).length;
  console.log(`[deploy] logo.png status=${res.status()} size=${bytes}`);
  expect(res.status()).toBe(200);
  await ctx.dispose();
});

for (const q of ['Honda', 'Homda', 'Sansumg']) {
  test(`fuzzy search /listings?q=${q} renders`, async ({ page }) => {
    await page.goto(`${WEB_BASE}/listings?q=${encodeURIComponent(q)}`, {
      waitUntil: 'networkidle',
    });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const cards = await page.locator('a[href*="/listing/"]').count();
    console.log(`[deploy] fuzzy q=${q} cards=${cards}`);
  });
}

test('ML callback route alive (302 redirect, not 404)', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(
    `${API_BASE}/mercadolibre/callback?code=x&state=x`,
    { maxRedirects: 0, failOnStatusCode: false, timeout: 60_000 },
  );
  console.log(`[deploy] /mercadolibre/callback status=${res.status()}`);
  expect(res.status()).not.toBe(404);
  await ctx.dispose();
});

test('ML connection requires auth', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/mercadolibre/connection`, {
    failOnStatusCode: false,
    timeout: 60_000,
  });
  console.log(`[deploy] /mercadolibre/connection status=${res.status()}`);
  expect([401, 403]).toContain(res.status());
  await ctx.dispose();
});

test('Excel preview endpoint deployed and requires auth', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${API_BASE}/excel-import/preview`, {
    data: { filename: 'x.xlsx', base64: '' },
    failOnStatusCode: false,
    timeout: 60_000,
  });
  console.log(`[deploy] /excel-import/preview status=${res.status()}`);
  expect(res.status()).not.toBe(404);
  expect([401, 403]).toContain(res.status());
  await ctx.dispose();
});

for (const path of [
  '/my-shop/integrations/excel',
  '/my-shop/integrations/mercadolibre',
  '/my-listings',
]) {
  test(`anon visiting ${path} → /login`, async ({ page }) => {
    await page.goto(`${WEB_BASE}${path}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });
}

test('template-trocalia.xlsx exists and is non-empty', async () => {
  const path = join(
    __dirname,
    '..',
    '..',
    '..',
    'Logo',
    'template-trocalia.xlsx',
  );
  expect(existsSync(path)).toBe(true);
  const buf = readFileSync(path);
  console.log(`[deploy] template size=${buf.length}`);
  expect(buf.length).toBeGreaterThan(5000);
});
