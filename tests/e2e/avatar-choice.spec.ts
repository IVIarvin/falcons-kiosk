import { test, expect } from '@playwright/test';
test('essaie plusieurs avatars, annule ou enregistre et retrouve son choix après rechargement', async ({
  page,
}) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000002');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await page.goto('/profil');
  await page.setViewportSize({ width: 320, height: 900 });
  const preview = page.locator('main svg[data-scout-avatar]');
  const initial = await preview.innerHTML();
  await page.getByRole('button', { name: 'Un autre avatar', exact: true }).click();
  expect(await preview.innerHTML()).not.toBe(initial);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  expect(await preview.innerHTML()).toBe(initial);
  await page.getByRole('button', { name: 'Un autre avatar', exact: true }).click();
  await page.getByRole('button', { name: 'Un autre avatar', exact: true }).click();
  const chosen = await preview.innerHTML();
  await page.getByRole('button', { name: 'Garder cet avatar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Avatar enregistré.');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mon profil', exact: true })).toBeVisible();
  expect(await preview.innerHTML()).toBe(chosen);
  expect(await page.locator('.mobile-avatar svg').innerHTML()).toBe(chosen);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const other = await page.context().newPage();
  await other.goto('/profil');
  await expect(other.getByRole('heading', { name: 'Mon profil', exact: true })).toBeVisible();
  expect(await other.locator('main svg[data-scout-avatar]').innerHTML()).toBe(chosen);
});
