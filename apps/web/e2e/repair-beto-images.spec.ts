/**
 * Audits and repairs broken images for user beto.
 *
 * For each listing:
 *   1. HEAD each image URL → if 404/error, DELETE the image record via API
 *
 * Run:
 *   npx playwright test e2e/repair-beto-images.spec.ts --project=chromium
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';

const API = 'https://tradealo.onrender.com/api/v1';
const EMAIL = 'beto@gmail.com';
const PASS = 'Test1234';

test.setTimeout(600_000);

test('audit and repair beto broken images', async () => {
  const api = await playwrightRequest.newContext({
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });

  // ── 1. Login ──────────────────────────────────────────────────────────────
  const loginRes = await api.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PASS },
    failOnStatusCode: false,
    timeout: 60_000,
  });
  expect(loginRes.status(), 'login failed').toBe(200);
  const loginBody = await loginRes.json();
  console.log('[repair] login body keys:', Object.keys(loginBody));
  const accessToken: string =
    loginBody.accessToken ?? loginBody.data?.accessToken ?? loginBody.token;
  console.log('[repair] logged in ✓ token length:', accessToken?.length);

  const auth = { Authorization: `Bearer ${accessToken}` };

  // ── 2. Get all own listings (paginated) ──────────────────────────────────
  type ListingImage = { id: string; url: string; thumbnailUrl: string | null };
  type Listing = { id: string; title: string; images: ListingImage[] };

  const allListings: Listing[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page++) {
    const url = cursor
      ? `${API}/listings/mine?limit=50&cursor=${encodeURIComponent(cursor)}`
      : `${API}/listings/mine?limit=50`;
    const res = await api.get(url, { headers: auth, failOnStatusCode: false, timeout: 60_000 });
    expect(res.status(), `listings page ${page} failed`).toBe(200);
    const raw = await res.json();
    // Unwrap { success, data: { data: [...], nextCursor } } or { data: [...], nextCursor }
    const body = raw?.success ? raw.data : raw;
    const items: Listing[] = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
    console.log(`[repair] page ${page}: ${items.length} listings`);
    allListings.push(...items);
    cursor = body?.nextCursor ?? undefined;
    if (!cursor || items.length === 0) break;
  }

  console.log(`[repair] found ${allListings.length} listings`);

  // ── 3. Audit each image URL (parallel per listing) ────────────────────────
  const broken: { listingId: string; imageId: string; url: string }[] = [];
  const imgCtx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const noImages = allListings.filter((l) => !l.images?.length);
  const withImages = allListings.filter((l) => l.images?.length > 0);
  noImages.forEach((l) => console.log(`[repair] NO IMAGES: "${l.title}"`));

  // Check all images in parallel (batches of 20 to avoid overwhelming)
  const BATCH = 20;
  const allImageTasks = withImages.flatMap((listing) =>
    listing.images.map((img) => ({ listing, img })),
  );

  for (let i = 0; i < allImageTasks.length; i += BATCH) {
    const batch = allImageTasks.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async ({ listing, img }) => {
        try {
          const r = await imgCtx.head(img.url, { timeout: 15_000, failOnStatusCode: false });
          return { listing, img, status: r.status() };
        } catch (e) {
          return { listing, img, status: 0, err: (e as Error).message };
        }
      }),
    );
    for (const { listing, img, status, err } of results as Array<{ listing: Listing; img: ListingImage; status: number; err?: string }>) {
      if (status >= 400 || status === 0) {
        console.log(`[repair] BROKEN ${status} "${listing.title}" → ${img.url}${err ? ' err:' + err : ''}`);
        broken.push({ listingId: listing.id, imageId: img.id, url: img.url });
      } else {
        console.log(`[repair] OK ${status} "${listing.title}"`);
      }
    }
    console.log(`[repair] checked ${Math.min(i + BATCH, allImageTasks.length)}/${allImageTasks.length} images`);
  }

  await imgCtx.dispose();

  // ── 4. Summary before repair ──────────────────────────────────────────────
  console.log(`\n[repair] ─── AUDIT SUMMARY ───`);
  console.log(`[repair] Total listings : ${allListings.length}`);
  console.log(`[repair] Broken images  : ${broken.length}`);

  if (broken.length === 0) {
    console.log('[repair] All images OK ✓');
    await api.dispose();
    return;
  }

  // ── 5. Delete broken image records ────────────────────────────────────────
  let deleted = 0;
  let errors = 0;
  for (const { listingId, imageId } of broken) {
    const delRes = await api.delete(`${API}/listings/${listingId}/images/${imageId}`, {
      headers: auth,
      failOnStatusCode: false,
      timeout: 30_000,
    });
    if (delRes.status() === 200 || delRes.status() === 204) {
      console.log(`[repair] DELETED image ${imageId} (listing ${listingId})`);
      deleted++;
    } else {
      const body = await delRes.text().catch(() => '');
      console.log(`[repair] DELETE FAILED ${delRes.status()} for ${imageId}: ${body}`);
      errors++;
    }
  }

  console.log(`\n[repair] ─── REPAIR SUMMARY ───`);
  console.log(`[repair] Deleted : ${deleted}`);
  console.log(`[repair] Errors  : ${errors}`);

  await api.dispose();
  expect(errors).toBe(0);
});
