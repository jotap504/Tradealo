import type { Page } from '@playwright/test';

// Kept for tests that build their own route patterns.
export const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001/api/v1';

// Returns a glob pattern that matches regardless of the API base URL.
export const r = (path: string) => `**/api/v1/${path}`;

export const MOCK_USER = {
  id: 'user-e2e-01',
  email: 'e2etest@trocalia.com.ar',
  username: 'e2etest',
  role: 'user',
  kycLevel: 0,
  tokenBalance: 5,
  avatarUrl: null,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const MOCK_LISTING = {
  id: 'listing-e2e-01',
  title: 'Bicicleta de montaña rodado 29',
  description: 'Bicicleta en excelente estado, poco uso.',
  price: 150000,
  currency: 'ARS',
  negotiable: false,
  province: 'Buenos Aires',
  city: 'Palermo',
  condition: 'used',
  type: 'standard',
  status: 'approved',
  images: [],
  paymentMethods: ['Efectivo'],
  shippingOptions: ['Encuentro en persona'],
  shippingDescription: '',
  viewCount: 5,
  isCollectible: false,
  attributes: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  seller: MOCK_USER,
};

// Auth store reads from localStorage, not /auth/me.
// addInitScript runs before page JS so store.initialize() finds the data.
export async function mockAuthenticatedUser(page: Page) {
  const user = MOCK_USER;
  await page.addInitScript(({ user }) => {
    localStorage.setItem('accessToken', 'mock-access-token-e2e');
    localStorage.setItem('authUser', JSON.stringify(user));
  }, { user });
}

export async function mockListingsEndpoint(page: Page, data = [MOCK_LISTING]) {
  await page.route(r('listings**'), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, total: data.length, nextCursor: null }),
    }),
  );
}

export async function mockWalletBalance(page: Page, balance = 5) {
  await page.route(r('wallet/balance'), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance }),
    }),
  );
  await page.route(r('wallet/free-quota'), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ quota: 3, remaining: 3, used: 0 }),
    }),
  );
}

export async function mockCategoriesEndpoint(page: Page) {
  await page.route(r('categories**'), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }),
  );
}

export async function mockNotificationsEndpoint(page: Page) {
  await page.route(r('notifications**'), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0, nextCursor: null }),
    }),
  );
}
