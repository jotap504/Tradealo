import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_BASE =
  process.env.PLAYWRIGHT_API_URL ?? 'https://tradealo.onrender.com/api/v1';

test.setTimeout(180_000);

interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  depth: number;
  pathSlugs: string[] | null;
  isActive: boolean;
  children: CategoryNode[];
}

interface CategoryAttribute {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options: { values: string[] } | null;
  isRequired: boolean;
  isVariant: boolean;
  sortOrder: number;
}

test('GET /categories/tree returns expanded tree with new roots', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/categories/tree`, {
    timeout: 60_000,
    failOnStatusCode: false,
  });
  console.log(`[cats] /tree status=${res.status()}`);
  expect(res.status()).toBe(200);
  const tree = (((await res.json()) as { data: unknown }).data) as CategoryNode[];

  const rootSlugs = tree.map((r) => r.slug);
  console.log(
    `[cats] roots count=${tree.length} sample=${rootSlugs.slice(0, 8).join(',')}`,
  );

  for (const expected of [
    'mascotas',
    'servicios',
    'salud',
    'juguetes',
    'libros-cultura',
    'bebes',
    'calzado',
  ]) {
    expect(rootSlugs).toContain(expected);
  }

  for (const expected of [
    'electronica',
    'vehiculos',
    'ropa',
    'hogar',
    'deportes',
    'coleccionables',
    'otros',
  ]) {
    expect(rootSlugs).toContain(expected);
  }

  await ctx.dispose();
});

test('bicicletas-mtb has depth=2 and correct path', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/categories/bicicletas-mtb`, {
    timeout: 60_000,
    failOnStatusCode: false,
  });
  console.log(`[cats] /bicicletas-mtb status=${res.status()}`);
  expect(res.status()).toBe(200);
  const cat = (((await res.json()) as { data: unknown }).data) as CategoryNode & {
    attributes: CategoryAttribute[];
  };
  console.log(
    `[cats] mtb depth=${cat.depth} path=${(cat.pathSlugs ?? []).join('/')}`,
  );
  expect(cat.depth).toBe(2);
  expect(cat.pathSlugs).toEqual(['deportes', 'bicicletas', 'bicicletas-mtb']);

  const keys = cat.attributes.map((a) => a.key);
  console.log(`[cats] mtb attrs=${keys.join(',')}`);
  expect(keys).toContain('rodado');

  await ctx.dispose();
});

test('zapatillas: talle + color are flagged isVariant', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/categories/zapatillas/attributes`, {
    timeout: 60_000,
    failOnStatusCode: false,
  });
  console.log(`[cats] /zapatillas/attributes status=${res.status()}`);
  expect(res.status()).toBe(200);
  const attrs = (((await res.json()) as { data: unknown }).data) as CategoryAttribute[];
  console.log(`[cats] zapatillas keys=${attrs.map((a) => a.key).join(',')}`);

  const talle = attrs.find((a) => a.key === 'talle');
  const color = attrs.find((a) => a.key === 'color');
  expect(talle?.isVariant).toBe(true);
  expect(color?.isVariant).toBe(true);
  expect(talle?.options?.values ?? []).toContain('38');

  await ctx.dispose();
});

test('celulares: almacenamiento + color are flagged isVariant', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(`${API_BASE}/categories/celulares/attributes`, {
    timeout: 60_000,
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(200);
  const attrs = (((await res.json()) as { data: unknown }).data) as CategoryAttribute[];
  const alm = attrs.find((a) => a.key === 'almacenamiento');
  const col = attrs.find((a) => a.key === 'color');
  console.log(
    `[cats] celulares almacenamiento.isVariant=${alm?.isVariant} color.isVariant=${col?.isVariant}`,
  );
  expect(alm?.isVariant).toBe(true);
  expect(col?.isVariant).toBe(true);
  await ctx.dispose();
});

test('variant routes mounted (public 200 empty, private 401)', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const dummy = '00000000-0000-0000-0000-000000000000';

  const pub = await ctx.get(
    `${API_BASE}/listings/${dummy}/variants/public`,
    { timeout: 60_000, failOnStatusCode: false },
  );
  console.log(`[variants] public status=${pub.status()}`);
  expect([200, 404]).toContain(pub.status());

  const priv = await ctx.get(`${API_BASE}/listings/${dummy}/variants`, {
    timeout: 60_000,
    failOnStatusCode: false,
  });
  console.log(`[variants] private status=${priv.status()}`);
  expect([401, 403]).toContain(priv.status());

  await ctx.dispose();
});

test('listings filter attrs={"color":"rojo"} returns 200', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(
    `${API_BASE}/listings?attrs=${encodeURIComponent('{"color":"rojo"}')}&limit=5`,
    { timeout: 60_000, failOnStatusCode: false },
  );
  console.log(`[filter] /listings attrs=color:rojo status=${res.status()}`);
  expect(res.status()).toBe(200);
  await ctx.dispose();
});

test('malformed attrs param is ignored, not 500', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(
    `${API_BASE}/listings?attrs=this-is-not-json&limit=5`,
    { timeout: 60_000, failOnStatusCode: false },
  );
  console.log(`[filter] /listings attrs=garbage status=${res.status()}`);
  expect(res.status()).toBe(200);
  await ctx.dispose();
});
