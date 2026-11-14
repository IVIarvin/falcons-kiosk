import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { saveProduct } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import { dispatch } from '@/lib/application';
import {
  getAccountLedger,
  getFinancialSummary,
  recordPayment,
  reverseConsumption,
} from '@/features/ledger/service';
import { createBackup, restoreBackup } from '@/lib/backup';
import { getCommunity } from '@/features/achievements/service';

let db: Database;
let member: Member;
let admin: Member;
let productId: string;
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
  productId = (
    await saveProduct(db, admin, {
      name: 'Bière',
      category: 'Boissons alcoolisées',
      unit: 'pièce',
      is_beverage: true,
      price_cents: 200,
      price_mode: 'manual',
      cost_micros: 1000000,
    })
  ).id;
});
afterAll(async () => db.close());
async function order(key: string, quantity = 3) {
  const receipt = await checkout(db, member, {
    idempotencyKey: key,
    lines: [{ productId, quantity, expectedPriceCents: 200 }],
  });
  const [line] = await db.query<{ id: string }>(
    'SELECT id FROM consumption_lines WHERE consumption_id=$1',
    [receipt.id],
  );
  return { receipt, lineId: line.id };
}
const remove = (lineId: string, key: string, quantity = 1, actor = member) =>
  dispatch(db, actor, 'removeConsumptionLine', { lineId, quantity, idempotencyKey: key });

it('retire une unité, conserve le reçu original et ajuste solde, ventes et marge', async () => {
  const { receipt, lineId } = await order('partial');
  await remove(lineId, 'remove-partial');
  const ledger = await getAccountLedger(db, member);
  expect(ledger.balanceCents).toBe(400);
  expect(ledger.entries.find((e) => e.id === receipt.id)?.cents).toBe(400);
  expect(ledger.entries.find((e) => e.id === receipt.id)?.lines?.[0]).toMatchObject({
    id: lineId,
    quantity: 3,
    removedQuantity: 1,
  });
  const [original] = await db.query<{ total_cents: number }>(
    'SELECT total_cents FROM consumptions WHERE id=$1',
    [receipt.id],
  );
  expect(original.total_cents).toBe(600);
  expect((await getCommunity(db, member)).drinks[0].score).toBe(2);
  expect(await getFinancialSummary(db, admin)).toMatchObject({
    salesCents: 400,
    costCents: 200,
    marginCents: 200,
  });
  expect(
    await db.query("SELECT id FROM audit WHERE action='self-remove' AND reference_id=$1", [lineId]),
  ).toHaveLength(1);
});
it('refuse une ligne appartenant à un autre membre, même pour un admin', async () => {
  const { lineId } = await order('foreign');
  await expect(remove(lineId, 'foreign-attempt', 1, admin)).rejects.toThrow(
    /accès|Accès|appartient/,
  );
});
it('bloque à dix minutes avec le délai du serveur ; seul un admin peut ensuite corriger', async () => {
  const { receipt, lineId } = await order('expired');
  await db.query("UPDATE consumptions SET created_at=now()-interval '10 minutes' WHERE id=$1", [
    receipt.id,
  ]);
  await expect(remove(lineId, 'expired-remove')).rejects.toThrow(/10 minutes|administrateur/);
  await expect(
    reverseConsumption(db, member, { id: receipt.id, reason: 'Article non pris' }),
  ).rejects.toThrow(/responsable/);
  await reverseConsumption(db, admin, { id: receipt.id, reason: 'Article non pris' });
});
it('une reprise identique reste possible après expiration sans seconde déduction', async () => {
  const { receipt, lineId } = await order('replay');
  await remove(lineId, 'same-key');
  const before = (await getAccountLedger(db, member)).balanceCents;
  await db.query("UPDATE consumptions SET created_at=now()-interval '11 minutes' WHERE id=$1", [
    receipt.id,
  ]);
  await remove(lineId, 'same-key');
  expect((await getAccountLedger(db, member)).balanceCents).toBe(before);
  await expect(remove(lineId, 'same-key', 2)).rejects.toThrow(/autre/);
});
it('deux retraits concurrents ne peuvent pas dépasser la quantité ajoutée', async () => {
  const { lineId } = await order('race', 1);
  const result = await Promise.allSettled([remove(lineId, 'race-a'), remove(lineId, 'race-b')]);
  expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
});
it('un retrait après paiement crée un avoir exact, puis une correction admin ne le double pas', async () => {
  const { receipt, lineId } = await order('paid', 2);
  await recordPayment(db, admin, {
    memberId: member.id,
    cents: (await getAccountLedger(db, member)).balanceCents,
    idempotencyKey: 'settled',
  });
  await remove(lineId, 'paid-remove');
  expect((await getAccountLedger(db, member)).balanceCents).toBe(-200);
  await reverseConsumption(db, admin, { id: receipt.id, reason: 'Deux articles non pris' });
  expect((await getAccountLedger(db, member)).balanceCents).toBe(-400);
  await expect(remove(lineId, 'reversed-remove')).rejects.toThrow(/annulée/);
});
it('sauvegarde et restaure les retraits sans changer le solde', async () => {
  const backup = await createBackup(db, admin);
  const restored = await createTestDatabase();
  try {
    await restoreBackup(restored, backup);
    expect(await getAccountLedger(restored, member)).toEqual(await getAccountLedger(db, member));
  } finally {
    await restored.close();
  }
});
it('restaure les anciennes sauvegardes avec zéro retrait', async () => {
  const backup = await createBackup(db, admin);
  delete backup.tables.consumption_removals;
  delete backup.tables.patch_campaigns;
  delete backup.tables.patch_reservations;
  delete backup.tables.extra_requests;
  for (const row of backup.tables.consumptions as Record<string, unknown>[]) delete row.origin;
  for (const line of backup.tables.consumption_lines as Record<string, unknown>[])
    delete line.removed_quantity;
  const restored = await createTestDatabase();
  try {
    await restoreBackup(restored, backup);
    expect(await restored.query("SELECT id FROM consumptions WHERE origin<>'kiosk'")).toHaveLength(
      0,
    );
    expect(
      await restored.query('SELECT id FROM consumption_lines WHERE removed_quantity<>0'),
    ).toHaveLength(0);
  } finally {
    await restored.close();
  }
});
