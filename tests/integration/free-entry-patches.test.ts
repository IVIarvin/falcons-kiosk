import { beforeAll, afterAll, expect, it } from 'vitest';
import { createTestDatabase, migrate, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { recordFreeEntry } from '@/features/free-entry/service';
import {
  createPatchCampaign,
  reservePatch,
  confirmPatchOrder,
  cancelPatchCampaign,
  getPatchBoard,
} from '@/features/patches/service';
import {
  getAccountLedger,
  getFinancialSummary,
  removeConsumptionLine,
  reverseConsumption,
} from '@/features/ledger/service';
import { createBackup, restoreBackup } from '@/lib/backup';
import { getSnapshot } from '@/lib/application';

let db: Database;
let admin: Member;
let member: Member;
let other: Member;
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
  other = await register(db, {
    name: 'Autre',
    grade: 'Sdt',
    phone: '0793334455',
    password: 'password-falcons',
  });
});
afterAll(async () => db.close());
const free = (key: string, extra = {}) =>
  recordFreeEntry(db, member, {
    name: 'Thé froid oublié',
    category: 'Boissons sans alcool',
    quantity: 2,
    priceCents: 250,
    idempotencyKey: key,
    ...extra,
  });
const campaign = (name: string) =>
  createPatchCampaign(db, admin, {
    name,
    description: 'Patch de section',
    priceCents: 800,
    deadline: '2099-12-31',
  });
const reserve = (campaignId: string, quantity: number, key: string, actor = member) =>
  reservePatch(db, actor, { campaignId, quantity, idempotencyKey: key });
const confirm = (campaignId: string, quantity: number, key: string, actor = admin) =>
  confirmPatchOrder(db, actor, {
    campaignId,
    expectedTotalQuantity: quantity,
    expectedPriceCents: 800,
    idempotencyKey: key,
  });

it('facture un article libre sans créer de produit, et reprend sans double dette', async () => {
  const before = (await getAccountLedger(db, member)).balanceCents;
  const receipt = await free('free-1');
  expect(receipt.totalCents).toBe(500);
  expect((await getAccountLedger(db, member)).balanceCents).toBe(before + 500);
  expect(await db.query('SELECT id FROM products')).toHaveLength(0);
  expect((await free('free-1')).replay).toBe(true);
  expect((await getAccountLedger(db, member)).balanceCents).toBe(before + 500);
  await expect(free('free-1', { quantity: 3 })).rejects.toThrow(/autre/);
  const [line] = await db.query<{ product_id: string | null }>(
    'SELECT product_id FROM consumption_lines WHERE consumption_id=$1',
    [receipt.id],
  );
  expect(line.product_id).toBeNull();
  expect((await getAccountLedger(db, member)).entries.find((e) => e.id === receipt.id)?.label).toBe(
    'Article libre',
  );
  const snapshot = await getSnapshot(db, admin);
  expect(snapshot.admin!.unknownCosts.some((row) => row.product_name === 'Thé froid oublié')).toBe(
    true,
  );
  expect((await getFinancialSummary(db, admin)).unknownSalesCents).toBeGreaterThanOrEqual(500);
});

it('accepte aussi un article non alimentaire sans le compter comme boisson', async () => {
  const receipt = await free('other-item', { name: 'Briquet', category: 'Autre' });
  const [line] = await db.query<{ is_beverage: boolean }>('SELECT is_beverage FROM consumption_lines WHERE consumption_id=$1', [receipt.id]);
  expect(line.is_beverage).toBe(false);
});

it('valide quantité/prix et refuse un compte désactivé', async () => {
  await expect(free('invalid', { priceCents: -1 })).rejects.toThrow();
  await expect(free('invalid', { quantity: 1.5 })).rejects.toThrow();
  await db.query('UPDATE users SET active=false WHERE id=$1', [member.id]);
  await expect(free('disabled')).rejects.toThrow(/désactivé/);
  await db.query('UPDATE users SET active=true WHERE id=$1', [member.id]);
});

it('permet le retrait personnel d’un article libre dans les dix minutes', async () => {
  const receipt = await free('free-remove');
  const [line] = await db.query<{ id: string }>(
    'SELECT id FROM consumption_lines WHERE consumption_id=$1',
    [receipt.id],
  );
  const before = (await getAccountLedger(db, member)).balanceCents;
  await removeConsumptionLine(db, member, {
    lineId: line.id,
    quantity: 1,
    idempotencyKey: 'free-remove-line',
  });
  expect((await getAccountLedger(db, member)).balanceCents).toBe(before - 250);
});

