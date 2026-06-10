import { test, expect, request as playwrightRequest } from '@playwright/test';

const CANDIDATES = [
  'https://tradealo-api.onrender.com/api/v1',
  'https://tradealo-api.onrender.com',
  'https://tradealo-api.onrender.com/v1',
];

for (const base of CANDIDATES) {
  test(`probe ${base}`, async () => {
    const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    try {
      const root = await ctx.get(`${base}/`, {
        failOnStatusCode: false,
        timeout: 30_000,
      });
      const health = await ctx.get(`${base}/health`, {
        failOnStatusCode: false,
        timeout: 30_000,
      });
      console.log(
        `[probe] ${base} → / =${root.status()} /health=${health.status()} body=${(await root.text()).slice(0, 100)}`,
      );
    } catch (err) {
      console.log(`[probe] ${base} ERR: ${(err as Error).message}`);
    } finally {
      await ctx.dispose();
    }
    expect(true).toBe(true);
  });
}
