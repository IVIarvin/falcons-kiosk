import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await page.goto('/admin/produits');
});
test('importe une référence illustrée, corrige les caractéristiques et conserve le prix saisi', async ({
  page,
}) => {
  const suggestion = {
    code: '5449000000996',
    name: 'Coca-Cola Original QA',
    unit: '330 ml',
    brand: 'Coca-Cola',
    category: 'Boissons',
    is_beverage: true,
    image:
      'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.400.jpg',
    details: {
      kind: 'soda',
      sugar: 'present',
      alcohol: 'none',
      caffeine: 'unknown',
      sugarsPer100: 10.6,
      alcoholPercent: 0,
      source: {
        code: '5449000000996',
        image:
          'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.400.jpg',
      },
    },
  };
  await page.route('**/api/action', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'searchProducts' || body.action === 'lookupProduct')
      return route.fulfill({
        json: { ok: true, data: body.action === 'searchProducts' ? [suggestion] : suggestion },
      });
    await route.continue();
  });
  await page.getByRole('button', { name: 'Ajouter un produit' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom', { exact: true }).fill('coca cola');
  await dialog.getByLabel('Prix de vente au kiosque (CHF)', { exact: false }).fill('2.50');
  await dialog.getByRole('button', { name: 'Rechercher une référence' }).click();
  await dialog.getByRole('button', { name: /Choisir Coca-Cola Original QA/ }).click();
  await expect(dialog.getByLabel('Nom', { exact: true })).toHaveValue(suggestion.name);
  await expect(dialog.getByLabel('Catégorie', { exact: true })).toHaveValue('Boissons sans alcool');
  await expect(dialog.getByLabel('Prix de vente au kiosque (CHF)', { exact: false })).toHaveValue(
    '2.50',
  );
  await dialog.getByText('Options du produit', { exact: true }).click();
  await expect(dialog.getByLabel('Contient du sucre')).toHaveValue('present');
  await dialog.getByLabel('Contient de la caféine').selectOption('present');
  await expect(dialog.getByRole('link', { name: /Open Food Facts/ }).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Enregistrer le produit' }).click();
  await expect(dialog).not.toBeVisible();
  const snapshot = (await (await page.request.get('/api/state')).json()).data;
  const saved = snapshot.products.find((p: { name: string }) => p.name === suggestion.name);
  expect(saved.details.caffeine).toBe('present');
  expect(saved.price_cents).toBe(250);
  expect(saved.image).toBe(suggestion.image);
  await page
    .getByRole('button', { name: `Modifier ${suggestion.name}`, exact: true })
    .last()
    .click();
  await page.getByRole('dialog').getByText('Options du produit', { exact: true }).click();
  await expect(page.getByLabel('Contient de la caféine')).toHaveValue('present');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
});
test('la panne de recherche permet la création libre et une photo cassée affiche un secours', async ({
  page,
}) => {
  await page.route('**/api/action', async (route) => {
    if (route.request().postDataJSON().action === 'searchProducts')
      return route.fulfill({
        status: 503,
        json: {
          ok: false,
          code: 'LOOKUP_UNAVAILABLE',
          message: 'La recherche est indisponible. Continue en saisie libre.',
        },
      });
    await route.continue();
  });
  await page.getByRole('button', { name: 'Ajouter un produit' }).click();
  const dialog = page.getByRole('dialog');
  const name = `Libre ${Date.now()}`;
  await dialog.getByLabel('Nom', { exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Rechercher une référence' }).click();
  await expect(dialog.getByRole('alert')).toContainText('saisie libre');
  await dialog.getByLabel('Prix de vente au kiosque (CHF)', { exact: false }).fill('1.00');
  await dialog.getByLabel('Catégorie', { exact: true }).selectOption('Snacks sucrés');
  await dialog.getByText('Options du produit', { exact: true }).click();
  await dialog
    .getByLabel('Image du produit', { exact: true })
    .fill('/products/photo-inexistante.png');
  await expect(dialog.getByRole('img', { name: 'Image indisponible' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Enregistrer le produit' }).click();
  await expect(dialog).not.toBeVisible();
});
test('consulte les répliques actives de Piller par thème', async ({ page }) => {
  await page.goto('/admin/reglages');
  await page.getByRole('button', { name: 'Voir les 60 répliques' }).click();
  const dialog = page.getByRole('dialog', { name: 'Le répertoire de Piller' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Thème des répliques').selectOption('energy');
  await expect(
    dialog.getByText('Deux cents chevaux dans la canette. Un demi-âne derrière.'),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Écouter la réplique' })).toHaveCount(6);
});
