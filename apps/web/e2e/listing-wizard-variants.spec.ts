import { test, expect, type Page } from '@playwright/test';
import {
  r,
  mockAuthenticatedUser,
  mockWalletBalance,
  mockNotificationsEndpoint,
} from './helpers/api-mocks';

const DRAFT_ID = 'listing-wizard-draft-e2e-01';

// ─── Fixture categories (leaf nodes — no children → immediate selection) ────────
const CAT_ZAPATILLAS = {
  id: 'cat-zapatillas-01', name: 'Zapatillas', slug: 'zapatillas',
  isCollectible: false, parentId: null, depth: 0, pathSlugs: null, children: [], attributes: [],
};
const CAT_CELULARES = {
  id: 'cat-celulares-01', name: 'Celulares', slug: 'celulares',
  isCollectible: false, parentId: null, depth: 0, pathSlugs: null, children: [], attributes: [],
};
const CAT_REMERAS = {
  id: 'cat-remeras-01', name: 'Remeras', slug: 'remeras',
  isCollectible: false, parentId: null, depth: 0, pathSlugs: null, children: [], attributes: [],
};

// ─── Fixture attributes ─────────────────────────────────────────────────────
const ATTRS_ZAPATILLAS = [
  { key: 'talle', label: 'Talle', type: 'select', options: { values: ['38','39','40','41','42'] }, required: true, isVariant: true },
  { key: 'color', label: 'Color', type: 'select', options: { values: ['Negro','Blanco','Rojo'] }, required: false, isVariant: true },
  { key: 'marca', label: 'Marca', type: 'text', options: null, required: false, isVariant: false },
];
const ATTRS_CELULARES = [
  { key: 'almacenamiento', label: 'Almacenamiento', type: 'select', options: { values: ['64GB','128GB','256GB','512GB'] }, required: true, isVariant: true },
  { key: 'color', label: 'Color', type: 'select', options: { values: ['Negro','Blanco','Azul'] }, required: false, isVariant: true },
  { key: 'marca', label: 'Marca', type: 'text', options: null, required: false, isVariant: false },
];
const ATTRS_REMERAS = [
  { key: 'talle', label: 'Talle', type: 'select', options: { values: ['XS','S','M','L','XL','XXL'] }, required: true, isVariant: true },
  { key: 'marca', label: 'Marca', type: 'text', options: null, required: false, isVariant: false },
];

// ─── Setup helpers ──────────────────────────────────────────────────────────
async function setupWizardMocks(
  page: Page,
  cats = [CAT_ZAPATILLAS, CAT_CELULARES, CAT_REMERAS],
) {
  await mockAuthenticatedUser(page);
  await mockWalletBalance(page, 10);
  await mockNotificationsEndpoint(page);

  await page.route(r('categories/tree'), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cats),
    }),
  );

  // token packs (loaded lazily at publish step)
  await page.route(r('wallet/token-packs'), (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );

  // create listing → returns draft
  await page.route(r('listings'), async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: DRAFT_ID, status: 'draft', title: '', price: 0 }),
      });
    } else {
      await route.continue();
    }
  });

  // update / publish
  await page.route(r(`listings/${DRAFT_ID}`), async (route) => {
    if (['PATCH', 'PUT'].includes(route.request().method())) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: DRAFT_ID, status: 'draft' }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(r(`listings/${DRAFT_ID}/publish`), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: DRAFT_ID, status: 'pending' }),
    }),
  );
}

async function mockCategoryDetail(
  page: Page,
  catId: string,
  attrs: { key: string; label: string; type: string; options: { values: string[] } | null; required: boolean; isVariant: boolean }[],
) {
  await page.route(r(`categories/${catId}`), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: catId, name: 'Test', slug: catId,
        isCollectible: false, parentId: null, depth: 0, pathSlugs: null,
        attributes: attrs,
      }),
    }),
  );
}

async function mockVariantsEndpoint(
  page: Page,
  savedVariants: {
    id: string; listingId: string; attributeValues: Record<string, string>;
    stock: number; sku: null; price: null; weightGrams: null;
    lengthCm: null; widthCm: null; heightCm: null; isActive: boolean;
  }[],
) {
  await page.route(r(`listings/${DRAFT_ID}/variants`), async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(savedVariants),
      });
    } else {
      await route.continue();
    }
  });
}

// Navigate to step 2 by clicking a leaf category
async function selectCategory(page: Page, catName: string) {
  await expect(page.locator('text=Paso 1: Elegí una categoría')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: catName }).first().click();
  await expect(page.locator('text=¿Cómo querés vender?')).toBeVisible({ timeout: 5000 });
}

