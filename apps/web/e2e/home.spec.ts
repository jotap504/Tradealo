import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads with hero heading', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Tradealo/);
    await expect(
      page.getByRole('heading', { name: /Vende|Subasta|Intercambia/ })
    ).toBeVisible();
  });

  test('search bar is present and functional', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[name=q]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('bicicleta');
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/\/listings\?q=bicicleta/);
  });

  test('CTA links to /register and /listings are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
    await expect(page.locator('a[href="/listings"]').first()).toBeVisible();
  });

  test('footer shows copyright text (on public pages)', async ({ page }) => {
    // app/page.tsx is in root layout without footer.
    // Footer is in (public) layout — verified via /listings.
    await page.goto('/listings');
    await expect(
      page.locator('text=Tradealo — Hecho en Argentina')
    ).toBeVisible();
  });

  test('navbar header is present on public pages', async ({ page }) => {
    await page.goto('/listings');
    // Navbar renders as <header> element
    await expect(page.locator('header').first()).toBeVisible();
  });
});
