import { test, expect } from '@playwright/test';
test('manifeste, icônes et écran hors connexion sans cache de compte', async ({
  page,
  context,
}) => {
  await page.goto('/connexion');
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  const data = await manifest.json();
  expect(data.display).toBe('standalone');
  for (const icon of data.icons) {
    const image = await page.request.get(icon.src);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
  }
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Le kiosque est hors connexion.' })).toBeVisible();
  await expect(page.getByText('Aucune consommation n’a été confirmée.')).toBeVisible();
  const privateAvailable = await page.evaluate(async () => {
    try {
      await fetch('/api/state');
      return true;
    } catch {
      return false;
    }
  });
  expect(privateAvailable).toBe(false);
  await context.setOffline(false);
});
