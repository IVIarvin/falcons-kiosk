import { beforeAll, afterAll, expect, it } from 'vitest';
import sharp from 'sharp';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { createPatchCampaign, getPatchBoard } from '@/features/patches/service';
import { savePatchImage, readPatchImage, deletePatchImage } from '@/features/patches/images';
import { createBackup, restoreBackup } from '@/lib/backup';
import { readAdminData } from '@/features/admin-data/service';

let db: Database;
let admin: Member;
let member: Member;
let campaignId: string;
let png: Buffer;
beforeAll(async () => {
  db = await createTestDatabase();
  admin = await register(db, {
    name: 'Admin',
    grade: 'Cpl',
    phone: '0791112233',
    password: 'password-falcons',
  });
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
  admin.role = 'admin';
  member = await register(db, {
    name: 'Membre',
    grade: 'Sdt',
    phone: '0792223344',
    password: 'password-falcons',
  });
  campaignId = (
    await createPatchCampaign(db, admin, {
      name: 'Falcons',
      priceCents: 800,
      deadline: '2099-12-31',
    })
  ).id;
  png = await sharp({ create: { width: 64, height: 32, channels: 4, background: '#8fe781' } })
    .png()
    .toBuffer();
});
afterAll(async () => db.close());

it('conserve les deux images et ne place que leurs URLs versionnées dans le snapshot membre', async () => {
  await savePatchImage(db, admin, campaignId, 'artwork', png);
  await savePatchImage(db, admin, campaignId, 'print', png);
  const campaign = (await getPatchBoard(db, member)).find((c) => c.id === campaignId)!;
  expect(campaign.images.artwork).toMatch(/\/artwork\?v=/);
  expect(campaign.images.print).toMatch(/\/print\?v=/);
  expect(JSON.stringify(campaign)).not.toContain(png.toString('base64'));
  const image = await readPatchImage(db, member, campaignId, 'artwork');
  expect((await sharp(image.data).metadata()).format).toBe('webp');
});
it('réserve la modification aux admins et refuse les fichiers invalides ou trop grands', async () => {
  await expect(savePatchImage(db, member, campaignId, 'artwork', png)).rejects.toThrow(
    /responsable/,
  );
  await expect(deletePatchImage(db, member, campaignId, 'artwork')).rejects.toThrow(/responsable/);
  await expect(
    savePatchImage(db, admin, campaignId, 'artwork', Buffer.from('<svg></svg>')),
  ).rejects.toThrow(/image|format/i);
  await expect(
    savePatchImage(db, admin, campaignId, 'artwork', Buffer.alloc(2 * 1024 * 1024 + 1)),
  ).rejects.toThrow(/2 Mo/);
});
it('remplace et retire indépendamment une image, y compris après commande', async () => {
  const before = await readPatchImage(db, member, campaignId, 'artwork');
  await db.query("UPDATE patch_campaigns SET status='ordered',final_price_cents=800 WHERE id=$1", [
    campaignId,
  ]);
  await savePatchImage(db, admin, campaignId, 'artwork', png);
  expect((await readPatchImage(db, member, campaignId, 'artwork')).version).not.toBe(
    before.version,
  );
  await deletePatchImage(db, admin, campaignId, 'artwork');
  await expect(readPatchImage(db, member, campaignId, 'artwork')).rejects.toThrow(/introuvable/);
  expect(
    (await getPatchBoard(db, member)).find((c) => c.id === campaignId)?.images.print,
  ).toBeTruthy();
});
it('sauvegarde les images, les restaure et garde les octets hors du viewer Données', async () => {
  const backup = await createBackup(db, admin);
  const restored = await createTestDatabase();
  try {
    await restoreBackup(restored, backup);
    expect((await readPatchImage(restored, member, campaignId, 'print')).data).toEqual(
      (await readPatchImage(db, member, campaignId, 'print')).data,
    );
  } finally {
    await restored.close();
  }
  const view = await readAdminData(db, admin, { table: 'patch_images' });
  expect(view.columns).not.toContain('data_base64');
  expect(JSON.stringify(view)).not.toContain(png.toString('base64'));
});
