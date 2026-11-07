import { test, expect } from '@playwright/test';
const phone = `079${String(Date.now() % 10000000).padStart(7, '0')}`;
const name = `Falcon Test ${Date.now().toString().slice(-5)}`;
test('inscription autonome, achat mobile, règlement admin et PDF', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inscription');
  await page.getByLabel('Grade', { exact: true }).fill('Sdt');
  await page.getByLabel('Nom', { exact: true }).fill(name);
  await page.getByLabel('Numéro de téléphone').fill(phone);
  await page.getByLabel('Choisis un mot de passe').fill('Falcons-test-2026!');
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter Rivella rouge', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Achat enregistré' })).toBeVisible();
  await expect(page.locator('.piller-comment')).toBeVisible();
  await page.goto('/ardoise');
  await expect(page.locator('.account-balance>strong')).toHaveText('CHF 2.50');
  await page.goto('/profil');
  await page.getByRole('button', { name: 'Me déconnecter' }).click();
  await expect(page).toHaveURL(/connexion/);
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin');
  const row = page.getByRole('row').filter({ hasText: name });
  await row.getByRole('button', { name: 'Marquer reçu' }).click();
  await page.getByRole('button', { name: 'Confirmer la réception' }).click();
  await expect(row).toHaveCount(0);
  const pdf = await page.request.get('/api/admin/documents/catalogue');
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
  const csv = await page.request.get('/api/admin/documents/comptes');
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(name);
});
test('un achat confirmé par le serveur mais interrompu sur le réseau ne se duplique pas', async ({
  page,
}) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  const before = (await (await page.request.get('/api/state')).json()).data.ledger.balanceCents;
  await page.getByRole('button', { name: 'Ajouter Eau minérale', exact: true }).click();
  await page.route('**/api/action', async (route) => {
    const data = route.request().postDataJSON();
    if (data.action === 'checkout') {
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Retrouver ma confirmation' })).toBeVisible();
  await page.unroute('**/api/action');
  await page.getByRole('button', { name: 'Retrouver ma confirmation' }).click();
  await expect(page.getByRole('heading', { name: 'Achat enregistré' })).toBeVisible();
  const after = (await (await page.request.get('/api/state')).json()).data.ledger.balanceCents;
  expect(after - before).toBe(100);
});
