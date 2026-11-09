import { test, expect } from '@playwright/test';

test('RAVIT reste sur une ligne sans empiéter sur les actions mobiles', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const wordmark = page.locator('.mobile-header .brand > span');
  for (const width of [375, 320, 360, 390, 414, 760]) {
    await page.setViewportSize({ width, height: 844 });
    const lines = await wordmark.evaluate((el) => {
      const text = document.createRange();
      text.selectNodeContents(el);
      return text.getClientRects().length;
    });
    expect(lines, `Le nom tient sur une seule ligne à ${width}px`).toBe(1);
    await expect(wordmark).toHaveText('RAVIT');
    const logo = (await page.locator('.mobile-header .brand').boundingBox())!;
    const actions = (await page.locator('.mobile-header-actions').boundingBox())!;
    expect(
      logo.x + logo.width,
      `Le logo ne chevauche pas les actions à ${width}px`,
    ).toBeLessThanOrEqual(actions.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.short_name).toBe('RAVIT');
  await expect(page).toHaveTitle('RAVIT — kiosque des Falcons');
});
