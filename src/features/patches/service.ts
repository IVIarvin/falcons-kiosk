import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import { requireAdmin, type Member } from '@/features/auth/service';
import { assert } from '@/lib/errors';
import { requestHash } from '@/features/ledger/service';
import { replayRequest, saveRequest } from '@/lib/extra-requests';

type CampaignRow = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  deadline: string;
  status: 'open' | 'ordered' | 'cancelled';
  reservable: boolean;
};
type ReservationRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  quantity: number;
  consumption_id: string | null;
  name: string;
  grade: string;
  charge_voided: boolean;
};
export type PatchCampaign = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  deadline: string;
  status: CampaignRow['status'];
  reservable: boolean;
  myQuantity: number;
  myChargeVoided: boolean;
  totalQuantity: number | null;
  totalCents: number | null;
  participants: {
    userId: string;
    name: string;
    grade: string;
    quantity: number;
    charged: boolean;
    chargeVoided: boolean;
  }[];
};
export async function getPatchBoard(db: Database, actor: Member): Promise<PatchCampaign[]> {
  const campaigns = await db.query<CampaignRow>(
    "SELECT *,deadline::text AS deadline,(status='open' AND deadline>=(clock_timestamp() AT TIME ZONE 'Europe/Zurich')::date) AS reservable FROM patch_campaigns ORDER BY created_at DESC,id",
  );
  const reservations = await db.query<ReservationRow>(
    `SELECT r.*,u.name,u.grade,c.reversed_at IS NOT NULL AS charge_voided FROM patch_reservations r JOIN users u ON u.id=r.user_id LEFT JOIN consumptions c ON c.id=r.consumption_id ${actor.role === 'admin' ? '' : 'WHERE r.user_id=$1'} ORDER BY u.name`,
    actor.role === 'admin' ? [] : [actor.id],
  );
  return campaigns.map((c) => {
    const rows = reservations.filter((r) => r.campaign_id === c.id);
    const own = rows.find((r) => r.user_id === actor.id);
    const total = rows.reduce((s, r) => s + r.quantity, 0);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      priceCents: c.price_cents,
      deadline: c.deadline,
      status: c.status,
      reservable: c.reservable,
      myQuantity: own?.quantity ?? 0,
      myChargeVoided: own?.charge_voided ?? false,
      totalQuantity: actor.role === 'admin' ? total : null,
      totalCents: actor.role === 'admin' ? total * c.price_cents : null,
      participants:
        actor.role === 'admin'
          ? rows
              .filter((r) => r.quantity > 0)
              .map((r) => ({
                userId: r.user_id,
                name: r.name,
                grade: r.grade,
                quantity: r.quantity,
                charged: !!r.consumption_id,
                chargeVoided: r.charge_voided,
              }))
          : [],
    };
  });
}
async function lockedCampaign(db: Database, id: string) {
  const [campaign] = await db.query<CampaignRow>(
    "SELECT *,deadline::text AS deadline,(deadline>=(clock_timestamp() AT TIME ZONE 'Europe/Zurich')::date) AS reservable FROM patch_campaigns WHERE id=$1 FOR UPDATE",
    [id],
  );
  assert(campaign, 'Précommande introuvable.');
  return campaign;
}
export async function createPatchCampaign(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const data = z
    .object({
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(1000).default(''),
      priceCents: z.number().int().min(0).max(1000000),
      deadline: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((v) => {
          const d = new Date(v + 'T12:00:00Z');
          return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
        }),
    })
    .parse(input);
  const [date] = await db.query<{ valid: boolean }>(
    "SELECT $1::date>=(clock_timestamp() AT TIME ZONE 'Europe/Zurich')::date AS valid",
    [data.deadline],
  );
  assert(date.valid, 'La date limite est déjà passée.');
  const id = randomUUID();
  await db.query(
    'INSERT INTO patch_campaigns(id,name,description,price_cents,deadline,actor_id) VALUES($1,$2,$3,$4,$5,$6)',
    [id, data.name, data.description, data.priceCents, data.deadline, actor.id],
  );
  return { id };
}
export async function reservePatch(db: Database, actor: Member, input: unknown) {
  const { idempotencyKey, ...data } = z
    .object({
      campaignId: z.string().min(1),
      quantity: z.number().int().min(0).max(1000),
      idempotencyKey: z.string().min(1).max(100),
    })
    .parse(input);
  const hash = requestHash(data);
  return db.transaction(async (tx) => {
    const campaign = await lockedCampaign(tx, data.campaignId);
    const [user] = await tx.query<{ active: boolean }>(
      'SELECT active FROM users WHERE id=$1 FOR UPDATE',
      [actor.id],
    );
    assert(user?.active, 'Compte désactivé.', 'AUTH', 401);
    const previous = await replayRequest<{ campaignId: string; quantity: number }>(
      tx,
      actor.id,
      'reservePatch',
      idempotencyKey,
      hash,
    );
    if (previous) return previous;
    assert(
      campaign.status !== 'ordered',
      'La commande a été passée. Contacte le responsable pour une correction.',
    );
    assert(campaign.status !== 'cancelled', 'Cette précommande a été annulée.');
    assert(campaign.reservable, 'Les réservations sont closes : la date limite est passée.');
    await tx.query(
      'INSERT INTO patch_reservations(id,campaign_id,user_id,quantity) VALUES($1,$2,$3,$4) ON CONFLICT(campaign_id,user_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now()',
      [randomUUID(), campaign.id, actor.id, data.quantity],
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,after_data) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        actor.id,
        'patch-reserve',
        campaign.id,
        data.quantity ? 'Réservation de patchs' : 'Annulation de la réservation',
        JSON.stringify(data),
      ],
    );
    await saveRequest(tx, actor.id, 'reservePatch', idempotencyKey, hash, data);
    return data;
  });
}
type OrderResult = { campaignId: string; quantity: number; totalCents: number; replay: boolean };
export async function confirmPatchOrder(
  db: Database,
  actor: Member,
  input: unknown,
): Promise<OrderResult> {
  requireAdmin(actor);
  const { idempotencyKey, ...data } = z
    .object({
      campaignId: z.string().min(1),
      expectedTotalQuantity: z.number().int().min(1).max(1000000),
      expectedPriceCents: z.number().int().min(0).max(1000000),
      idempotencyKey: z.string().min(1).max(100),
    })
    .parse(input);
  const hash = requestHash(data);
  return db.transaction(async (tx) => {
    const campaign = await lockedCampaign(tx, data.campaignId);
    const previous = await replayRequest<OrderResult>(
      tx,
      actor.id,
      'confirmPatchOrder',
      idempotencyKey,
      hash,
    );
    if (previous) return { ...previous, replay: true };
    assert(campaign.status !== 'cancelled', 'Cette précommande a été annulée.');
    const reservations = await tx.query<{ id: string; user_id: string; quantity: number }>(
      'SELECT id,user_id,quantity FROM patch_reservations WHERE campaign_id=$1 AND quantity>0 ORDER BY user_id',
      [campaign.id],
    );
    const quantity = reservations.reduce((s, r) => s + r.quantity, 0);
    const total = quantity * campaign.price_cents;
    assert(
      Number.isSafeInteger(total) && total <= 100000000,
      'Le total de cette commande est trop élevé.',
    );
    const result = {
      campaignId: campaign.id,
      quantity,
      totalCents: total,
      replay: campaign.status === 'ordered',
    };
    if (campaign.status === 'ordered') {
      await saveRequest(tx, actor.id, 'confirmPatchOrder', idempotencyKey, hash, result);
      return result;
    }
    assert(quantity > 0, 'Aucun patch réservé à commander.');
    assert(
      quantity === data.expectedTotalQuantity && campaign.price_cents === data.expectedPriceCents,
      'Les réservations ont changé. Vérifie le nouveau total avant de confirmer.',
      'PRICE_CHANGED',
      409,
    );
    for (const reservation of reservations) {
      await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [reservation.user_id]);
      const id = randomUUID();
      await tx.query(
        'INSERT INTO consumptions(id,user_id,total_cents,idempotency_key,request_hash,origin) VALUES($1,$2,$3,$4,$5,$6)',
        [
          id,
          reservation.user_id,
          reservation.quantity * campaign.price_cents,
          `patch:${randomUUID()}`,
          requestHash({
            campaignId: campaign.id,
            quantity: reservation.quantity,
            priceCents: campaign.price_cents,
          }),
          'patch',
        ],
      );
      await tx.query(
        'INSERT INTO consumption_lines(id,consumption_id,product_id,product_name,unit,quantity,price_cents,cost_micros,is_beverage) VALUES($1,$2,NULL,$3,$4,$5,$6,NULL,false)',
        [
          randomUUID(),
          id,
          `Patch · ${campaign.name}`,
          'patch',
          reservation.quantity,
          campaign.price_cents,
        ],
      );
      await tx.query('UPDATE patch_reservations SET consumption_id=$2 WHERE id=$1', [
        reservation.id,
        id,
      ]);
    }
    await tx.query(
      "UPDATE patch_campaigns SET status='ordered',ordered_at=now(),ordered_by=$2 WHERE id=$1",
      [campaign.id, actor.id],
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,after_data) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        actor.id,
        'patch-order',
        campaign.id,
        'Commande fournisseur confirmée',
        JSON.stringify(result),
      ],
    );
    await saveRequest(tx, actor.id, 'confirmPatchOrder', idempotencyKey, hash, result);
    return result;
  });
}
export async function cancelPatchCampaign(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const { campaignId } = z.object({ campaignId: z.string().min(1) }).parse(input);
  return db.transaction(async (tx) => {
    const campaign = await lockedCampaign(tx, campaignId);
    assert(
      campaign.status !== 'ordered',
      'La commande a été passée. Utilise les corrections financières si nécessaire.',
    );
    if (campaign.status !== 'cancelled') {
      await tx.query("UPDATE patch_campaigns SET status='cancelled' WHERE id=$1", [campaign.id]);
      await tx.query(
        'INSERT INTO audit(id,actor_id,action,reference_id,reason) VALUES($1,$2,$3,$4,$5)',
        [
          randomUUID(),
          actor.id,
          'patch-cancel',
          campaign.id,
          'Précommande annulée avant commande fournisseur',
        ],
      );
    }
    return { id: campaign.id };
  });
}
