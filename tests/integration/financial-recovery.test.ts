import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { saveProduct, recordPurchase } from '@/features/catalog/service';
import * as ledger from '@/features/ledger/service';
import { checkout } from '@/features/checkout/service';
import { createBackup, restoreBackup } from '@/lib/backup';
let db: Database, admin: Member, other: Member, productId: string;
beforeAll(async () => {
  db = await createTestDatabase();
  admin = await register(db, {
    name: 'Responsable Alice',
    grade: 'Cpl',
    phone: '0796661111',
    password: 'falcons-password',
  });
  other = await register(db, {
    name: 'Responsable Bob',
    grade: 'Cpl',
    phone: '0796662222',
    password: 'falcons-password',
  });
  await db.query("UPDATE users SET role='admin'");
  admin.role = 'admin';
  other.role = 'admin';
  productId = (
    await saveProduct(db, admin, {
      name: 'Eau',
      unit: '50 cl',
      category: 'Boissons',
      is_beverage: true,
      price_cents: 100,
      price_mode: 'manual',
      cost_micros: 0,
    })
  ).id;
});
afterAll(async () => db.close());
it('une reprise de réapprovisionnement ne double pas la dépense', async () => {
  const input = {
    productId,
    quantity: 24,
    totalCents: 2400,
    purchasedAt: '2026-11-06T12:00:00Z',
    idempotencyKey: 'procurement-one',
  };
  const results = await Promise.all([
    recordPurchase(db, admin, input),
    recordPurchase(db, admin, input),
  ]);
  expect(results[0].id).toBe(results[1].id);
  expect((await ledger.getFinancialSummary(db, admin)).purchasesCents).toBe(2400);
  await expect(recordPurchase(db, admin, { ...input, totalCents: 4800 })).rejects.toThrow();
});
it('une reprise de dépense conserve une seule opération', async () => {
  const input = {
    cents: 500,
    reason: 'Gobelets',
    spentAt: '2026-11-06T12:00:00Z',
    idempotencyKey: 'expense-one',
  };
  await Promise.all([
    ledger.recordExpense(db, admin, input),
    ledger.recordExpense(db, admin, input),
  ]);
  expect((await ledger.getFinancialSummary(db, admin)).expensesCents).toBe(500);
  await expect(ledger.recordExpense(db, admin, { ...input, cents: 1000 })).rejects.toThrow();
});
it('l’annulation du paiement garde l’auteur distinct du créateur et la date réelle', async () => {
  await checkout(db, admin, {
    idempotencyKey: 'paid',
    lines: [{ productId, quantity: 2, expectedPriceCents: 100 }],
  });
  const payment = await ledger.recordPayment(db, admin, {
    memberId: admin.id,
    cents: 200,
    idempotencyKey: 'payment-old-friday',
    receivedAt: '2026-10-30T12:00:00Z',
  });
  await ledger.voidPayment(db, other, { id: payment.id, reason: 'Erreur vérifiée par Bob' });
  const rows = await db.query<{ actor_id: string; reason: string }>(
    'SELECT actor_id,reason FROM audit WHERE reference_id=$1',
    [payment.id],
  );
  expect(rows.some((r) => r.actor_id === other.id && r.reason === 'Erreur vérifiée par Bob')).toBe(
    true,
  );
  const [stored] = await db.query<{ received_at: string }>(
    'SELECT received_at FROM payments WHERE id=$1',
    [payment.id],
  );
  expect(new Date(stored.received_at).toISOString()).toBe('2026-10-30T12:00:00.000Z');
});
it('une dépense erronée s’annule avec motif, reste traçable et se restaure', async () => {
  const [expense] = await db.query<{ id: string }>('SELECT id FROM expenses ORDER BY id LIMIT 1');
  await ledger.voidExpense(db, other, { id: expense.id, reason: 'Montant saisi deux fois' });
  expect((await ledger.getFinancialSummary(db, admin)).expensesCents).toBe(0);
  const [stored] = await db.query<{ cents: number; voided_by: string; void_reason: string }>(
    'SELECT * FROM expenses WHERE id=$1',
    [expense.id],
  );
  expect(stored.cents).toBe(500);
  expect(stored.voided_by).toBe(other.id);
  expect(stored.void_reason).toBe('Montant saisi deux fois');
  await expect(
    ledger.voidExpense(db, other, { id: expense.id, reason: 'Encore' }),
  ).rejects.toThrow();
  const restored = await createTestDatabase();
  try {
    await restoreBackup(restored, JSON.parse(JSON.stringify(await createBackup(db, admin))));
    expect((await ledger.getFinancialSummary(restored, admin)).expensesCents).toBe(0);
    const [copy] = await restored.query<{ voided_by: string }>(
      'SELECT * FROM expenses WHERE id=$1',
      [expense.id],
    );
    expect(copy.voided_by).toBe(other.id);
  } finally {
    await restored.close();
  }
});
