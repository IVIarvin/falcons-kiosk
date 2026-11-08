import { test, expect } from '@playwright/test';

test('administration mobile et formulaire produit compréhensible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.locator('.mobile-header').getByRole('link', { name: 'Administration' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.admin-shell')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('link', { name: 'Membres' })
    .click();
  await expect(page.getByRole('heading', { name: 'Membres et admins' })).toBeVisible();
  const member = page.getByRole('row').filter({ hasText: 'Martin Démo' });
  await member.getByRole('button', { name: 'Gérer', exact: true }).click();
  await page.getByLabel('Rôle', { exact: false }).selectOption('admin');
  await page.getByRole('button', { name: 'Enregistrer les accès' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(member).toContainText('Administrateur');
  await member.getByRole('button', { name: 'Gérer', exact: true }).click();
  await page.getByLabel('Rôle', { exact: false }).selectOption('member');
  await page.getByRole('button', { name: 'Enregistrer les accès' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(member.getByRole('cell').nth(2)).toContainText('Membre');
  await page.setViewportSize({ width: 320, height: 780 });
  await expect(member.getByRole('button', { name: 'Gérer', exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/produits');
  await page.getByRole('button', { name: 'Ajouter un produit' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Unité de vente')).toHaveCount(0);
  await expect(dialog.getByLabel('C’est une boisson')).toHaveCount(0);
  await expect(dialog.getByLabel('Disponible au kiosque')).toHaveCount(0);
  await dialog.getByLabel('Catégorie', { exact: true }).selectOption('Snacks');
  await dialog.getByLabel('Prix d’achat par article (CHF)', { exact: false }).fill('1.20');
  await dialog.getByLabel('Prix de vente au kiosque (CHF)', { exact: false }).fill('2.00');
  await expect(dialog.getByRole('status', { name: 'Écart par article' })).toContainText('CHF 0.80');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
});

test('un membre retire une partie de sa consommation avec confirmation et reprise réseau', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inscription');
  await page.getByLabel('Grade', { exact: true }).fill('Sdt');
  await page.getByLabel('Nom', { exact: true }).fill(`Retrait QA ${Date.now()}`);
  await page
    .getByLabel('Numéro de téléphone')
    .fill(`079${String(Date.now() % 10000000).padStart(7, '0')}`);
  await page.getByLabel('Choisis un mot de passe').fill('Falcons-test-2026!');
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await expect(
    page.locator('.mobile-header').getByRole('link', { name: 'Administration' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Ajouter Eau minérale', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter un Eau minérale', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Achat enregistré' })).toBeVisible();
  await page.goto('/ardoise');
  await expect(page.locator('.account-balance>strong')).toHaveText('CHF 2.00');
  await page.getByRole('button', { name: 'Retirer Eau minérale de mon ardoise' }).click();
  const dialog = page.getByRole('dialog', { name: 'Retirer de ton ardoise' });
  await expect(dialog).toContainText('T’es sûr ? Si tu mens, on te retrouvera.');
  await page.route('**/api/action', async (route) => {
    if (route.request().postDataJSON().action === 'removeConsumptionLine') {
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Confirmer le retrait' }).click();
  await expect(dialog.getByRole('button', { name: 'Retrouver le retrait' })).toBeVisible();
  await page.unroute('**/api/action');
  await dialog.getByRole('button', { name: 'Retrouver le retrait' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.account-balance>strong')).toHaveText('CHF 1.00');
  await expect(page.locator('.ledger-detail')).toContainText('1 retiré');
});
