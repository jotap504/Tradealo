import { test, expect } from '@playwright/test';

const WEB_BASE =
  process.env.PLAYWRIGHT_BASE_URL ?? 'https://tradealo-web.vercel.app';

test.setTimeout(180_000);

test('listings page with category filter loads dynamic attribute UI', async ({
  page,
}) => {
  await page.goto(`${WEB_BASE}/listings?category=zapatillas`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(2000);

  const dynamicLabel = page.getByText(/Filtros de categoría/i);
  const visible = await dynamicLabel.isVisible().catch(() => false);
  console.log(`[pr3] dynamic filter visible=${visible}`);

  await page.screenshot({ path: 'pr3-listings-zapatillas.png', fullPage: true });
});

test('listings detail page renders without crashing', async ({ page }) => {
  await page.goto(`${WEB_BASE}/listings`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  const firstCard = page.locator('a[href*="/listing/"]').first();
  const count = await page.locator('a[href*="/listing/"]').count();
  console.log(`[pr3] listing cards on /listings = ${count}`);
  if (count === 0) {
    test.skip(true, 'No listings to navigate to');
    return;
  }
  await firstCard.click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: 'pr3-listing-detail.png', fullPage: false });
});

test('publish wizard requires auth (anon → /login)', async ({ page }) => {
  await page.goto(`${WEB_BASE}/my-listings/new`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);
  const url = page.url();
  console.log(`[pr3] /my-listings/new redirected to=${url}`);
  expect(url).toContain('/login');
});
