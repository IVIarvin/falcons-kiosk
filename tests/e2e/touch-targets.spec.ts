import { test, expect } from '@playwright/test';

test('les commandes de quantité et de voix sont accessibles au toucher à 320 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ajouter Chips paprika', exact: true }).click();
  async function target(selector: string) {
    for (const button of await page.locator(selector).all()) {
      const box = await button.boundingBox();
      expect.soft(box?.width, `${selector} : largeur tactile`).toBeGreaterThanOrEqual(44);
      expect.soft(box?.height, `${selector} : hauteur tactile`).toBeGreaterThanOrEqual(44);
    }
  }
  await target('.quantity button');
  await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: false }).click();
  await page.getByRole('heading', { name: 'Achat enregistré' }).waitFor();
  await expect(page.locator('.receipt-panel .voice-actions button')).toHaveCount(2);
  await target('.receipt-panel .voice-actions button');
});
