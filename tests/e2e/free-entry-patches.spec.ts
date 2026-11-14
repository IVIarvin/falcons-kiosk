import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTestDatabase } from '../../src/lib/db/index';
import { register, type Member } from '../../src/features/auth/service';
import { saveProduct } from '../../src/features/catalog/service';
import { dispatch, getSnapshot } from '../../src/lib/application';
import { getAccountLedger } from '../../src/features/ledger/service';

async function capture(page: Page, name: string) {
  if (process.env.FALCONS_CAPTURE_UI !== '1') return;
  await mkdir('.impeccable/review/free-entry-patches', { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.screenshot({ path: `.impeccable/review/free-entry-patches/${name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const db = await createTestDatabase();
  const admin = await register(db, {
    name: 'Admin test',
    grade: 'Cpl',
    phone: '0791112233',
    password: 'password-falcons',
  });
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
  admin.role = 'admin';
  const member = await register(db, {
    name: 'Membre test',
    grade: 'Sdt',
    phone: '0792223344',
    password: 'password-falcons',
  });
  let actor: Member = member;
  let interruptFree = false;
  await page.route('**/api/state', async (route) =>
    route.fulfill({ json: { ok: true, data: await getSnapshot(db, actor) } }),
  );
  await page.route('**/api/action', async (route) => {
    const { action, data } = route.request().postDataJSON();
    try {
      const result = await dispatch(db, actor, action, data);
      if (action === 'freeCheckout' && interruptFree) {
        interruptFree = false;
        await route.abort('failed');
        return;
      }
      await route.fulfill({ json: { ok: true, data: result } });
    } catch (error) {
      const e = error as Error & { status?: number; code?: string };
      await route.fulfill({
        status: e.status ?? 400,
        json: { ok: false, message: e.message, code: e.code ?? 'INVALID' },
      });
    }
  });
  return {
    db,
    admin,
    member,
    errors,
    use: (user: Member) => {
      actor = user;
    },
    interrupt: () => {
      interruptFree = true;
    },
  };
}

test('article libre : panier conservé et reprise après réponse perdue sans double ajout', async ({
  page,
}) => {
  const ctx = await setup(page);
  try {
    await saveProduct(ctx.db, ctx.admin, {
      name: 'Eau',
      category: 'Boissons sans alcool',
      price_cents: 200,
      price_mode: 'manual',
      cost_micros: 1000000,
      unit: 'pièce',
      is_beverage: true,
    });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Ajouter Eau', exact: true }).click();
    await page.getByRole('button', { name: 'Article manquant ?', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Article libre', exact: true });
    await dialog.getByLabel('Nom de l’article', { exact: true }).fill('Barre oubliée');
    await dialog
      .getByRole('combobox', { name: 'Famille', exact: true })
      .selectOption('Snacks sucrés');
    await dialog.getByLabel('Quantité', { exact: true }).fill('2');
    await dialog.getByLabel('Prix unitaire (CHF)', { exact: true }).fill('1.50');
    await expect(dialog.getByRole('status', { name: 'Total de l’article libre' })).toContainText(
      'CHF 3.00',
    );
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await capture(page, `free-dialog-${width}`);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    ctx.interrupt();
    await dialog.getByRole('button', { name: 'Ajouter à mon ardoise', exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: 'Retrouver l’ajout', exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Retrouver l’ajout', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Article ajouté', exact: true })).toContainText(
      'CHF 3.00',
    );
    await capture(page, 'free-success-320');
    await page.getByRole('button', { name: 'Terminé', exact: true }).click();
    await capture(page, 'kiosque-320');
    await expect(page.locator('.basket-bar')).toContainText('1 article');
    expect((await getAccountLedger(ctx.db, ctx.member)).balanceCents).toBe(300);
    expect(await ctx.db.query('SELECT id FROM consumptions')).toHaveLength(1);
    expect(ctx.errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await ctx.db.query('UPDATE settings SET piller_enabled=true WHERE id=1');
    await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Achat enregistré', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.piller-comment')).toBeVisible();
    await capture(page, 'receipt-320');
    await page.getByRole('link', { name: 'Voir mon ardoise', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Mon ardoise', exact: true })).toBeVisible();
    expect((await getAccountLedger(ctx.db, ctx.member)).balanceCents).toBe(500);
  } finally {
    await ctx.db.close();
  }
});

test('patchs : réservation sans débit puis commande admin et ardoise confirmée', async ({
  page,
}) => {
  const ctx = await setup(page);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    ctx.use(ctx.admin);
    await page.goto('/admin/patchs');
    await page.getByRole('button', { name: 'Créer une précommande', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle précommande', exact: true });
    await dialog.getByLabel('Nom du patch', { exact: true }).fill('Falcons reconnaissance');
    await dialog.getByLabel('Prix estimé par patch (CHF)', { exact: true }).fill('8');
    await expect(dialog.getByLabel('Quantité minimale de patchs', { exact: true })).toHaveValue(
      '100',
    );
    await dialog.getByLabel('Quantité minimale de patchs', { exact: true }).fill('2');
    await dialog.getByLabel('Dernier jour de réservation', { exact: true }).fill('2099-12-31');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await capture(page, `patch-create-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole('button', { name: 'Ouvrir les réservations', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    ctx.use(ctx.member);
    await page.goto('/patchs');
    await page.getByLabel('Quantité à réserver', { exact: true }).fill('2');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await capture(page, `patch-reserve-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Réserver', exact: true }).click();
    await expect(page.getByText('2 patchs réservés', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Progression des précommandes' }),
    ).toHaveAttribute('aria-valuetext', '2 sur 2 patchs');
    expect((await getAccountLedger(ctx.db, ctx.member)).balanceCents).toBe(0);
    await capture(page, 'patch-reserved-390');
    ctx.use(ctx.admin);
    await page.goto('/admin/patchs');
    await capture(page, 'patch-admin-390');
    await page.getByRole('button', { name: 'Ajuster l’estimation', exact: true }).click();
    const estimateDialog = page.getByRole('dialog', { name: 'Ajuster l’estimation', exact: true });
    await estimateDialog.getByLabel('Prix estimé par patch (CHF)', { exact: true }).fill('7.50');
    await estimateDialog
      .getByRole('button', { name: 'Enregistrer l’estimation', exact: true })
      .click();
    await expect(estimateDialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Confirmer la commande passée', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Confirmer la commande', exact: true });
    await confirmation.getByLabel('Prix définitif par patch (CHF)', { exact: true }).fill('5');
    await expect(
      confirmation.getByRole('button', { name: 'La commande a été passée', exact: true }),
    ).toBeEnabled();
    await confirmation.getByLabel('Prix définitif par patch (CHF)', { exact: true }).fill('7');
    await expect(confirmation).toContainText('CHF 14.00');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await capture(page, `patch-confirm-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await confirmation
      .getByRole('button', { name: 'La commande a été passée', exact: true })
      .click();
    await expect(confirmation).not.toBeVisible();
    expect((await getAccountLedger(ctx.db, ctx.member)).balanceCents).toBe(1400);
    ctx.use(ctx.member);
    await page.goto('/patchs');
    await expect(page.getByText('Commande passée', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Réserver', exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 844 });
    await capture(page, 'patch-ordered-320');
    expect(ctx.errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(
      page
        .getByRole('navigation', { name: 'Navigation mobile' })
        .getByRole('link', { name: 'Patchs', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  } finally {
    await ctx.db.close();
  }
});
