import { test, expect } from '@playwright/test';

/**
 * Firebase config verification — checks if the Node pre-build script
 * successfully wrote firebase-config.generated.json before next build.
 *
 * Target: https://tradealo-web.vercel.app/login
 */

const TARGET_URL = 'https://tradealo-web.vercel.app/login';

test.describe('Firebase config pre-build fix verification', () => {
  test('HTML + runtime + phone flow', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkRequests: Array<{
      url: string;
      status: number | null;
      body: string;
    }> = [];

    // ── Collect console errors ──────────────────────────────────────────────
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ── Intercept Firebase identity toolkit requests ─────────────────────────
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('identitytoolkit.googleapis.com')) {
        let body = '';
        try {
          body = await response.text();
        } catch {
          body = '<could not read body>';
        }
        networkRequests.push({
          url,
          status: response.status(),
          body,
        });
      }
    });

    // ── Navigate ────────────────────────────────────────────────────────────
    console.log(`\nNavigating to ${TARGET_URL} ...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30_000 });
    console.log('Page loaded (networkidle).');

    // ── 1. HTML CHECK ────────────────────────────────────────────────────────
    const html = await page.content();

    // Find the <script> tag containing window.__FIREBASE_CONFIG__
    const scriptTagMatch = html.match(
      /<script[^>]*>[\s\S]*?window\.__FIREBASE_CONFIG__[\s\S]*?<\/script>/
    );

    console.log('\n==================================================');
    console.log('1. HTML CHECK -- <script> with window.__FIREBASE_CONFIG__');
    console.log('==================================================');
    if (scriptTagMatch) {
      console.log('FOUND:\n', scriptTagMatch[0]);
    } else {
      console.log('NOT FOUND in page HTML. Searching for partial match...');
      const idx = html.indexOf('__FIREBASE_CONFIG__');
      if (idx !== -1) {
        const snippet = html.substring(Math.max(0, idx - 100), idx + 500);
        console.log('PARTIAL MATCH (context):\n', snippet);
      } else {
        console.log('No mention of __FIREBASE_CONFIG__ found in HTML at all.');
      }
    }

    // ── 2. RUNTIME CHECK ─────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('2. RUNTIME CHECK -- window.__FIREBASE_CONFIG__');
    console.log('==================================================');

    const firebaseConfig = await page.evaluate(() => {
      const cfg = (window as unknown as { __FIREBASE_CONFIG__?: Record<string, string> }).__FIREBASE_CONFIG__;
      if (!cfg) return null;
      return {
        apiKeyPrefix: typeof cfg.apiKey === 'string' ? cfg.apiKey.substring(0, 8) : null,
        apiKeyRaw: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        appId: cfg.appId,
        fullObject: {
          apiKey: typeof cfg.apiKey === 'string' ? cfg.apiKey.substring(0, 8) + '...[truncated]' : cfg.apiKey,
          authDomain: cfg.authDomain,
          projectId: cfg.projectId,
          appId: cfg.appId,
        },
      };
    });

    if (!firebaseConfig) {
      console.log('window.__FIREBASE_CONFIG__ is UNDEFINED or NULL at runtime.');
    } else {
      const startsWithAIzaSy = typeof firebaseConfig.apiKeyRaw === 'string' && firebaseConfig.apiKeyRaw.startsWith('AIzaSy');
      const allFieldsPopulated =
        !!firebaseConfig.apiKeyRaw &&
        !!firebaseConfig.authDomain &&
        !!firebaseConfig.projectId &&
        !!firebaseConfig.appId;

      console.log('Full object (apiKey truncated):');
      console.log(JSON.stringify(firebaseConfig.fullObject, null, 2));
      console.log(`\napiKey starts with "AIzaSy": ${startsWithAIzaSy}`);
      console.log(`All four fields non-empty:   ${allFieldsPopulated}`);
      console.log(`  apiKey     -> "${firebaseConfig.apiKeyPrefix}..." (empty: ${!firebaseConfig.apiKeyRaw})`);
      console.log(`  authDomain -> "${firebaseConfig.authDomain}" (empty: ${!firebaseConfig.authDomain})`);
      console.log(`  projectId  -> "${firebaseConfig.projectId}" (empty: ${!firebaseConfig.projectId})`);
      console.log(`  appId      -> "${firebaseConfig.appId}" (empty: ${!firebaseConfig.appId})`);

      // ── 3. PHONE FLOW (only if apiKey is populated) ──────────────────────
      if (startsWithAIzaSy && allFieldsPopulated) {
        console.log('\n==================================================');
        console.log('3. PHONE FLOW TEST');
        console.log('==================================================');
        console.log('apiKey is populated -- proceeding with phone flow.');

        // Click "Continuar con celular"
        const phoneButton = page.getByText('Continuar con celular');
        await expect(phoneButton).toBeVisible({ timeout: 10_000 });
        await phoneButton.click();
        console.log('Clicked "Continuar con celular".');

        // Wait for phone input to appear — try multiple possible selectors
        const phoneInput = page.locator(
          'input[type="tel"], input[placeholder*="celular"], input[placeholder*="telefono"], input[placeholder*="phone"], input[placeholder*="+54"]'
        ).first();
        await expect(phoneInput).toBeVisible({ timeout: 8_000 });

        await phoneInput.fill('+5491112345678');
        console.log('Typed +5491112345678 into phone input.');

        // Click "Enviar codigo"
        const sendButton = page.getByText('Enviar código');
        await expect(sendButton).toBeVisible({ timeout: 5_000 });
        await sendButton.click();
        console.log('Clicked "Enviar codigo".');

        // Wait 8 seconds for response
        await page.waitForTimeout(8_000);
        console.log('Waited 8 seconds.');

        // Capture toast / alert text
        const possibleToastSelectors = [
          '[data-testid="toast"]',
          '[role="alert"]',
          '.toast',
          '.Toastify',
          '[class*="toast"]',
          '[class*="notification"]',
          '[class*="snackbar"]',
          '[aria-live="polite"]',
          '[aria-live="assertive"]',
        ];

        console.log('\nToast / alert scan:');
        for (const sel of possibleToastSelectors) {
          try {
            const els = await page.locator(sel).all();
            for (const el of els) {
              const txt = await el.innerText().catch(() => '');
              if (txt.trim()) {
                console.log(`  [${sel}] -> "${txt.trim()}"`);
              }
            }
          } catch {
            // selector not present — skip silently
          }
        }

        // Screenshot
        await page.screenshot({
          path: '/c/Users/user/Documents/trocalia/apps/web/test-results/firebase-phone-flow.png',
          fullPage: true,
        });
        console.log('\nScreenshot saved: test-results/firebase-phone-flow.png');

      } else {
        console.log('\n==================================================');
        console.log('3. PHONE FLOW SKIPPED -- apiKey is empty or invalid.');
        console.log('==================================================');
      }
    }

    // ── 4. CONSOLE ERRORS ────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('4. CONSOLE ERRORS');
    console.log('==================================================');
    if (consoleErrors.length === 0) {
      console.log('No console errors detected.');
    } else {
      consoleErrors.forEach((e, i) => console.log(`  [${i + 1}] ${e}`));
    }

    // ── 5. NETWORK -- identitytoolkit ────────────────────────────────────────
    console.log('\n==================================================');
    console.log('5. NETWORK REQUESTS -- identitytoolkit.googleapis.com');
    console.log('==================================================');
    if (networkRequests.length === 0) {
      console.log('No requests to identitytoolkit.googleapis.com captured.');
    } else {
      networkRequests.forEach((r, i) => {
        console.log(`\n  [${i + 1}] ${r.url}`);
        console.log(`       Status: ${r.status}`);
        const bodySnippet =
          r.body.length > 2000 ? r.body.substring(0, 2000) + '...[truncated]' : r.body;
        console.log(`       Body: ${bodySnippet}`);
      });
    }

    // Investigation spec always passes — results are in console output
    expect(true).toBe(true);
  });
});
