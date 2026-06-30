import { test, expect } from '@playwright/test';
import {
  r,
  MOCK_USER,
  mockAuthenticatedUser,
  mockWalletBalance,
  mockCategoriesEndpoint,
  mockNotificationsEndpoint,
} from './helpers/api-mocks';

const MOCK_LISTING_ID = 'listing-draft-e2e-01';

test.describe('E2E-01: Registro completo y primera publicación', () => {
  test('register → shows phone verification step', async ({ page }) => {
    await page.route(r('auth/register'), (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      })
    );

    await page.goto('/register');
    await page.fill('[name=email]', 'e2etest@trocalia.com.ar');
    await page.fill('[name=username]', 'e2etest');
    await page.fill('[name=password]', 'TestPass123');
    await page.fill('[name=confirmPassword]', 'TestPass123');
    await page.click('button[type=submit]');

    await expect(page.locator('text=¡Cuenta creada!')).toBeVisible({ timeout: 10000 });
  });

  test('login → redirects to /dashboard', async ({ page }) => {
    let loginSucceeded = false;

    await page.route(r('auth/login'), (route) => {
      loginSucceeded = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      });
    });
    // Return 401 before login so AppProviders.initialize() doesn't auto-redirect
    await page.route(r('auth/me'), (route) => {
      if (loginSucceeded) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER),
        });
      } else {
        route.fulfill({ status: 401, body: '{}' });
      }
    });

    await page.goto('/login');
    await page.fill('[name=email]', 'e2etest@trocalia.com.ar');
    await page.fill('[name=password]', 'TestPass123');
    await page.click('button[type=submit]');

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('new listing wizard — step 1 renders category selector', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockWalletBalance(page);
    await mockCategoriesEndpoint(page);
    await mockNotificationsEndpoint(page);

    await page.goto('/my-listings/new');
    await expect(
      page.locator('text=Paso 1: Elegí una categoría')
    ).toBeVisible({ timeout: 10000 });
  });

  test('new listing wizard — step indicator shows 6 steps', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockWalletBalance(page);
    await mockCategoriesEndpoint(page);
    await mockNotificationsEndpoint(page);

    await page.goto('/my-listings/new');
    await expect(page.locator('text=Nueva publicación')).toBeVisible();

    // 6 step circles visible in the stepper
    const stepCircles = page.locator('[data-testid="step-circle"]');
    await expect(stepCircles).toHaveCount(6);
  });

  test('new listing wizard — advancing without category shows error toast', async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await mockWalletBalance(page);
    await mockCategoriesEndpoint(page);
    await mockNotificationsEndpoint(page);

    await page.goto('/my-listings/new');
    await page.locator('text=Siguiente').click();

    await expect(
      page.locator('text=Seleccioná una categoría')
    ).toBeVisible({ timeout: 5000 });
  });

  test('publish button has data-testid and is absent at step 1', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockWalletBalance(page, 10);
    await mockCategoriesEndpoint(page);
    await mockNotificationsEndpoint(page);
    await page.route(r('listings'), async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: MOCK_LISTING_ID, status: 'draft' }),
        });
      } else {
        await route.continue();
      }
    });
    await page.route(r('wallet/packs'), (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    );

    await page.goto('/my-listings/new');
    await expect(page.locator('text=Paso 1: Elegí una categoría')).toBeVisible();

    // At step 1 the publish button is not yet rendered
    const publishBtn = page.locator('[data-testid=publish-btn]');
    await expect(publishBtn).toHaveCount(0);
  });
});
