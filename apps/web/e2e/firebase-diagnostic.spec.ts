/**
 * Firebase diagnostic test for tradealo-web.vercel.app
 * Checks window.__FIREBASE_DIAGNOSTIC__ and window.__FIREBASE_CONFIG__
 * then optionally tests phone auth flow if apiKey is populated.
 * Run standalone: npx playwright test e2e/firebase-diagnostic.spec.ts --config playwright.diag.config.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Firebase deployment diagnostic', () => {
  test('read FIREBASE_DIAGNOSTIC and FIREBASE_CONFIG, test phone auth if apiKey present', async ({ page, context }) => {
    // Capture ALL console messages (not just errors)
    const allConsoleLogs: { type: string; text: string }[] = [];
    const networkRequests: { url: string; status: number; body: string }[] = [];

    page.on('console', (msg) => {
      allConsoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      allConsoleLogs.push({ type: 'pageerror', text: err.message });
    });

    // Capture ALL identitytoolkit requests + responses
    page.on('request', (req) => {
      if (req.url().includes('identitytoolkit.googleapis.com')) {
        console.log(`  [NETWORK REQ] ${req.method()} ${req.url()}`);
      }
    });

    page.on('response', async (response) => {
      if (response.url().includes('identitytoolkit.googleapis.com')) {
        let body = '';
        try {
          body = await response.text();
        } catch {
          body = '<could not read body>';
        }
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          body,
        });
      }
    });

    // Force fresh load — clear cookies, storage, cache headers
    await context.clearCookies();

    console.log('=== Navigating to login page (fresh load, cache-busted) ===');
    // Add cache-busting query param AND set no-cache headers
    await page.route('**/*', (route) => {
      route.continue({
        headers: {
          ...route.request().headers(),
          'cache-control': 'no-cache, no-store',
          'pragma': 'no-cache',
        },
      });
    });

    await page.goto(`https://tradealo-web.vercel.app/login?_t=${Date.now()}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Extra wait for any async script execution
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/tmp/firebase-diag-01-loaded.png', fullPage: true });
    console.log('Screenshot saved: /tmp/firebase-diag-01-loaded.png');

    // ── Step 1: Read __FIREBASE_DIAGNOSTIC__ verbatim ────────────────────────
    const diagnostic = await page.evaluate(() => {
      return (window as any).__FIREBASE_DIAGNOSTIC__ ?? null;
    });

    console.log('\n=== window.__FIREBASE_DIAGNOSTIC__ (verbatim) ===');
    console.log(JSON.stringify(diagnostic, null, 2));
    if (diagnostic) {
      console.log(`  fileFound      : ${diagnostic.fileFound}`);
      console.log(`  apiKeyEnvLen   : ${diagnostic.apiKeyEnvLen}`);
    }

    // ── Step 2: Read __FIREBASE_CONFIG__ ─────────────────────────────────────
    const firebaseConfig = await page.evaluate(() => {
      return (window as any).__FIREBASE_CONFIG__ ?? null;
    });

    console.log('\n=== window.__FIREBASE_CONFIG__ analysis ===');

    let apiKey = '';
    let startsWithAIzaSy = false;

    if (firebaseConfig) {
      apiKey = firebaseConfig.apiKey ?? '';
      const apiKeyFirst10 = apiKey.substring(0, 10);
      startsWithAIzaSy = apiKey.startsWith('AIzaSy');

      const apiKeyNonEmpty = apiKey.length > 0;
      const authDomainNonEmpty = !!(firebaseConfig.authDomain && String(firebaseConfig.authDomain).length > 0);
      const projectIdNonEmpty = !!(firebaseConfig.projectId && String(firebaseConfig.projectId).length > 0);
      const appIdNonEmpty = !!(firebaseConfig.appId && String(firebaseConfig.appId).length > 0);
      const allFourNonEmpty = apiKeyNonEmpty && authDomainNonEmpty && projectIdNonEmpty && appIdNonEmpty;

      console.log(`  apiKey (first 10 chars)       : "${apiKeyFirst10}"`);
      console.log(`  apiKey starts with "AIzaSy"   : ${startsWithAIzaSy}`);
      console.log(`  apiKey non-empty              : ${apiKeyNonEmpty}`);
      console.log(`  authDomain non-empty          : ${authDomainNonEmpty}  (${firebaseConfig.authDomain ?? '(empty)'})`);
      console.log(`  projectId non-empty           : ${projectIdNonEmpty}  (${firebaseConfig.projectId ?? '(empty)'})`);
      console.log(`  appId non-empty               : ${appIdNonEmpty}  (${(firebaseConfig.appId ?? '').substring(0, 20)}...)`);
      console.log(`  ALL 4 fields non-empty        : ${allFourNonEmpty}`);
    } else {
      console.log('  __FIREBASE_CONFIG__ is null/undefined');
    }

    // ── Step 3: Conditional phone auth flow ───────────────────────────────────
    if (apiKey && startsWithAIzaSy) {
      console.log('\n=== apiKey IS populated — proceeding with phone auth flow ===');

      // Reset captured logs for the interaction phase
      allConsoleLogs.length = 0;

      // Find and click "Continuar con celular"
      const phoneButton = page.getByRole('button', { name: /continuar con celular/i });
      const phoneButtonAlt = page
        .locator('button')
        .filter({ hasText: /celular|teléfono|phone/i })
        .first();

      let buttonClicked = false;
      if (await phoneButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await phoneButton.click();
        buttonClicked = true;
        console.log('  Clicked "Continuar con celular" (by role)');
      } else if (await phoneButtonAlt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await phoneButtonAlt.click();
        buttonClicked = true;
        console.log('  Clicked phone button (by filter)');
      } else {
        const buttons = await page.locator('button').allTextContents();
        console.log('  Could not find phone button. All visible button texts:', JSON.stringify(buttons));
      }

      if (buttonClicked) {
        await page.waitForTimeout(1500);
        await page.screenshot({ path: '/tmp/firebase-diag-02-after-phone-click.png', fullPage: true });
        console.log('  Screenshot: /tmp/firebase-diag-02-after-phone-click.png');

        // Wait for phone input
        const phoneInput = page
          .locator('input[type="tel"], input[placeholder*="teléfono"], input[placeholder*="phone"], input[placeholder*="celular"], input[name*="phone"], dialog input, [role="dialog"] input')
          .first();

        const inputVisible = await phoneInput.isVisible({ timeout: 8000 }).catch(() => false);
        if (inputVisible) {
          await phoneInput.fill('+5491112345678');
          console.log('  Entered phone: +5491112345678');
          await page.screenshot({ path: '/tmp/firebase-diag-03-phone-entered.png', fullPage: true });

          // Click "Enviar código"
          const sendBtn = page.getByRole('button', { name: /enviar código|enviar|send code/i });
          const sendBtnAlt = page.locator('button[type="submit"]').first();

          if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await sendBtn.click();
            console.log('  Clicked "Enviar código"');
          } else if (await sendBtnAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
            await sendBtnAlt.click();
            console.log('  Clicked submit button (fallback)');
          } else {
            await phoneInput.press('Enter');
            console.log('  Pressed Enter to submit');
          }

          // Wait 10 seconds as requested
          console.log('  Waiting 10 seconds for Firebase response...');
          await page.waitForTimeout(10000);

          await page.screenshot({ path: '/tmp/firebase-diag-04-after-send.png', fullPage: true });
          console.log('  Screenshot: /tmp/firebase-diag-04-after-send.png');

          // Check for toast / alert messages
          const toastLocators = [
            '[role="alert"]',
            '[data-sonner-toast]',
            '.Toastify__toast',
            '[class*="toast"]',
            '[class*="Toast"]',
            '[class*="alert"]',
            '[class*="Alert"]',
            '[class*="error"]',
            '[class*="Error"]',
          ];
          const toastTexts: string[] = [];
          for (const sel of toastLocators) {
            const texts = await page.locator(sel).allTextContents().catch(() => []);
            toastTexts.push(...texts.filter((t) => t.trim().length > 0));
          }
          console.log('\n  Toast/alert messages found:', toastTexts.length > 0 ? toastTexts : '(none)');

          // Check for reCAPTCHA
          const recaptchaVisible = await page
            .locator('iframe[src*="recaptcha"], .g-recaptcha, #recaptcha-container, [id*="recaptcha"], div[class*="recaptcha"]')
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);
          console.log(`  reCAPTCHA challenge visible: ${recaptchaVisible}`);

          // Modal/dialog final state
          const dialogText = await page.evaluate(() => {
            const els = document.querySelectorAll('dialog, [role="dialog"], [class*="modal"], [class*="Modal"]');
            return Array.from(els).map((e) => (e as HTMLElement).innerText).join('\n---\n');
          });
          if (dialogText.trim()) {
            console.log('\n  Dialog/modal text after send:', dialogText.substring(0, 500));
          }

        } else {
          console.log('  Phone input NOT visible after clicking button');
          // Dump all inputs visible on page
          const inputDump = await page.evaluate(() =>
            Array.from(document.querySelectorAll('input')).map((i) => ({
              type: i.type, placeholder: i.placeholder, name: i.name, id: i.id,
              visible: (i as HTMLElement).offsetParent !== null,
            }))
          );
          console.log('  Inputs on page:', JSON.stringify(inputDump, null, 2));
          const bodyExcerpt = await page.locator('body').innerText().catch(() => '');
          console.log('  Body text excerpt:', bodyExcerpt.substring(0, 600));
        }
      }

      // ── Network requests to identitytoolkit ──────────────────────────────
      console.log('\n=== identitytoolkit.googleapis.com requests ===');
      if (networkRequests.length === 0) {
        console.log('  None captured');
      } else {
        for (const req of networkRequests) {
          console.log(`  URL    : ${req.url}`);
          console.log(`  Status : ${req.status}`);
          // Always show body (crucial for diagnosing errors)
          console.log(`  Body   : ${req.body.substring(0, 1000)}`);
          console.log('  ---');
        }
      }

      // ── Console messages ─────────────────────────────────────────────────
      console.log('\n=== All console messages (during interaction) ===');
      if (allConsoleLogs.length === 0) {
        console.log('  (none)');
      } else {
        for (const log of allConsoleLogs) {
          console.log(`  [${log.type.toUpperCase()}] ${log.text.substring(0, 300)}`);
        }
      }

    } else {
      console.log('\n=== apiKey is empty/missing — stopping (no phone auth test) ===');

      // Still report any console errors
      console.log('\n=== Console errors collected during load ===');
      const errors = allConsoleLogs.filter((l) => l.type === 'error' || l.type === 'pageerror');
      if (errors.length === 0) {
        console.log('  (none)');
      } else {
        for (const e of errors) {
          console.log(`  [${e.type.toUpperCase()}] ${e.text}`);
        }
      }
    }

    await page.screenshot({ path: '/tmp/firebase-diag-final.png', fullPage: true });
    console.log('\nFinal screenshot: /tmp/firebase-diag-final.png');

    // Diagnostic test — always passes, results are in stdout
    expect(true).toBe(true);
  });
});
