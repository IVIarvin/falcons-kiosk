import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, phone: string) {
  await page.route('**/api/action', async (route) => {
    if (['login', 'ledger'].includes(route.request().postDataJSON()?.action))
      await route.continue();
    else await route.abort();
  });
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill(phone);
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  return (await (await page.request.get('/api/state')).json()).data;
}

test('le catalogue combine recherche, catégorie et état avec une sortie des résultats vides', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const snapshot = await login(page, '0790000001');
  const template = snapshot.products[0];
  const products = [
    { ...template, id: 'ux-water', name: 'Eau minérale', category: 'Eaux', active: true },
    { ...template, id: 'ux-cola', name: 'Coca-Cola', category: 'Sodas', active: true },
    { ...template, id: 'ux-chips', name: 'Chips paprika', category: 'Snacks', active: false },
  ];
  await page.route('**/api/state', (route) =>
    route.fulfill({ json: { ok: true, data: { ...snapshot, products } } }),
  );
  await page.goto('/admin/produits');
  const search = page.getByRole('searchbox', { name: 'Rechercher un produit' });
  await expect(search).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Modifier Chips paprika', exact: true }),
  ).toHaveCount(0);
  await search.fill('EAU minerale');
  await expect(page.locator('.products-table tbody tr')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Modifier Eau minérale', exact: true }),
  ).toBeVisible();
  await search.fill('');
  await page.getByRole('combobox', { name: 'Catégorie des produits', exact: true }).selectOption('Sodas');
  await expect(page.locator('.products-table tbody tr')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'État des produits', exact: true }).selectOption('inactive');
  await expect(page.getByText('Aucun produit ne correspond.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voir tous les produits', exact: true }).click();
  await expect(page.locator('.products-table tbody tr')).toHaveCount(3);
  await page.getByRole('combobox', { name: 'État des produits', exact: true }).selectOption('inactive');
  await expect(page.locator('.products-table tbody tr')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Modifier Chips paprika', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Réinitialiser les filtres', exact: true }).click();
  await expect(page.locator('.products-table tbody tr')).toHaveCount(2);
  for (const route of ['/admin/finance', '/admin/documents']) {
    await page.goto(route);
    const more = page
      .getByRole('navigation', { name: 'Navigation mobile' })
      .getByRole('link', { name: /^Plus/ });
    await expect(more).toHaveAttribute('aria-current', 'location');
    await expect(more).toHaveClass(/active/);
  }
});

test('Falcons montre le membre avant la liste et les dialogues rendent le focus au déclencheur', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const snapshot = await login(page, '0790000002');
  const own = {
    id: snapshot.user.id,
    name: snapshot.user.name,
    grade: snapshot.user.grade,
    score: 700,
    rank: 2,
  };
  const community = {
    ...snapshot.community,
    contributors: [{ ...own, id: 'ux-other', name: 'Autre Falcon', rank: 1, score: 1000 }, own],
    allTime: [own],
    drinks: [],
    badges: [
      { type: 'first', label: 'Premier ravitaillement', period: null },
      { type: 'contributor', label: 'Pilier du nid', period: '2026-11-02' },
      { type: 'drinks', label: 'Faucon assoiffé', period: '2026-10-26' },
    ],
  };
  await page.route('**/api/state', (route) =>
    route.fulfill({ json: { ok: true, data: { ...snapshot, community } } }),
  );
  await page.goto('/falcons');
  const personal = page.getByRole('region', { name: 'Ta place dans la section' });
  await expect(personal).toBeVisible();
  await expect(personal).toContainText('2e');
  await expect(personal).toContainText('Pilier du nid');
  expect((await personal.boundingBox())!.y).toBeLessThan(
    (await page.locator('.ranking-list').boundingBox())!.y,
  );
  await personal.getByText('Mes distinctions', { exact: true }).click();
  await expect(personal.getByRole('heading', { name: 'Premier ravitaillement' })).toBeVisible();
  await page.getByRole('button', { name: 'Buveurs', exact: true }).click();
  await expect(personal).toContainText('Pas encore classé');
  await expect(personal.getByRole('link', { name: 'Voir ma ligne' })).toHaveCount(0);
  await page.goto('/profil');
  const opener = page.getByRole('button', { name: 'Installer sur mon téléphone', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Installer le kiosque' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(opener).toBeFocused();
  await expect(
    page
      .getByRole('navigation', { name: 'Navigation mobile' })
      .getByRole('link', { name: 'Profil', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
});
