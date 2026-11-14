import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createTestDatabase } from '../../src/lib/db/index';
import { register, type Member } from '../../src/features/auth/service';
import { saveProduct } from '../../src/features/catalog/service';
import {
  createPatchCampaign,
  reservePatch,
  confirmPatchOrder,
} from '../../src/features/patches/service';
import { getSnapshot, dispatch } from '../../src/lib/application';

test('vérifie un panier masqué par les filtres puis les écrans membre et admin sur mobile', async ({
  page,
}) => {
  const db = await createTestDatabase();
  const errors: string[] = [];
  const checks: object[] = [];
  const dir = '.impeccable/review/critique-follow-up';
  await mkdir(dir, { recursive: true });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    const admin = await register(db, {
      name: 'Camille Responsable',
      grade: 'Cpl',
      phone: '0791112233',
      password: 'password-falcons',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    const member = await register(db, {
      name: 'Alexandre de la Reconnaissance',
      grade: 'Sdt',
      phone: '0792223344',
      password: 'password-falcons',
    });
    const water = await saveProduct(db, admin, {
      name: 'Eau Valser',
      category: 'Boissons sans alcool',
      price_cents: 200,
      price_mode: 'manual',
      cost_micros: null,
    });
    const beer = await saveProduct(db, admin, {
      name: 'Bière artisanale locale',
      category: 'Boissons alcoolisées',
      price_cents: 350,
      price_mode: 'manual',
      cost_micros: null,
    });
    await saveProduct(db, admin, {
      name: 'Chips Paprika',
      category: 'Snacks salés',
      price_cents: 300,
      price_mode: 'manual',
      cost_micros: null,
    });
    await saveProduct(db, admin, {
      name: 'Twix',
      category: 'Snacks sucrés',
      price_cents: 150,
      price_mode: 'manual',
      cost_micros: null,
    });
    await db.query('UPDATE products SET image=$1 WHERE id=$2', ['/products/water.png', water.id]);
    const patch = await createPatchCampaign(db, admin, {
      name: 'Reconnaissance nocturne',
      priceCents: 850,
      minimumQuantity: 100,
      deadline: '2099-12-31',
    });
    await reservePatch(db, member, {
      campaignId: patch.id,
      quantity: 2,
      idempotencyKey: 'fixture-patch',
    });
    let actor: Member = member;
    let checkouts = 0;
    await page.route('**/api/**', async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      if (path === '/api/state') {
        const snapshot = await getSnapshot(db, actor);
        // Exercise both gallery slots without storing or uploading production media.
        snapshot.patches = snapshot.patches.map((p) => ({
          ...p,
          images: { artwork: '/products/chips.png', print: '/products/rivella.png' },
        }));
        await route.fulfill({ json: { ok: true, data: snapshot } });
      } else if (path === '/api/action') {
        const { action, data } = req.postDataJSON();
        if (action === 'checkout') checkouts++;
        await route.fulfill({ json: { ok: true, data: await dispatch(db, actor, action, data) } });
      } else await route.abort();
    });
    async function capture(name: string) {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true });
        checks.push({ name, width, overflow: false });
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    expect(
      await page
        .getByRole('button', { name: 'Snacks sucrés', exact: true })
        .evaluate((el) => getComputedStyle(el).flexGrow),
    ).toBe('0');
    await capture('kiosk');
    await page.getByRole('button', { name: 'Ajouter Eau Valser', exact: true }).click();
    await page
      .getByRole('button', { name: 'Ajouter Bière artisanale locale', exact: true })
      .click();
    await page.getByRole('searchbox', { name: 'Rechercher un produit' }).fill('Twix');
    await expect(page.getByRole('heading', { name: 'Eau Valser', exact: true })).toHaveCount(0);
    await page.getByText('Voir le panier', { exact: true }).click();
    const cart = page.getByRole('list', { name: 'Contenu du panier' });
    await expect(cart.getByText('Eau Valser', { exact: true })).toBeVisible();
    await cart
      .getByRole('button', { name: 'Ajouter un Eau Valser au panier', exact: true })
      .click();
    await expect(cart.getByRole('status', { name: 'Quantité au panier Eau Valser' })).toHaveText(
      '2',
    );
    await capture('basket');
    await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Achat enregistré' })).toBeVisible();
    expect(checkouts).toBe(1);
    expect((await getSnapshot(db, member)).ledger.balanceCents).toBe(750);
    await capture('receipt');
    await page.goto('/ardoise');
    const detail = page.getByRole('button', { name: /le détail/ }).first();
    expect((await detail.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await capture('ledger');
    await page.goto('/patchs');
    await expect(page.getByText('2 patchs réservés', { exact: true })).toBeVisible();
    await expect(page.getByText('Total estimé', { exact: true })).toBeVisible();
    const personal = page.getByText('Ta réservation', { exact: true });
    const gallery = page.getByRole('img', { name: /Artwork/ }).first();
    expect((await personal.boundingBox())!.y).toBeLessThan((await gallery.boundingBox())!.y);
    await capture('patch');
    await reservePatch(db, admin, {
      campaignId: patch.id,
      quantity: 98,
      idempotencyKey: 'fixture-section',
    });
    await confirmPatchOrder(db, admin, {
      campaignId: patch.id,
      expectedTotalQuantity: 100,
      expectedPriceCents: 850,
      expectedMinimumQuantity: 100,
      finalPriceCents: 700,
      idempotencyKey: 'fixture-order',
    });
    await page.reload();
    await expect(page.getByText('Total facturé', { exact: true })).toBeVisible();
    await capture('patch-ordered');
    await page.goto('/profil');
    await page.setViewportSize({ width: 320, height: 900 });
    expect(
      (await page.getByRole('button', { name: 'Installer RAVIT', exact: true }).boundingBox())!.y,
    ).toBeLessThan(350);
    expect(
      (await page.getByRole('textbox', { name: 'Nom', exact: true }).boundingBox())!.width,
    ).toBeGreaterThan(220);
    await capture('profile');
    await page.getByRole('button', { name: 'Installer RAVIT', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Installer RAVIT' })).toBeVisible();
    await page.keyboard.press('Escape');
    actor = admin;
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Règlements', exact: true })).toBeVisible();
    await expect(page.getByText('EXEMPLE DE RÉPLIQUE', { exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 900 });
    const account = page.getByRole('row').filter({ hasText: member.name });
    expect((await account.locator('.member-name').boundingBox())!.width).toBeGreaterThan(240);
    await expect(
      account
        .getByRole('button', { name: `Copier le numéro de ${member.name}` })
        .filter({ visible: true }),
    ).toBeVisible();
    await capture('settlements');
    await page.goto('/admin/reglages');
    await expect(
      page.getByRole('switch', { name: 'Activer Adjudant Piller', exact: true }),
    ).toBeVisible();
    await capture('settings');
    expect(errors).toEqual([]);
    await writeFile(
      `${dir}/checks.json`,
      JSON.stringify({ checks, errors, checkouts, productionWrites: 0 }, null, 2),
    );
  } finally {
    await db.close();
  }
});
