import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_BASE =
  process.env.PLAYWRIGHT_API_URL ?? 'https://tradealo.onrender.com/api/v1';

test.setTimeout(180_000);

test('AI /ai/generate endpoint mounted (auth required)', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${API_BASE}/ai/generate`, {
    data: {
      type: 'description',
      context: { title: 'Bicicleta MTB rodado 29' },
    },
    failOnStatusCode: false,
    timeout: 60_000,
  });
  console.log(`[ai] /ai/generate status=${res.status()}`);
  expect(res.status()).not.toBe(404);
  expect([401, 403]).toContain(res.status());
  await ctx.dispose();
});

test('AI /ai/generate-listing endpoint mounted (auth required)', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${API_BASE}/ai/generate-listing`, {
    data: { prompt: 'remera negra talle M' },
    failOnStatusCode: false,
    timeout: 60_000,
  });
  console.log(`[ai] /ai/generate-listing status=${res.status()}`);
  expect(res.status()).not.toBe(404);
  expect([401, 403]).toContain(res.status());
  await ctx.dispose();
});

test('CategoryNode tree is recursive and well-formed', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/categories/tree`, {
    timeout: 60_000,
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(200);
  const { data } = (await res.json()) as {
    data: Array<{
      slug: string;
      depth: number;
      children: unknown[];
    }>;
  };
  const calzado = data.find((c) => c.slug === 'calzado');
  console.log(
    `[tree] calzado depth=${calzado?.depth} children=${calzado?.children?.length}`,
  );
  expect(calzado).toBeTruthy();
  expect(calzado!.depth).toBe(0);
  expect(Array.isArray(calzado!.children)).toBe(true);
  expect(calzado!.children.length).toBeGreaterThan(0);
  await ctx.dispose();
});

test('variants public endpoint returns empty array for unknown listing', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const dummy = '00000000-0000-0000-0000-000000000000';
  const res = await ctx.get(
    `${API_BASE}/listings/${dummy}/variants/public`,
    { timeout: 60_000, failOnStatusCode: false },
  );
  console.log(`[variants] public dummy status=${res.status()}`);
  expect(res.status()).toBe(200);
  const { data } = (await res.json()) as { data: unknown[] };
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBe(0);
  await ctx.dispose();
});

test('listings filter attrs JSON encoded works', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const url = `${API_BASE}/listings?attrs=${encodeURIComponent('{"color":"rojo","talle":"39"}')}&limit=5`;
  const res = await ctx.get(url, { timeout: 60_000, failOnStatusCode: false });
  console.log(`[filter] multi-attr status=${res.status()}`);
  expect(res.status()).toBe(200);
  await ctx.dispose();
});
