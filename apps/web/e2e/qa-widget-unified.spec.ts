import { test, expect } from '@playwright/test';

const LISTING_ID = '1758f4b1-5e06-4a6e-a416-10614d7ca210'; // Audi a4 tsi — has 4 answered Q&As

test('Q&A widget renders question + answer inside the same card', async ({ page }) => {
  const url = `/listing/${LISTING_ID}?t=${Date.now()}`;
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  expect(response?.ok()).toBeTruthy();

  await expect(
    page.getByRole('heading', { name: /Preguntas y respuestas/i }),
  ).toBeVisible();

  await expect(
    page.getByText('cuantos kilometros tiene?', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Tiene 65.000 km', { exact: true }),
  ).toBeVisible();

  // Structural check: the question and its answer share the same outer card.
  const card = page
    .locator('div.bg-white.rounded-xl.border')
    .filter({ hasText: 'cuantos kilometros tiene?' });
  await expect(card).toBeVisible();
  await expect(card.getByText('Tiene 65.000 km')).toBeVisible();

  const allCardsHoldingPair = page.locator('div.bg-white.rounded-xl.border').filter({
    hasText: /cuantos kilometros tiene\?|Tiene 65\.000 km/,
  });
  expect(await allCardsHoldingPair.count()).toBe(1);

  // Old style had `border-l-2` on the answer block — must be gone.
  const oldAnswerBlock = page.locator('.border-l-2.border-tradealo-primary');
  expect(await oldAnswerBlock.count()).toBe(0);

  // Capture only the widget card so the comparison is unambiguous.
  await page
    .getByRole('heading', { name: /Preguntas y respuestas/i })
    .scrollIntoViewIfNeeded();
  const widget = page
    .locator('div.border-t.border-tradealo-border.pt-6')
    .filter({ hasText: 'Preguntas y respuestas' });
  await widget.screenshot({ path: 'qa-widget.png' });
});
