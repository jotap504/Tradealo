import { test, expect } from '@playwright/test';
import { API, MOCK_USER } from './helpers/api-mocks';

test.describe('Login', () => {
  test('renders login form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[name=email]')).toBeVisible();
    await expect(page.locator('[name=password]')).toBeVisible();
    await expect(page.locator('button[type=submit]')).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/login');
    // 'user@nodomain' passes browser native email validation (has @)
    // but fails zod's strict check (no TLD), triggering React Hook Form error
    await page.fill('[name=email]', 'user@nodomain');
    await page.fill('[name=password]', 'validPassword123');
    await page.click('button[type=submit]');
    await expect(page.locator('text=Email inválido')).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'test@trocalia.com.ar');
    await page.fill('[name=password]', 'abc');
    await page.click('button[type=submit]');
    await expect(page.locator('text=Mínimo 6 caracteres')).toBeVisible();
  });

  test('successful login redirects to /dashboard', async ({ page }) => {
    let loginSucceeded = false;

    await page.route(`${API}/auth/login`, (route) => {
      loginSucceeded = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      });
    });
    // Return 401 before login so AppProviders.initialize() doesn't auto-redirect
    await page.route(`${API}/auth/me`, (route) => {
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
    await page.fill('[name=email]', MOCK_USER.email);
    await page.fill('[name=password]', 'TestPass123');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('has link to /register', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
  });
});

test.describe('Register', () => {
  test('renders all registration fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('[name=email]')).toBeVisible();
    await expect(page.locator('[name=username]')).toBeVisible();
    await expect(page.locator('[name=password]')).toBeVisible();
    await expect(page.locator('[name=confirmPassword]')).toBeVisible();
  });

  test('shows password mismatch error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name=email]', 'test@trocalia.com.ar');
    await page.fill('[name=username]', 'testuser');
    await page.fill('[name=password]', 'Password123');
    await page.fill('[name=confirmPassword]', 'Different456');
    await page.click('button[type=submit]');
    await expect(page.locator('text=Las contraseñas no coinciden')).toBeVisible();
  });

  test('shows username format error for invalid characters', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name=email]', 'test@trocalia.com.ar');
    await page.fill('[name=username]', 'invalid user!');
    await page.fill('[name=password]', 'Password123');
    await page.fill('[name=confirmPassword]', 'Password123');
    await page.click('button[type=submit]');
    await expect(
      page.locator('text=Solo letras, números y guiones bajos')
    ).toBeVisible();
  });

  test('shows error for short username', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name=email]', 'test@trocalia.com.ar');
    await page.fill('[name=username]', 'ab');
    await page.fill('[name=password]', 'Password123');
    await page.fill('[name=confirmPassword]', 'Password123');
    await page.click('button[type=submit]');
    await expect(page.locator('text=Mínimo 3 caracteres')).toBeVisible();
  });

  test('successful registration shows phone verification step', async ({ page }) => {
    await page.route(`${API}/auth/register`, (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      })
    );

    await page.goto('/register');
    await page.fill('[name=email]', 'new@trocalia.com.ar');
    await page.fill('[name=username]', 'newuser');
    await page.fill('[name=password]', 'Password123');
    await page.fill('[name=confirmPassword]', 'Password123');
    await page.click('button[type=submit]');
    await expect(page.locator('text=¡Cuenta creada!')).toBeVisible({ timeout: 10000 });
  });
});
