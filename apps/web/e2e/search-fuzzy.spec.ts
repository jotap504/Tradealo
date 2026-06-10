import { test, expect } from '@playwright/test';

const QUERIES = ['Honda', 'Homda', 'Hodna'];

for (const q of QUERIES) {
  test(`/listings?q=${q} renders something usable`, async ({ page }) => {
    const url = `/listings?q=${encodeURIComponent(q)}&t=${Date.now()}`;
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();

    const cardCount = await page.locator('a[href*="/listing/"]').count();

    const emptyText =
      (await page
        .getByText(/no se encontraron|sin resultados|0 resultados/i)
        .count()) > 0;

    console.log(
      `[search-fuzzy] q="${q}" heading="${headingText?.trim()}" cards=${cardCount} emptyLabel=${emptyText}`,
    );

    await page.screenshot({
      path: `search-fuzzy-${q}.png`,
      fullPage: false,
    });
  });
}
