import { test, expect } from '@playwright/test';
test('cherche vite, filtre quatre familles et conserve tout le panier', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000002');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  const snapshot = (await (await page.request.get('/api/state')).json()).data;
  const base = snapshot.products[0];
  const products = [
    {
      ...base,
      id: 'browse-cola',
      name: 'Coca-Cola Zéro',
      category: 'Boissons sans alcool',
      price_cents: 200,
    },
    {
      ...base,
      id: 'browse-beer',
      name: 'Bière blonde',
      category: 'Boissons alcoolisées',
      price_cents: 300,
    },
    {
      ...base,
      id: 'browse-salt',
      name: 'Chips paprika',
      category: 'Snacks salés',
      price_cents: 200,
    },
    {
      ...base,
      id: 'browse-sweet',
      name: 'Barre chocolatée',
      category: 'Snacks sucrés',
      price_cents: 150,
    },
  ];
  await page.route('**/api/state', (route) =>
    route.fulfill({ json: { ok: true, data: { ...snapshot, products } } }),
  );
  await page.goto('/');
  const filters = page.getByRole('group', { name: 'Catégories', exact: true });
  await expect(filters.getByRole('button')).toHaveCount(5);
  const search = page.getByRole('searchbox', { name: 'Rechercher un produit' });
  await search.fill('cocacola zero');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ajouter Coca-Cola Zéro', exact: true }).click();
  await search.fill('');
  await filters.getByRole('button', { name: 'Snacks sucrés', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ajouter Barre chocolatée', exact: true }).click();
  await expect(page.locator('.basket-bar')).toContainText('2 articles');
  await expect(page.locator('.basket-bar')).toContainText('CHF 3.50');
  await search.fill('introuvable');
  await expect(page.getByRole('heading', { name: 'Aucun produit trouvé.' })).toBeVisible();
  await page.getByRole('button', { name: 'Tout afficher', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(4);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
  let captured: { lines: { productId: string }[] } | undefined;
  await page.route('**/api/action', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'checkout') {
      captured = body.data;
      await route.fulfill({
        json: {
          ok: true,
          data: {
            id: 'browse-receipt',
            totalCents: 350,
            balanceCents: 350,
            quoteId: null,
            replay: false,
          },
        },
      });
    } else await route.abort();
  });
  await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Achat enregistré', exact: true })).toBeVisible();
  expect(captured?.lines.map((l) => l.productId).sort()).toEqual(['browse-cola', 'browse-sweet']);
});
