import { test, expect, type Page } from '@playwright/test';
async function login(page: Page, phone = '0790000001') {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill(phone);
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  return (await (await page.request.get('/api/state')).json()).data;
}
test('favoris séparés par compte, panier conservé puis vidé sans achat', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const snapshot = await login(page, '0790000002');
  expect((await page.request.get('/api/admin/data')).status()).toBe(403);
  expect(
    (
      await page.request.post('/api/admin/data', {
        headers: { Origin: 'https://example.invalid' },
        data: { action: 'prepare' },
      })
    ).status(),
  ).toBe(403);
  let user = snapshot.user;
  const base = snapshot.products[0];
  const products = [
    {
      ...base,
      id: 'favorite-eau',
      name: 'Eau rapide',
      category: 'Boissons sans alcool',
      active: true,
    },
    {
      ...base,
      id: 'favorite-chips',
      name: 'Chips rapides',
      category: 'Snacks salés',
      active: true,
    },
  ];
  await page.route('**/api/state', (route) =>
    route.fulfill({ json: { ok: true, data: { ...snapshot, user, products } } }),
  );
  await page.route('**/api/action', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Mettre Eau rapide en favori', exact: true }).click();
  await page.getByRole('button', { name: 'Favoris', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ajouter Eau rapide', exact: true }).click();
  await expect(page.locator('.basket-bar')).toContainText('1 article');
  await page.getByRole('button', { name: 'Favoris', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Vider le panier', exact: true }).click();
  await expect(page.locator('.basket-bar')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Retirer Eau rapide des favoris', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  user = { ...user, id: 'other-favorite-account' };
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Mettre Eau rapide en favori', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
});
test('données et préparation du reset avec sauvegarde, confirmation puis reconnexion — API de reset simulée', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const real = await page.request.get('/api/admin/data?table=users');
  expect(real.status()).toBe(200);
  expect(real.headers()['cache-control']).toBe('no-store');
  expect(await real.text()).not.toMatch(/password_hash|token_hash|scrypt/);
  const token = 'a'.repeat(64);
  let confirmed = false;
  await page.route('**/api/admin/data*', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        json: {
          ok: true,
          data: {
            table: 'users',
            tables: [{ name: 'users', label: 'Comptes', count: 3 }],
            columns: ['name', 'role'],
            rows: [{ id: 'admin-fixture', name: 'Admin témoin', role: 'admin' }],
            total: 1,
            page: 1,
            pageSize: 25,
          },
        },
      });
    const body = route.request().postDataJSON();
    if (body.action === 'prepare')
      return route.fulfill({
        json: {
          ok: true,
          data: {
            token,
            counts: { users: 3, products: 2, consumptions: 4, patch_campaigns: 1 },
            adminsPreserved: 2,
            backup: { format: 'falcons-backup-v1', tables: { users: [] } },
          },
        },
      });
    confirmed = true;
    expect(body.data).toMatchObject({
      token,
      confirmation: 'RESET FALCONS',
      backupDownloaded: true,
      password: 'test-reset-confirmation',
    });
    return route.fulfill({
      headers: { 'Set-Cookie': 'falcons_session=; Path=/; Max-Age=0; HttpOnly' },
      json: { ok: true, data: { adminsPreserved: 2 } },
    });
  });
  await page.goto('/admin/reglages');
  await page.getByRole('link', { name: 'Données', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Données', exact: true })).toBeVisible();
  await expect(page.getByText('Admin témoin', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voir', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Détail de la ligne' })).not.toContainText(
    'password_hash',
  );
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sauvegarder et préparer le reset', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/falcons-sauvegarde/);
  const modal = page.getByRole('dialog', { name: 'Réinitialiser le kiosque' });
  await expect(modal).toContainText('2 comptes admin conservés');
  await expect(modal.getByRole('button', { name: 'Confirmer la remise à zéro' })).toBeDisabled();
  await modal.getByLabel('J’ai enregistré la sauvegarde.').check();
  await modal.getByLabel('Ton mot de passe admin').fill('test-reset-confirmation');
  await modal.getByLabel('Saisis RESET FALCONS').fill('RESET FALCONS');
  await modal.getByRole('button', { name: 'Confirmer la remise à zéro' }).click();
  await expect(page.getByRole('button', { name: 'Me connecter', exact: true })).toBeVisible();
  expect(confirmed).toBe(true);
});
