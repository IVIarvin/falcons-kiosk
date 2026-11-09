import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { createTestDatabase } from '../../src/lib/db/index';
import { register, type Member } from '../../src/features/auth/service';
import {
  savePatchImage,
  readPatchImage,
  deletePatchImage,
} from '../../src/features/patches/images';
import { dispatch, getSnapshot } from '../../src/lib/application';

for (const failFirstPrint of [false, true])
  test(
    failFirstPrint
      ? 'échec partiel : réimport du Print sans recréer la précommande'
      : 'deux images importées dès la création, visibles aux membres et indépendantes sur mobile',
    async ({ page }) => {
      const db = await createTestDatabase();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      try {
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
        let campaignId = '';
        let actor: Member = admin;
        let printFailed = false;
        await page.route('**/api/state', (route) =>
          getSnapshot(db, actor).then((data) => route.fulfill({ json: { ok: true, data } })),
        );
        await page.route('**/api/action', async (route) => {
          const { action, data } = route.request().postDataJSON();
          const result = await dispatch(db, actor, action, data);
          if (action === 'createPatchCampaign') campaignId = (result as { id: string }).id;
          await route.fulfill({ json: { ok: true, data: result } });
        });
        await page.route('**/api/patchs/*/images/*', async (route) => {
          const req = route.request();
          const kind = new URL(req.url()).pathname.split('/').at(-1)!;
          if (req.method() === 'GET') {
            const image = await readPatchImage(db, actor, campaignId, kind);
            await route.fulfill({ body: image.data, contentType: 'image/webp' });
          } else if (req.method() === 'POST') {
            if (failFirstPrint && kind === 'print' && !printFailed) {
              printFailed = true;
              await route.fulfill({
                status: 503,
                json: { ok: false, message: 'Import temporairement indisponible.' },
              });
              return;
            }
            const form = await new Response(new Uint8Array(req.postDataBuffer()!), {
              headers: { 'Content-Type': req.headers()['content-type'] },
            }).formData();
            const file = form.get('file') as File;
            await savePatchImage(
              db,
              actor,
              campaignId,
              kind,
              new Uint8Array(await file.arrayBuffer()),
            );
            await route.fulfill({ json: { ok: true } });
          } else {
            await deletePatchImage(db, actor, campaignId, kind);
            await route.fulfill({ json: { ok: true } });
          }
        });
        const png = await sharp({
          create: { width: 400, height: 400, channels: 3, background: '#8fe781' },
        })
          .png()
          .toBuffer();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/admin/patchs');
        await page.getByRole('button', { name: 'Créer une précommande', exact: true }).click();
        const creation = page.getByRole('dialog', { name: 'Nouvelle précommande', exact: true });
        await creation.getByLabel('Nom du patch', { exact: true }).fill('Falcons reconnaissance');
        await creation.getByLabel('Prix estimé par patch (CHF)', { exact: true }).fill('8');
        await creation
          .getByLabel('Dernier jour de réservation', { exact: true })
          .fill('2099-12-31');
        for (const kind of ['Artwork', 'Print']) {
          await expect(creation.getByLabel(`Image ${kind}`, { exact: true })).toBeVisible();
          await creation
            .getByLabel(`Image ${kind}`, { exact: true })
            .setInputFiles({ name: `${kind}.png`, mimeType: 'image/png', buffer: png });
          await expect(
            creation.getByRole('img', { name: `Aperçu ${kind}`, exact: true }),
          ).toBeVisible();
        }
        async function capture(name: string, width: number) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          if (process.env.FALCONS_CAPTURE_UI === '1') {
            await mkdir('.impeccable/review/patch-images', { recursive: true });
            await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
            await page.screenshot({ path: `.impeccable/review/patch-images/${name}-${width}.png` });
          }
        }
        for (const width of [320, 390, 1440]) await capture('creation', width);
        await creation
          .getByRole('button', { name: 'Ouvrir les réservations', exact: true })
          .click();
        await expect(creation).not.toBeVisible();
        if (failFirstPrint) {
          const recovery = page.getByRole('dialog', { name: 'Images du patch', exact: true });
          await expect(recovery.getByRole('alert')).toContainText(
            'La précommande est créée. Print',
          );
          await recovery
            .getByLabel('Image Print', { exact: true })
            .setInputFiles({ name: 'Print.png', mimeType: 'image/png', buffer: png });
          await expect(recovery.getByRole('status')).toHaveText('Print enregistré.');
          await recovery.getByRole('button', { name: 'Terminé', exact: true }).click();
        }
        expect(await db.query('SELECT id FROM patch_campaigns')).toHaveLength(1);
        actor = member;
        await page.goto('/patchs');
        for (const kind of ['Artwork', 'Print']) {
          const image = page.getByRole('img', {
            name: `${kind} du patch Falcons reconnaissance`,
            exact: true,
          });
          await expect(image).toBeVisible();
          await expect
            .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0);
        }
        await expect(page.getByRole('button', { name: /Artwork \/ Print/ })).toHaveCount(0);
        for (const width of [320, 390, 1440]) await capture('member', width);
        actor = admin;
        await page.goto('/admin/patchs');
        await page.getByRole('button', { name: 'Modifier Artwork / Print', exact: true }).click();
        const editor = page.getByRole('dialog', { name: 'Images du patch', exact: true });
        await editor.getByRole('button', { name: 'Retirer Artwork', exact: true }).click();
        await expect(editor.getByRole('status')).toHaveText('Artwork retiré.');
        await editor.getByRole('button', { name: 'Terminé', exact: true }).click();
        actor = member;
        await page.goto('/patchs');
        await expect(
          page.getByRole('img', { name: 'Artwork du patch Falcons reconnaissance', exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('img', { name: 'Print du patch Falcons reconnaissance', exact: true }),
        ).toBeVisible();
        expect(errors).toEqual([]);
      } finally {
        await db.close();
      }
    },
  );
