import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_BASE =
  process.env.PLAYWRIGHT_API_URL ?? 'https://tradealo.onrender.com/api/v1';

test.setTimeout(180_000);

test('warmup', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/health`, {
    failOnStatusCode: false,
    timeout: 120_000,
  });
  console.log(`[ml-deploy] warmup /health=${res.status()}`);
  await ctx.dispose();
});

test('ML callback route responds (proves deploy includes mercadolibre module)', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(
    `${API_BASE}/mercadolibre/callback?code=x&state=x`,
    { maxRedirects: 0, failOnStatusCode: false, timeout: 60_000 },
  );
  console.log(`[ml-deploy] callback status=${res.status()}`);
  expect(res.status()).not.toBe(404);
  await ctx.dispose();
});

test('ML connection route exists (401 expected, not 404)', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/mercadolibre/connection`, {
    failOnStatusCode: false,
    timeout: 60_000,
  });
  console.log(`[ml-deploy] connection status=${res.status()}`);
  expect(res.status()).not.toBe(404);
  await ctx.dispose();
});