// Navigate step 2 → step 3 by picking a sale type card and clicking Siguiente
async function selectSaleTypeAndAdvance(page: Page, saleLabel: string) {
  await page.getByRole('button', { name: new RegExp(saleLabel, 'i') }).first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
}

// Fill title + description then click Siguiente (triggers createListing call)
async function fillDetailsAndAdvance(page: Page) {
  await expect(page.locator('text=Detalles del producto')).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder(/Zapatillas Nike Air Max/i).fill('Zapatillas Adidas talle 40');
  await page.getByPlaceholder(/Contá el estado/i).fill('Excelente estado, compradas hace 6 meses sin uso.');
  await page.getByRole('button', { name: 'Siguiente' }).click();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Wizard paso 1 — árbol de categorías', () => {
  test('renders categories from tree API', async ({ page }) => {
    await setupWizardMocks(page);
    await page.goto('/my-listings/new');

    await expect(page.locator('text=Paso 1: Elegí una categoría')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Zapatillas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Celulares' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remeras' })).toBeVisible();
  });

  test('clicking leaf category auto-advances to sale type step', async ({ page }) => {
    await setupWizardMocks(page);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');

    await expect(page.locator('text=¿Cómo querés vender?')).toBeVisible();
    await expect(page.getByRole('button', { name: /Contacto libre/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Con stock/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Subasta/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /En Vivo/i })).toBeVisible();
  });

  test('selecting stock type shows 7-step stepper immediately', async ({ page }) => {
    await setupWizardMocks(page);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await page.getByRole('button', { name: /Con stock/i }).click();

    // StepIndicator re-renders with 7 steps as soon as saleType updates
    const circles = page.locator('[data-testid="step-circle"]');
    await expect(circles).toHaveCount(7);
  });

  test('selecting contact type shows 6-step stepper', async ({ page }) => {
    await setupWizardMocks(page);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await page.getByRole('button', { name: /Contacto libre/i }).click();

    const circles = page.locator('[data-testid="step-circle"]');
    await expect(circles).toHaveCount(6);
  });
});

test.describe('Wizard paso 4 — VariantsBuilder (stock)', () => {
  test('VariantsBuilder renders talle/color dimensions for zapatillas', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, ATTRS_ZAPATILLAS);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await selectSaleTypeAndAdvance(page, 'Con stock');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Paso 4: Variantes')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Talle' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Color' })).toBeVisible();
    // Non-variant attr should NOT appear as dimension
    await expect(page.getByRole('button', { name: 'Marca' })).not.toBeVisible();
  });

  test('VariantsBuilder renders almacenamiento/color for celulares', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_CELULARES.id, ATTRS_CELULARES);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Celulares');
    await selectSaleTypeAndAdvance(page, 'Con stock');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Paso 4: Variantes')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Almacenamiento' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Color' })).toBeVisible();
  });

  test('VariantsBuilder renders single talle dimension for remeras', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_REMERAS.id, ATTRS_REMERAS);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Remeras');
    await selectSaleTypeAndAdvance(page, 'Con stock');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Paso 4: Variantes')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Talle' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Color' })).not.toBeVisible();
  });

  test('VariantsBuilder shows no-attrs message for category without isVariant', async ({ page }) => {
    const noVariantAttrs = [
      { key: 'marca', label: 'Marca', type: 'text', options: null, required: false, isVariant: false },
    ];
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, noVariantAttrs);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await selectSaleTypeAndAdvance(page, 'Con stock');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Paso 4: Variantes')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=no tiene atributos de variante configurados')).toBeVisible();
  });

  test('clicking value buttons generates combination matrix rows', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, ATTRS_ZAPATILLAS);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await selectSaleTypeAndAdvance(page, 'Con stock');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Paso 4: Variantes')).toBeVisible({ timeout: 8000 });

    // Talle and Color dimensions are pre-selected; click values to generate combos
    await page.getByRole('button', { name: '39' }).click();
    await page.getByRole('button', { name: '40' }).click();
    await page.getByRole('button', { name: 'Negro' }).click();

    // 2 talles × 1 color = 2 rows
    await expect(page.locator('text=Variantes (2)')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('table tbody tr')).toHaveCount(2);
  });

  test('2×2 matrix — celulares 128GB/256GB × Negro/Blanco = 4 variants', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_CELULARES.id, ATTRS_CELULARES);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Celulares');
    await selectSaleTypeAndAdvance(page, 'Con stock');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Paso 4: Variantes')).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: '128GB' }).click();
    await page.getByRole('button', { name: '256GB' }).click();
    await page.getByRole('button', { name: 'Negro' }).click();
    await page.getByRole('button', { name: 'Blanco' }).click();

    await expect(page.locator('text=Variantes (4)')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('table tbody tr')).toHaveCount(4);
  });
});

