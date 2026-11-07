import { test, expect } from '@playwright/test';
test('crée un produit automatique, enregistre un achat et publie les prix séparément', async ({
  page,
}) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await page.goto('/admin/produits');
  await page.getByRole('button', { name: 'Ajouter un produit' }).click();
  const name = `Produit QA ${Date.now()}`;
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: /^Nom\b/ }).fill(name);
  await dialog.getByLabel('Prix de vente (CHF)', { exact: true }).fill('1.00');
  await dialog.getByLabel('Mode de prix').selectOption('auto');
  await dialog.getByLabel('Coût unitaire de référence (CHF)', { exact: false }).fill('1.000000');
  await dialog.getByRole('button', { name: 'Enregistrer le produit' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Vérifier les prix' }).click();
  await page.getByRole('button', { name: 'Publier ces prix' }).click();
  await expect(page.getByRole('row').filter({ hasText: name })).toContainText('CHF 1.30');
  const snapshot = (await (await page.request.get('/api/state')).json()).data;
  const product = snapshot.products.find((p: { name: string }) => p.name === name);
  await page.goto('/admin/achats');
  await page.getByRole('button', { name: 'Enregistrer un achat' }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Produit', exact: true })
    .selectOption(product.id);
  await page.getByLabel('Total payé (CHF)').fill('48.00');
  await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const after = (await (await page.request.get('/api/state')).json()).data;
  expect(after.products.find((p: { id: string }) => p.id === product.id).price_cents).toBe(130);
  expect(after.priceChanges).toBeUndefined();
  expect(after.admin.priceChanges[0].newPriceCents).toBe(260);
  await page.getByRole('button', { name: 'Vérifier les prix' }).click();
  await page.getByRole('button', { name: 'Publier ces prix' }).click();
  await page.goto('/admin/produits');
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toContainText('CHF 2.60');
  await row.getByRole('button', { name: `Modifier ${name}` }).click();
  await page.getByLabel('Visible dans le catalogue').uncheck();
  await page.getByRole('button', { name: 'Enregistrer le produit' }).click();
  await expect(row).toContainText('Désactivé');
  await page.goto('/');
  await expect(page.locator('.product-card').filter({ hasText: name })).toHaveCount(0);
});
