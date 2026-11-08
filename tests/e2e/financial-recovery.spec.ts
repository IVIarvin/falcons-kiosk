import { test, expect } from '@playwright/test';
test('retrouve achats et dépenses après réponse perdue et annule une dépense sans effacer son historique', async ({
  page,
}) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  const state = async () => (await (await page.request.get('/api/state')).json()).data;
  const before = await state();
  const product = before.products.find((p: { name: string }) => p.name === 'Rivella rouge');
  async function lose(action: string) {
    await page.route('**/api/action', async (route) => {
      if (route.request().postDataJSON().action === action) {
        await route.fetch();
        await route.abort('failed');
      } else await route.continue();
    });
  }
  await page.goto('/admin/achats');
  await page.getByRole('button', { name: 'Enregistrer un achat', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Produit', exact: true })
    .selectOption(product.id);
  await page.getByLabel('Prix d’achat total payé (CHF)', { exact: false }).fill('24.00');
  await lose('purchase');
  await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Connexion interrompue.', { exact: false })).toBeVisible();
  await page.unroute('**/api/action');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Retrouver l’achat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retrouver l’achat', exact: true })).toHaveCount(0);
  expect((await state()).admin.purchases.length - before.admin.purchases.length).toBe(1);
  await page.goto('/admin/finance');
  await page.getByRole('button', { name: 'Autre dépense' }).click();
  const name = `Dépense QA ${Date.now()}`;
  await page.getByLabel('Motif', { exact: true }).fill(name);
  await page.getByLabel('Montant (CHF)', { exact: true }).fill('10.00');
  await lose('expense');
  await page.getByRole('button', { name: 'Enregistrer la dépense', exact: true }).click();
  await expect(page.getByText('Connexion interrompue.', { exact: false })).toBeVisible();
  await page.unroute('**/api/action');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Retrouver la dépense', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retrouver la dépense', exact: true })).toHaveCount(
    0,
  );
  expect(
    (await state()).admin.expenses.filter((e: { reason: string }) => e.reason === name),
  ).toHaveLength(1);
  await page.getByRole('button', { name: `Annuler la dépense ${name}`, exact: true }).click();
  await page.getByLabel('Motif d’annulation').fill('Erreur de saisie vérifiée');
  await page.getByRole('button', { name: 'Confirmer l’annulation', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toContainText('Annulée');
  expect((await state()).admin.financial.expensesCents).toBe(before.admin.financial.expensesCents);
});
