import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import { assert, DomainError } from '@/lib/errors';
import { requireAdmin, type Member } from '@/features/auth/service';
import { patchImageKinds, patchImageUrl, type PatchImageKind } from './media';
export const maxPatchImageBytes = 2 * 1024 * 1024;
const kindSchema = z.enum(patchImageKinds);

export async function savePatchImage(
  db: Database,
  actor: Member,
  campaignId: string,
  inputKind: string,
  input: Uint8Array,
) {
  requireAdmin(actor);
  const kind = kindSchema.parse(inputKind);
  assert(
    input.byteLength > 0 && input.byteLength <= maxPatchImageBytes,
    'Choisis une image de 2 Mo maximum.',
  );
  let image: Buffer;
  try {
    const source = sharp(Buffer.from(input), { limitInputPixels: 16000000, failOn: 'error' });
    const metadata = await source.metadata();
    assert(
      ['png', 'jpeg', 'webp'].includes(metadata.format ?? '') && (metadata.pages ?? 1) === 1,
      'Choisis une image statique PNG, JPEG ou WebP.',
    );
    image = await source
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError(
      'Cette image est invalide ou trop grande. Choisis un PNG, JPEG ou WebP de 2 Mo maximum.',
    );
  }
  assert(
    image.byteLength <= 1024 * 1024,
    'Cette image est trop complexe. Réduis ses dimensions puis réessaie.',
  );
  return db.transaction(async (tx) => {
    const [campaign] = await tx.query('SELECT id FROM patch_campaigns WHERE id=$1 FOR UPDATE', [
      campaignId,
    ]);
    assert(campaign, 'Précommande introuvable.', 'NOT_FOUND', 404);
    const version = randomUUID();
    await tx.query(
      'INSERT INTO patch_images(campaign_id,kind,data_base64,version,uploaded_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(campaign_id,kind) DO UPDATE SET data_base64=EXCLUDED.data_base64,version=EXCLUDED.version,uploaded_by=EXCLUDED.uploaded_by,updated_at=now()',
      [campaignId, kind, image.toString('base64'), version, actor.id],
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,after_data) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        actor.id,
        'patch-image',
        campaignId,
        `Image ${kind} ajoutée ou remplacée`,
        JSON.stringify({ kind, version, bytes: image.byteLength }),
      ],
    );
    return { url: patchImageUrl(campaignId, kind, version), version };
  });
}
export async function readPatchImage(
  db: Database,
  actor: Member,
  campaignId: string,
  inputKind: string,
) {
  assert(actor.active, 'Connecte-toi pour continuer.', 'AUTH', 401);
  const kind = kindSchema.parse(inputKind);
  const [image] = await db.query<{ data_base64: string; version: string }>(
    'SELECT data_base64,version FROM patch_images WHERE campaign_id=$1 AND kind=$2',
    [campaignId, kind],
  );
  assert(image, 'Image introuvable.', 'NOT_FOUND', 404);
  return { data: Buffer.from(image.data_base64, 'base64'), version: image.version };
}
export async function deletePatchImage(
  db: Database,
  actor: Member,
  campaignId: string,
  inputKind: string,
) {
  requireAdmin(actor);
  const kind: PatchImageKind = kindSchema.parse(inputKind);
  await db.transaction(async (tx) => {
    const [campaign] = await tx.query('SELECT id FROM patch_campaigns WHERE id=$1 FOR UPDATE', [
      campaignId,
    ]);
    assert(campaign, 'Précommande introuvable.', 'NOT_FOUND', 404);
    const rows = await tx.query(
      'DELETE FROM patch_images WHERE campaign_id=$1 AND kind=$2 RETURNING version',
      [campaignId, kind],
    );
    if (rows.length)
      await tx.query(
        'INSERT INTO audit(id,actor_id,action,reference_id,reason) VALUES($1,$2,$3,$4,$5)',
        [randomUUID(), actor.id, 'patch-image-delete', campaignId, `Image ${kind} retirée`],
      );
  });
}
