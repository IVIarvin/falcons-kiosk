import { test, expect } from '@playwright/test';
test('déconnecte les autres onglets puis change de compte sans conserver les données admin', async ({
  page,
}) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  const other = await page.context().newPage();
  await other.goto('/admin');
  await expect(other.getByRole('heading', { name: 'Règlements', exact: true })).toBeVisible();
  await page.goto('/profil');
  await page.getByRole('button', { name: 'Me déconnecter' }).click();
  await expect(other.getByRole('heading', { name: 'Règlements', exact: true })).toHaveCount(0);
  await expect(other.getByRole('button', { name: 'Me connecter', exact: true })).toBeVisible();
  await page.getByLabel('Numéro de téléphone').fill('0790000002');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await expect(other.locator('.identity')).toContainText('Martin Démo');
  await expect(other.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
  await expect(other.locator('.accounts-table')).toHaveCount(0);
});
