import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTestDatabase } from '../../src/lib/db/index';
import { register, type Member } from '../../src/features/auth/service';
import { saveProduct } from '../../src/features/catalog/service';
import { checkout } from '../../src/features/checkout/service';
import { getSnapshot, dispatch } from '../../src/lib/application';
for (const failFirstSave of [false, true])
  test(
    failFirstSave
      ? 'conserve le choix après erreur puis réessaie et garde le même avatar partout'
      : 'compare six avatars, conserve l’aperçu au nouveau tirage et peut annuler',
    async ({ page }) => {
      const db = await createTestDatabase();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      try {
        const user = await register(db, {
          name: 'Alexandre de la Reconnaissance',
          grade: 'App',
          phone: '0791112233',
          password: 'password-falcons',
        });
        await db.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
        user.role = 'admin';
        const beer = await saveProduct(db, user, {
          name: 'Bière',
          category: 'Boissons alcoolisées',
          is_beverage: true,
          price_cents: 250,
          price_mode: 'manual',
          cost_micros: null,
        });
        await checkout(db, user, {
          idempotencyKey: 'avatar-fixture',
          lines: [{ productId: beer.id, quantity: 1, expectedPriceCents: 250 }],
        });
        await db.query("UPDATE users SET role='member' WHERE id=$1", [user.id]);
        user.role = 'member';
        const actor = async () => ({
          ...user,
          ...(
            await db.query<Pick<Member, 'avatar_seed'>>(
              'SELECT avatar_seed FROM users WHERE id=$1',
              [user.id],
            )
          )[0],
        });
        await page.route('**/api/state', async (route) =>
          route.fulfill({ json: { ok: true, data: await getSnapshot(db, await actor()) } }),
        );
        let attempts = 0;
        let release: (() => void) | undefined;
        await page.route('**/api/action', async (route) => {
          const { action, data } = route.request().postDataJSON();
          expect(action).toBe('avatar');
          attempts++;
          if (attempts === 1)
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          if (failFirstSave && attempts === 1) {
            await route.fulfill({
              status: 503,
              json: { ok: false, message: 'Connexion indisponible. Réessaie.' },
            });
            return;
          }
          await route.fulfill({
            json: { ok: true, data: await dispatch(db, await actor(), action, data) },
          });
        });
        await page.setViewportSize({ width: 390, height: 900 });
        await page.goto('/profil');
    const profile = page.getByRole('region', { name: 'Ton avatar enregistré', exact: true, includeHidden:true });
        await expect(
          page.getByRole('button', { name: 'Changer mon avatar', exact: true }),
        ).toBeVisible();
        const initial = await profile.locator('svg[data-scout-avatar]').innerHTML();
        await page.getByRole('button', { name: 'Changer mon avatar', exact: true }).click();
        const picker = page.getByRole('dialog', { name: 'Choisir mon avatar', exact: true });
        await expect(picker.getByRole('button', { name: /^Avatar [1-6]$/ })).toHaveCount(6);
        await expect(
          picker.getByRole('button', { name: 'Utiliser cet avatar', exact: true }),
        ).toBeDisabled();
        await picker.getByRole('button', { name: 'Avatar 2', exact: true }).click();
        const preview = picker
          .getByRole('group', { name: 'Aperçu de l’avatar', exact: true })
          .locator('svg');
        const selected = await preview.innerHTML();
        await picker.getByRole('button', { name: 'Autres propositions', exact: true }).click();
        expect(await preview.innerHTML()).toBe(selected);
        expect(await profile.locator('svg[data-scout-avatar]').innerHTML()).toBe(initial);
        await picker.getByRole('button', { name: 'Annuler', exact: true }).click();
        expect(attempts).toBe(0);
        await page.getByRole('button', { name: 'Changer mon avatar', exact: true }).click();
        await picker.getByRole('button', { name: 'Avatar 1', exact: true }).click();
        const chosen = await preview.innerHTML();
        for (const width of [320, 390, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          if (process.env.FALCONS_CAPTURE_UI === '1' && !failFirstSave) {
            await mkdir('.impeccable/review/avatar-picker', { recursive: true });
            await picker.screenshot({
              path: `.impeccable/review/avatar-picker/picker-${width}.png`,
            });
          }
        }
        await picker.getByRole('button', { name: 'Utiliser cet avatar', exact: true }).click();
        await expect(
          picker.getByRole('button', { name: 'Enregistrement…', exact: true }),
        ).toBeDisabled();
        await expect(
          picker.getByRole('button', { name: 'Autres propositions', exact: true }),
        ).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(picker).toBeVisible();
    await expect.poll(()=>typeof release).toBe('function');release!();
        if (failFirstSave) {
          await expect(picker.getByRole('alert')).toContainText('Connexion indisponible');
          expect(await preview.innerHTML()).toBe(chosen);
          await picker.getByRole('button', { name: 'Utiliser cet avatar', exact: true }).click();
        }
        await expect(picker).not.toBeVisible();
        expect(await profile.locator('svg[data-scout-avatar]').innerHTML()).toBe(chosen);
        await page.reload();
        await expect(profile).toBeVisible();
        expect(await profile.locator('svg[data-scout-avatar]').innerHTML()).toBe(chosen);
        await page.setViewportSize({ width: 390, height: 900 });
        expect(await page.locator('.mobile-avatar svg').innerHTML()).toBe(chosen);
        await page.goto('/falcons');
        for (const metric of ['Contributeurs', 'Buveurs']) {
          await page.getByRole('button', { name: metric, exact: true }).click();
          await expect(page.locator('.ranking-list svg[data-scout-avatar]')).toHaveCount(1);
          expect(await page.locator('.ranking-list svg[data-scout-avatar]').innerHTML()).toBe(
            chosen,
          );
          for (const width of [320, 390, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.evaluate(() => document.fonts.ready);
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            if (process.env.FALCONS_CAPTURE_UI === '1' && !failFirstSave)
              await page.screenshot({
                path: `.impeccable/review/avatar-picker/${metric}-${width}.png`,
              });
          }
        }
        expect(errors).toEqual([]);
      } finally {
        await db.close();
      }
    },
  );
