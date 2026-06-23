/**
 * Finds all beto listings with 0 images and uploads a relevant photo.
 * Strategy:
 *   1. If listing has sourceProductId (ML import) → re-download from ML public API
 *   2. Otherwise → fetch from loremflickr.com using title keywords (free, no API key)
 *   3. Fallback: picsum.photos with listing-id seed (consistent random)
 *
 * Run:
 *   npx playwright test e2e/fill-missing-images.spec.ts --config=playwright.repair.config.ts --project=chromium
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';

const API = 'https://tradealo.onrender.com/api/v1';
const EMAIL = 'beto@gmail.com';
const PASS = 'Test1234';
// Skip test/placeholder listings
const SKIP_TITLES = ['dasdsad', 'En Vivo -'];

test.setTimeout(600_000);

test('fill missing images for beto listings', async () => {
  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const imgCtx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  // ── 1. Login ──────────────────────────────────────────────────────────────
  const loginRes = await api.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PASS },
    failOnStatusCode: false,
    timeout: 60_000,
  });
  expect(loginRes.status(), 'login failed').toBe(200);
  const loginBody = await loginRes.json();
  const accessToken: string = loginBody.data?.accessToken ?? loginBody.accessToken;
  console.log('[fill] logged in ✓');

  const auth = { Authorization: `Bearer ${accessToken}` };

  // ── 2. Get all own listings ────────────────────────────────────────────────
  type Listing = {
    id: string;
    title: string;
    images: unknown[];
    sourceProductId?: string | null;
  };

  const allListings: Listing[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page++) {
    const url = cursor
      ? `${API}/listings/mine?limit=50&cursor=${encodeURIComponent(cursor)}`
      : `${API}/listings/mine?limit=50`;
    const res = await api.get(url, { headers: auth, failOnStatusCode: false, timeout: 60_000 });
    expect(res.status(), `page ${page}`).toBe(200);
    const raw = await res.json();
    const body = raw?.success ? raw.data : raw;
    const items: Listing[] = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
    allListings.push(...items);
    cursor = body?.nextCursor ?? undefined;
    if (!cursor || items.length === 0) break;
  }

  const noImages = allListings.filter(
    (l) =>
      (!l.images || l.images.length === 0) &&
      !SKIP_TITLES.some((skip) => l.title.startsWith(skip)),
  );

  console.log(`[fill] ${allListings.length} listings, ${noImages.length} need images`);
  noImages.forEach((l) =>
    console.log(`[fill]   "${l.title}" ML:${l.sourceProductId ?? 'none'}`),
  );

  let uploaded = 0;
  let failed = 0;

  for (const listing of noImages) {
    let imageBuffer: Buffer | null = null;
    let contentType = 'image/jpeg';
    let source = '';

    // ── Strategy A: re-download from MercadoLibre public API ────────────────
    if (listing.sourceProductId) {
      try {
        const mlRes = await imgCtx.get(
          `https://api.mercadolibre.com/items/${listing.sourceProductId}`,
          { timeout: 20_000, failOnStatusCode: false },
        );
        if (mlRes.status() === 200) {
          const mlData = await mlRes.json();
          const pictures: Array<{ url: string }> = mlData.pictures ?? [];
          if (pictures.length > 0) {
            const picUrl = pictures[0].url.replace(/-[A-Z]\.(jpg|jpeg|png|webp)/i, '-O.$1');
            const picRes = await imgCtx.get(picUrl, { timeout: 20_000, failOnStatusCode: false });
            if (picRes.status() === 200) {
              imageBuffer = Buffer.from(await picRes.body());
              contentType = picRes.headers()['content-type']?.split(';')[0] ?? 'image/jpeg';
              source = `ML`;
            }
          }
        }
      } catch (e) {
        console.log(`[fill] ML fetch failed: ${(e as Error).message}`);
      }
    }

    // ── Strategy B: loremflickr.com with title keywords ──────────────────────
    if (!imageBuffer) {
      try {
        const words = listing.title
          .toLowerCase()
          .replace(/[^a-záéíóúñü\s]/gi, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 2);
        const keyword = words.join(',') || 'product';
        const flickrUrl = `https://loremflickr.com/800/600/${encodeURIComponent(keyword)}/all`;
        const picRes = await imgCtx.get(flickrUrl, {
          timeout: 30_000,
          failOnStatusCode: false,
          maxRedirects: 5,
        });
        if (picRes.status() === 200) {
          imageBuffer = Buffer.from(await picRes.body());
          contentType = picRes.headers()['content-type']?.split(';')[0] ?? 'image/jpeg';
          source = `loremflickr:${keyword}`;
        }
      } catch (e) {
        console.log(`[fill] loremflickr failed: ${(e as Error).message}`);
      }
    }

    // ── Strategy C: picsum (deterministic seed from listing ID) ──────────────
    if (!imageBuffer) {
      try {
        const seed = listing.id.replace(/-/g, '').slice(0, 8);
        const picRes = await imgCtx.get(`https://picsum.photos/seed/${seed}/800/600`, {
          timeout: 20_000,
          failOnStatusCode: false,
          maxRedirects: 5,
        });
        if (picRes.status() === 200) {
          imageBuffer = Buffer.from(await picRes.body());
          contentType = 'image/jpeg';
          source = `picsum`;
        }
      } catch (e) {
        console.log(`[fill] picsum failed: ${(e as Error).message}`);
      }
    }

    if (!imageBuffer || imageBuffer.length < 500) {
      console.log(`[fill] SKIP "${listing.title}" — no image found`);
      failed++;
      continue;
    }

    // Enforce 5MB limit
    if (imageBuffer.length > 4.5 * 1024 * 1024) {
      console.log(`[fill] image too large (${Math.round(imageBuffer.length / 1024)}KB), skipping`);
      failed++;
      continue;
    }

    // ── Upload ────────────────────────────────────────────────────────────────
    try {
      const base64 = imageBuffer.toString('base64');
      const uploadRes = await api.post(`${API}/listings/${listing.id}/images/upload`, {
        headers: auth,
        data: { data: base64, mimetype: contentType },
        failOnStatusCode: false,
        timeout: 60_000,
      });
      if (uploadRes.status() === 201 || uploadRes.status() === 200) {
        console.log(
          `[fill] UPLOADED "${listing.title}" via ${source} (${Math.round(imageBuffer.length / 1024)}KB)`,
        );
        uploaded++;
      } else {
        const body = await uploadRes.text().catch(() => '');
        console.log(`[fill] UPLOAD FAILED ${uploadRes.status()} "${listing.title}": ${body.slice(0, 300)}`);
        failed++;
      }
    } catch (e) {
      console.log(`[fill] UPLOAD ERROR "${listing.title}": ${(e as Error).message}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  await imgCtx.dispose();
  await api.dispose();

  console.log(`\n[fill] ─── SUMMARY ───`);
  console.log(`[fill] Needed : ${noImages.length}`);
  console.log(`[fill] Uploaded: ${uploaded}`);
  console.log(`[fill] Failed  : ${failed}`);

  expect(failed).toBe(0);
});
