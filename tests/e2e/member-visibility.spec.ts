import { test, expect } from '@playwright/test';
test('un inscrit sans achat apparaît immédiatement dans les comptes admin', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  const snapshot = (await (await page.request.get('/api/state')).json()).data;
  const member = {
    ...snapshot.admin.accounts[0],
    id: 'never-purchased',
    name: 'Inscrit sans achat',
    grade: 'Sdt',
    phone: '+41791234567',
    balanceCents: 0,
    role: 'member',
    active: true,
  };
  await page.route('**/api/state', (r) =>
    r.fulfill({
      json: { ok: true, data: { ...snapshot, admin: { ...snapshot.admin, accounts: [member] } } },
    }),
  );
  await page.goto('/admin');
  await expect(page.getByRole('row').filter({ hasText: 'Inscrit sans achat' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  const avatar = await page.locator('.mobile-avatar svg').innerHTML();
  await page.goto('/profil');
  await expect(page.getByRole('heading', { name: 'Mon profil', exact: true })).toBeVisible();
  expect(await page.locator('main svg[data-scout-avatar]').innerHTML()).toBe(avatar);
  await expect(page.getByRole('region', { name: 'Tes nouveaux succès' })).toContainText(
    'Habitué du poste',
  );
  await expect(page.getByRole('region', { name: 'Tes nouveaux succès' })).toContainText(
    'Premier règlement',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/admin');
  await page.getByRole('checkbox', { name: 'Masquer les comptes à zéro', exact: true }).check();
  await expect(page.getByRole('row').filter({ hasText: 'Inscrit sans achat' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Masquer les comptes à zéro', exact: true }).uncheck();
  await expect(page.getByRole('row').filter({ hasText: 'Inscrit sans achat' })).toBeVisible();
});