it('réserve sans débit, remplace la quantité et ne rejoue pas une ancienne modification', async () => {
  const { id } = await campaign('Réservation');
  const before = (await getAccountLedger(db, member)).balanceCents;
  await reserve(id, 3, 'reserve-first');
  await reserve(id, 2, 'reserve-update');
  await reserve(id, 3, 'reserve-first');
  expect((await getPatchBoard(db, member)).find((c) => c.id === id)?.myQuantity).toBe(2);
  expect((await getAccountLedger(db, member)).balanceCents).toBe(before);
  await expect(reserve(id, 4, 'reserve-first')).rejects.toThrow(/autre/);
  await reserve(id, 0, 'reserve-cancel');
  expect((await getPatchBoard(db, admin)).find((c) => c.id === id)?.totalQuantity).toBe(0);
});

it('réserve la création/confirmation à l’admin et applique la date limite serveur', async () => {
  await expect(
    createPatchCampaign(db, member, { name: 'Interdit', priceCents: 800, deadline: '2099-12-31' }),
  ).rejects.toThrow(/responsable/);
  const { id } = await campaign('Date limite');
  await db.query("UPDATE patch_campaigns SET deadline='2000-01-01' WHERE id=$1", [id]);
  await expect(reserve(id, 1, 'expired')).rejects.toThrow(/clos|limite/);
  await expect(confirm(id, 1, 'forbidden', member)).rejects.toThrow(/responsable/);
});

it('confirme les patchs atomiquement une seule fois malgré deux requêtes concurrentes', async () => {
  const { id } = await campaign('Commande');
  await reserve(id, 2, 'order-member');
  await reserve(id, 3, 'order-other', other);
  const before = (await getAccountLedger(db, member)).balanceCents;
  const otherBefore = (await getAccountLedger(db, other)).balanceCents;
  await Promise.all([confirm(id, 5, 'confirm-1'), confirm(id, 5, 'confirm-2')]);
  expect((await getAccountLedger(db, member)).balanceCents).toBe(before + 1600);
  expect((await getAccountLedger(db, other)).balanceCents).toBe(otherBefore + 2400);
  expect(await db.query('SELECT id FROM consumptions WHERE origin=$1', ['patch'])).toHaveLength(2);
  expect((await getPatchBoard(db, admin)).find((c) => c.id === id)).toMatchObject({
    status: 'ordered',
    totalQuantity: 5,
    totalCents: 4000,
  });
  await expect(reserve(id, 1, 'after-order')).rejects.toThrow(/command/);
  await expect(cancelPatchCampaign(db, admin, { campaignId: id })).rejects.toThrow(/command/);
});

it('refuse un total devenu obsolète sans dette partielle', async () => {
  const { id } = await campaign('Total changé');
  await reserve(id, 3, 'change-a');
  await reserve(id, 4, 'change-b');
  const before = (await getAccountLedger(db, member)).balanceCents;
  await expect(confirm(id, 3, 'stale-total')).rejects.toThrow(/changé/);
  expect((await getAccountLedger(db, member)).balanceCents).toBe(before);
  expect((await getPatchBoard(db, admin)).find((c) => c.id === id)?.status).toBe('open');
  await cancelPatchCampaign(db, admin, { campaignId: id });
  await expect(reserve(id, 1, 'after-cancel')).rejects.toThrow(/annul/);
});

it('protège les participants et interdit le retrait personnel des patchs commandés', async () => {
  const board = await getPatchBoard(db, member);
  const ordered = board.find((c) => c.status === 'ordered')!;
  expect(ordered.participants).toEqual([]);
  expect(ordered.totalQuantity).toBeNull();
  const [reservation] = await db.query<{ consumption_id: string }>(
    'SELECT consumption_id FROM patch_reservations WHERE campaign_id=$1 AND user_id=$2',
    [ordered.id, member.id],
  );
  const entry = (await getAccountLedger(db, member)).entries.find(
    (e) => e.id === reservation.consumption_id,
  )!;
  expect(entry.removableUntil).toBeUndefined();
  await expect(
    removeConsumptionLine(db, member, {
      lineId: entry.lines![0].id,
      quantity: 1,
      idempotencyKey: 'patch-remove',
    }),
  ).rejects.toThrow(/command|patch/);
  await reverseConsumption(db, admin, {
    id: entry.id,
    reason: 'Correction de la réservation commandée',
  });
  expect((await getPatchBoard(db, member)).find((c) => c.id === ordered.id)?.myChargeVoided).toBe(
    true,
  );
});

it('sauvegarde/restaure articles libres, réservations et reçus, et migre deux fois', async () => {
  await migrate(db);
  const backup = await createBackup(db, admin);
  const restored = await createTestDatabase();
  try {
    await restoreBackup(restored, backup);
    expect((await getAccountLedger(restored, member)).balanceCents).toBe(
      (await getAccountLedger(db, member)).balanceCents,
    );
    expect((await getPatchBoard(restored, admin)).length).toBe(
      (await getPatchBoard(db, admin)).length,
    );
    expect(
      (
        await recordFreeEntry(restored, member, {
          name: 'Thé froid oublié',
          category: 'Boissons sans alcool',
          quantity: 2,
          priceCents: 250,
          idempotencyKey: 'free-1',
        })
      ).replay,
    ).toBe(true);
  } finally {
    await restored.close();
  }
});
