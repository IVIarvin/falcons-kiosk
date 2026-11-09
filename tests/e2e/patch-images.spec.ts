import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { createTestDatabase } from '../../src/lib/db/index';
import { register, type Member } from '../../src/features/auth/service';
import { createPatchCampaign } from '../../src/features/patches/service';
import {
  savePatchImage,
  readPatchImage,
  deletePatchImage,
} from '../../src/features/patches/images';
import { getSnapshot } from '../../src/lib/application';

test('deux images importées par l’admin, visibles aux membres et indépendantes sur mobile', async ({
  page,
}) => {
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
    const campaign = await createPatchCampaign(db, admin, {
      name: 'Falcons reconnaissance',
      priceCents: 800,
      deadline: '2099-12-31',
    });
    let actor: Member = admin;
    await page.route('**/api/state', (route) =>
      getSnapshot(db, actor).then((data) => route.fulfill({ json: { ok: true, data } })),
    );
    await page.route('**/api/patchs/*/images/*', async (route) => {
      const req = route.request();
      const kind = new URL(req.url()).pathname.split('/').at(-1)!;
      if (req.method() === 'GET') {
        const image = await readPatchImage(db, actor, campaign.id, kind);
        await route.fulfill({ body: image.data, contentType: 'image/webp' });
      } else if (req.method() === 'POST') {
        const form = await new Response(new Uint8Array(req.postDataBuffer()!), {
          headers: { 'Content-Type': req.headers()['content-type'] },
        }).formData();
        const file = form.get('file') as File;
        await savePatchImage(
          db,
          actor,
          campaign.id,
          kind,
          new Uint8Array(await file.arrayBuffer()),
        );
        await route.fulfill({ json: { ok: true } });
      } else {
        await deletePatchImage(db, actor, campaign.id, kind);
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
    await page.getByRole('button', { name: 'Images du patch', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Images du patch', exact: true });
    for (const kind of ['Artwork', 'Print']) {
      await editor
        .getByLabel(`Image ${kind}`, { exact: true })
        .setInputFiles({ name: `${kind}.png`, mimeType: 'image/png', buffer: png });
      await expect(editor.getByRole('status')).toHaveText(`${kind} enregistré.`);
    }
    async function capture(name: string, width: number) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (process.env.FALCONS_CAPTURE_UI === '1') {
        await mkdir('.impeccable/review/patch-images', { recursive: true });
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
        await page.screenshot({ path: `.impeccable/review/patch-images/${name}-${width}.png` });
      }
    }
    for (const width of [320, 390, 1440]) await capture('admin', width);
    await editor.getByRole('button', { name: 'Terminé', exact: true }).click();
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
    await expect(page.getByRole('button', { name: 'Images du patch', exact: true })).toHaveCount(0);
    for (const width of [320, 390, 1440]) await capture('member', width);
    actor = admin;
    await page.goto('/admin/patchs');
    await page.getByRole('button', { name: 'Images du patch', exact: true }).click();
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
});
