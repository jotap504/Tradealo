import { test, expect, type Page } from '@playwright/test';
import {
  API,
  MOCK_USER,
  mockAuthenticatedUser,
  mockNotificationsEndpoint,
} from './helpers/api-mocks';

const PENDING_URL = `${API}/listings/me/pending-questions`;

async function seedSession(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('accessToken', 'test-token');
    window.localStorage.setItem('authUser', JSON.stringify(user));
  }, MOCK_USER);
}

const LISTING_A = { id: 'listing-a', title: 'Audi A4 TSI' };
const LISTING_B = { id: 'listing-b', title: 'Bicicleta rodado 29' };

const buildPending = (
  id: string,
  listing: { id: string; title: string },
  question: string,
  askerUsername: string | null = 'buyer42',
) => ({
  id,
  listingId: listing.id,
  listingTitle: listing.title,
  question,
  isPrivate: false,
  createdAt: '2026-06-03T10:00:00.000Z',
  askerUserId: 'buyer-42',
  askerUsername,
});

test.describe('Q&A pending inbox (/my-shop/questions)', () => {
  test.describe.configure({ mode: 'serial' });
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.route(`${API}/auth/me`, (route) =>
      route.fulfill({ status: 401, body: '{}' }),
    );
    await page.route(`${API}/auth/refresh`, (route) =>
      route.fulfill({ status: 401, body: '{}' }),
    );

    await page.goto('/my-shop/questions');

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('shows empty state when no pending questions', async ({ page }) => {
    await seedSession(page);
    await mockAuthenticatedUser(page);
    await mockNotificationsEndpoint(page);
    await page.route(PENDING_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );

    await page.goto('/my-shop/questions');

    await expect(
      page.getByRole('heading', { name: 'Preguntas por responder' }),
    ).toBeVisible();
    await expect(
      page.getByText(/No tenés preguntas pendientes/i),
    ).toBeVisible();
  });

  test('groups pending questions by listing', async ({ page }) => {
    await seedSession(page);
    await mockAuthenticatedUser(page);
    await mockNotificationsEndpoint(page);
    await page.route(PENDING_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          buildPending('q1', LISTING_A, '¿Cuántos kilómetros tiene?'),
          buildPending('q2', LISTING_A, '¿Acepta permuta?', null),
          buildPending('q3', LISTING_B, '¿Incluye envío a Córdoba?'),
        ]),
      }),
    );

    await page.goto('/my-shop/questions');

    await expect(page.getByRole('link', { name: /Audi A4 TSI/ })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Bicicleta rodado 29/ }),
    ).toBeVisible();

    await expect(
      page.getByText('¿Cuántos kilómetros tiene?', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('¿Acepta permuta?', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('¿Incluye envío a Córdoba?', { exact: true }),
    ).toBeVisible();

    await expect(page.getByText('Anónimo').first()).toBeVisible();
    await expect(page.getByText('@buyer42').first()).toBeVisible();
  });

  test('answering a question fires POST and refetches the inbox', async ({
    page,
  }) => {
    await seedSession(page);
    await mockAuthenticatedUser(page);
    await mockNotificationsEndpoint(page);

    let getCalls = 0;
    let answerPayload: { answer?: string } | null = null;

    await page.route(PENDING_URL, async (route) => {
      getCalls += 1;
      const body =
        getCalls === 1
          ? [buildPending('q1', LISTING_A, '¿Cuántos kilómetros tiene?')]
          : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.route(
      `${API}/listings/${LISTING_A.id}/questions/q1/answer`,
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        answerPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'q1',
            listingId: LISTING_A.id,
            userId: 'buyer-42',
            question: '¿Cuántos kilómetros tiene?',
            answer: 'Tiene 65.000 km.',
            answeredAt: new Date().toISOString(),
            isPrivate: false,
            createdAt: '2026-06-03T10:00:00.000Z',
            askerUsername: 'buyer42',
          }),
        });
      },
    );

    await page.goto('/my-shop/questions');

    await expect(
      page.getByText('¿Cuántos kilómetros tiene?', { exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Responder' }).click();
    await page
      .getByPlaceholder('Escribí tu respuesta…')
      .fill('Tiene 65.000 km.');
    await page.getByRole('button', { name: 'Publicar respuesta' }).click();

    await expect(
      page.getByText(/No tenés preguntas pendientes/i),
    ).toBeVisible({ timeout: 10_000 });

    expect(answerPayload).toEqual({ answer: 'Tiene 65.000 km.' });
    expect(getCalls).toBeGreaterThanOrEqual(2);
  });

  test('cancel button closes the answer composer without sending', async ({
    page,
  }) => {
    await seedSession(page);
    await mockAuthenticatedUser(page);
    await mockNotificationsEndpoint(page);
    await page.route(PENDING_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          buildPending('q1', LISTING_A, '¿Cuántos kilómetros tiene?'),
        ]),
      }),
    );

    let answerCalled = false;
    await page.route(
      `${API}/listings/${LISTING_A.id}/questions/q1/answer`,
      async (route) => {
        answerCalled = true;
        await route.fulfill({ status: 200, body: '{}' });
      },
    );

    await page.goto('/my-shop/questions');

    await page.getByRole('button', { name: 'Responder' }).click();
    await page
      .getByPlaceholder('Escribí tu respuesta…')
      .fill('Borrador descartado');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await expect(
      page.getByPlaceholder('Escribí tu respuesta…'),
    ).toHaveCount(0);
    expect(answerCalled).toBe(false);
  });
});