test.describe('Wizard paso 5 — fotos con variantes', () => {
  test('photos step shows variant assignment hint when savedVariants exist', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, ATTRS_ZAPATILLAS);
    await mockVariantsEndpoint(page, [
      { id: 'v1', listingId: DRAFT_ID, attributeValues: { talle: '39', color: 'Negro' }, stock: 5, sku: null, price: null, weightGrams: null, lengthCm: null, widthCm: null, heightCm: null, isActive: true },
      { id: 'v2', listingId: DRAFT_ID, attributeValues: { talle: '40', color: 'Blanco' }, stock: 3, sku: null, price: null, weightGrams: null, lengthCm: null, widthCm: null, heightCm: null, isActive: true },
    ]);

    await page.goto('/my-listings/new');
    await selectCategory(page, 'Zapatillas');
    await selectSaleTypeAndAdvance(page, 'Con stock');
    await fillDetailsAndAdvance(page);

    // Step 4: add variant values then advance (triggers replaceAll)
    await expect(page.locator('text=Paso 4: Variantes')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: '39' }).click();
    await page.getByRole('button', { name: 'Negro' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Step 5: photos with variant hint
    await expect(page.locator('text=Paso 5: Fotos del producto')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Podés asignar cada foto a una variante específica')).toBeVisible();
  });
});

test.describe('Wizard — tipos de venta alternativos', () => {
  test('contact listing skips variants step — photos comes after details', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, ATTRS_ZAPATILLAS);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await selectSaleTypeAndAdvance(page, 'Contacto libre');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Fotos del producto')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Variantes')).not.toBeVisible();
  });

  test('auction listing shows desired price field at price step', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, []);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await selectSaleTypeAndAdvance(page, 'Subasta');
    await fillDetailsAndAdvance(page);

    // Skip photos
    await expect(page.locator('text=Fotos del producto')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.locator('text=Precio y envío')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Precio deseado')).toBeVisible();
  });

  test('live listing shows YouTube input at step 3', async ({ page }) => {
    await setupWizardMocks(page);
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, []);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await page.getByRole('button', { name: /En Vivo/i }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.getByRole('heading', { name: /Link de tu transmisión/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/youtube\.com\/watch/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Crear publicación en vivo/i })).toBeVisible();
  });

  test('live listing has only 3 steps (no photos/price/publish)', async ({ page }) => {
    await setupWizardMocks(page);
    await page.goto('/my-listings/new');

    await selectCategory(page, 'Zapatillas');
    await page.getByRole('button', { name: /En Vivo/i }).click();

    const circles = page.locator('[data-testid="step-circle"]');
    await expect(circles).toHaveCount(3);
  });
});

test.describe('Wizard paso final — publicar', () => {
  async function navigateToPublishStep(page: Page) {
    await mockCategoryDetail(page, CAT_ZAPATILLAS.id, []);
    await page.goto('/my-listings/new');
    await selectCategory(page, 'Zapatillas');
    await selectSaleTypeAndAdvance(page, 'Contacto libre');
    await fillDetailsAndAdvance(page);

    await expect(page.locator('text=Fotos del producto')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.locator('text=Precio y envío')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Precio', { exact: true }).fill('15000');
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.locator('text=Revisá y publicá')).toBeVisible({ timeout: 5000 });
  }

  test('publish step renders province selector and publish button', async ({ page }) => {
    await setupWizardMocks(page);
    await navigateToPublishStep(page);

    await expect(page.locator('[data-testid=publish-btn]')).toBeVisible();
    await expect(page.getByLabel('Provincia')).toBeVisible();
  });

  test('publish without province shows error toast', async ({ page }) => {
    await setupWizardMocks(page);
    await navigateToPublishStep(page);

    await page.locator('[data-testid=publish-btn]').click();
    await expect(page.locator('text=Seleccioná una provincia')).toBeVisible({ timeout: 3000 });
  });

  test('publish with province selected calls API and redirects to /my-listings', async ({ page }) => {
    await setupWizardMocks(page);
    await navigateToPublishStep(page);

    await page.getByLabel('Provincia').selectOption('Buenos Aires');
    await page.locator('[data-testid=publish-btn]').click();

    await expect(page).toHaveURL('/my-listings', { timeout: 10000 });
  });
});
