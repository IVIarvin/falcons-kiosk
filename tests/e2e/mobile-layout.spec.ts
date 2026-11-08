import { test, expect, type Page, type Locator } from '@playwright/test';

async function login(page: Page) {
  await page.route('**/api/action', async (route) => {
    const action = route.request().postDataJSON()?.action;
    if (['login', 'ledger'].includes(action)) await route.continue();
    else await route.abort();
  });
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
}

async function fitsText(control: Locator) {
  return control.evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    const text = document.createRange();
    text.selectNodeContents(el);
    return [...text.getClientRects()].every(
      (rect) =>
        rect.left >= bounds.left &&
        rect.right <= bounds.right &&
        rect.top >= bounds.top &&
        rect.bottom <= bounds.bottom,
    );
  });
}

test('les classements restent lisibles sur téléphone et conservent leurs trois vues', async ({
  page,
}) => {
  await login(page);
  await page.goto('/falcons');
  for (const width of [320, 390, 760, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    const contributors = page.getByRole('button', { name: 'Contributeurs', exact: true });
    expect(await fitsText(contributors), `Contributeurs doit tenir à ${width}px`).toBe(true);
    expect((await contributors.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await contributors.click();
    await page.getByLabel('Période des contributions').selectOption('allTime');
    await expect(page.getByText('Depuis l’ouverture du kiosque', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Buveurs', exact: true }).click();
    await expect(
      page.getByText('Classement par unités de boissons, après corrections.'),
    ).toBeVisible();
    await expect(page.getByLabel('Période des contributions')).toHaveCount(0);
    await contributors.click();
    await page.getByLabel('Période des contributions').selectOption('week');
    await expect(page.getByText(/^Semaine du .*provisoire$/)).toBeVisible();
    await expect(contributors).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('les actions et montants admin restent dans la largeur du téléphone', async ({ page }) => {
  await login(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/admin/produits', '/admin/achats', '/admin/finance']) {
      await page.goto(route);
      const table = page.locator('main table').first();
      await expect(table).toBeVisible();
      const action = table.getByRole('button').first();
      if (await action.count()) {
        const box = await action.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x, `${route} action visible à ${width}px`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${route} action visible à ${width}px`).toBeLessThanOrEqual(width);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      } else {
        // Cancelled expenses deliberately have no further cancellation action.
        expect(route).toBe('/admin/finance');
      }
      for (const amount of await table.locator('tbody td.record-amount').all()) {
        const box = await amount.boundingBox();
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      expect(await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});
