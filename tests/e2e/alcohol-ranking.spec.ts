import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTestDatabase } from '../../src/lib/db/index';
import { register } from '../../src/features/auth/service';
import { saveProduct } from '../../src/features/catalog/service';
import { checkout } from '../../src/features/checkout/service';
import { getSnapshot } from '../../src/lib/application';
test('le classement Buveurs exclut les boissons sans alcool et précise le périmètre', async ({
  page,
}) => {
  const db = await createTestDatabase();
  try {
    const member = await register(db, {
      name: 'Membre test',
      grade: 'Sdt',
      phone: '0791112233',
      password: 'password-falcons',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [member.id]);
    member.role = 'admin';
    const beer = await saveProduct(db, member, {
      name: 'Bière',
      category: 'Boissons alcoolisées',
      is_beverage: true,
      price_cents: 200,
      price_mode: 'manual',
      cost_micros: null,
    });
    const water = await saveProduct(db, member, {
      name: 'Eau',
      category: 'Boissons sans alcool',
      is_beverage: true,
      price_cents: 100,
      price_mode: 'manual',
      cost_micros: null,
    });
    await checkout(db, member, {
      idempotencyKey: 'rank',
      lines: [
        { productId: beer.id, quantity: 1, expectedPriceCents: 200 },
        { productId: water.id, quantity: 4, expectedPriceCents: 100 },
      ],
    });
    member.role = 'member';
    await db.query("UPDATE users SET role='member' WHERE id=$1", [member.id]);
    await page.route('**/api/state', async (route) =>
      route.fulfill({ json: { ok: true, data: await getSnapshot(db, member) } }),
    );
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/falcons');
    await page.getByRole('button', { name: 'Buveurs', exact: true }).click();
    await expect(
      page.getByText('Par nombre de boissons alcoolisées, cette semaine.', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('.ranking-list')).toContainText('1 boisson');
    await expect(page.locator('.ranking-list')).not.toContainText('5 boissons');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (process.env.FALCONS_CAPTURE_UI === '1') {
        await mkdir('.impeccable/review/quickwins-20261114', { recursive: true });
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
        await page.screenshot({
          path: `.impeccable/review/quickwins-20261114/alcohol-${width}.png`,
        });
      }
    }
  } finally {
    await db.close();
  }
});
