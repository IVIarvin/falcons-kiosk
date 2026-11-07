import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import type { AccountLedger, LedgerEntry, FinancialSummary } from '@/lib/types';
import { assert } from '@/lib/errors';
import { requireAdmin, type Member } from '@/features/auth/service';

export const requestHash = (data: unknown) =>
  createHash('sha256').update(JSON.stringify(data)).digest('hex');
export async function balance(db: Database, userId: string): Promise<number> {
  const [row] = await db.query<{ value: string | number }>(
    `SELECT COALESCE((SELECT sum(total_cents) FROM consumptions WHERE user_id=$1 AND reversed_at IS NULL),0)-COALESCE((SELECT sum(CASE WHEN kind='payment' THEN cents ELSE -cents END) FROM payments WHERE user_id=$1 AND voided_at IS NULL),0) AS value`,
    [userId],
  );
  return Number(row.value);
}
export async function getAccountLedger(
  db: Database,
  actor: Member,
  userId = actor.id,
): Promise<AccountLedger> {
  assert(
    actor.id === userId || actor.role === 'admin',
    'Accès au compte refusé.',
    'FORBIDDEN',
    403,
  );
  const purchases = await db.query<{
    id: string;
    total_cents: number;
    created_at: string;
    reversed_at: string | null;
    reason: string | null;
  }>(
    'SELECT id,total_cents,created_at,reversed_at,reason FROM consumptions WHERE user_id=$1 ORDER BY created_at DESC',
    [userId],
  );
  const lines = await db.query<{
    consumption_id: string;
    product_name: string;
    quantity: number;
    price_cents: number;
  }>(
    'SELECT l.* FROM consumption_lines l JOIN consumptions c ON c.id=l.consumption_id WHERE c.user_id=$1',
    [userId],
  );
  const payments = await db.query<{
    id: string;
    cents: number;
    kind: 'payment' | 'refund';
    received_at: string;
    voided_at: string | null;
    reason: string | null;
  }>('SELECT * FROM payments WHERE user_id=$1', [userId]);
  const entries: LedgerEntry[] = [
    ...purchases.map((p) => ({
      id: p.id,
      kind: 'consumption' as const,
      cents: p.total_cents,
      at: new Date(p.created_at).toISOString(),
      label: 'Consommation',
      voided: !!p.reversed_at,
      reason: p.reason ?? undefined,
      lines: lines
        .filter((l) => l.consumption_id === p.id)
        .map((l) => ({ name: l.product_name, quantity: l.quantity, priceCents: l.price_cents })),
    })),
    ...payments.map((p) => ({
      id: p.id,
      kind: p.kind,
      cents: p.cents,
      at: new Date(p.received_at).toISOString(),
      label: p.kind === 'payment' ? 'Paiement reçu' : 'Avoir remboursé',
      voided: !!p.voided_at,
      reason: p.reason ?? undefined,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return { balanceCents: await balance(db, userId), entries };
}
export async function getAccounts(db: Database, actor: Member) {
  requireAdmin(actor);
  const members = await db.query<Member & { balance: string }>(
    `SELECT u.id,u.name,u.grade,u.phone,u.role,u.active,u.must_change_password,COALESCE(c.total,0)-COALESCE(p.total,0) AS balance FROM users u LEFT JOIN (SELECT user_id,sum(total_cents) AS total FROM consumptions WHERE reversed_at IS NULL GROUP BY user_id) c ON c.user_id=u.id LEFT JOIN (SELECT user_id,sum(CASE WHEN kind='payment' THEN cents ELSE -cents END) AS total FROM payments WHERE voided_at IS NULL GROUP BY user_id) p ON p.user_id=u.id ORDER BY u.name`,
  );
  return members.map(({ balance: due, ...m }) => ({ ...m, balanceCents: Number(due) }));
}
export async function recordPayment(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({
      memberId: z.string(),
      cents: z.number().int().min(1).max(100000000),
      kind: z.enum(['payment', 'refund']).default('payment'),
      idempotencyKey: z.string().min(1).max(100),
      receivedAt: z.string().datetime().optional(),
    })
    .parse(input);
  const hash = requestHash({
    memberId: p.memberId,
    cents: p.cents,
    kind: p.kind,
    receivedAt: p.receivedAt ?? null,
  });
  return db.transaction(async (tx) => {
    assert(
      (await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [p.memberId])).length,
      'Compte introuvable.',
    );
    const [existing] = await tx.query<{ id: string; request_hash: string }>(
      'SELECT id,request_hash FROM payments WHERE user_id=$1 AND idempotency_key=$2',
      [p.memberId, p.idempotencyKey],
    );
    if (existing) {
      assert(existing.request_hash === hash, 'Cette opération correspond à un autre montant.');
      return { id: existing.id };
    }
    const due = await balance(tx, p.memberId);
    assert(
      p.kind === 'payment' ? p.cents <= due : p.cents <= -due,
      p.kind === 'payment'
        ? 'Le montant dépasse le solde dû.'
        : 'Le montant dépasse l’avoir disponible.',
    );
    const id = randomUUID();
    await tx.query(
      'INSERT INTO payments(id,user_id,actor_id,cents,kind,idempotency_key,request_hash,received_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        id,
        p.memberId,
        actor.id,
        p.cents,
        p.kind,
        p.idempotencyKey,
        hash,
        p.receivedAt ?? new Date().toISOString(),
      ],
    );
    return { id };
  });
}
export async function reverseConsumption(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z.object({ id: z.string(), reason: z.string().trim().min(3).max(300) }).parse(input);
  await db.transaction(async (tx) => {
    const [record] = await tx.query<{ user_id: string }>(
      'SELECT user_id FROM consumptions WHERE id=$1',
      [p.id],
    );
    assert(record, 'Consommation introuvable.');
    await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [record.user_id]);
    const rows = await tx.query(
      'UPDATE consumptions SET reversed_at=now(),reversed_by=$2,reason=$3 WHERE id=$1 AND reversed_at IS NULL RETURNING id',
      [p.id, actor.id, p.reason],
    );
    assert(rows.length, 'Cette consommation est déjà annulée.');
  });
}
export async function voidPayment(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z.object({ id: z.string(), reason: z.string().trim().min(3).max(300) }).parse(input);
  await db.transaction(async (tx) => {
    const [record] = await tx.query<{ user_id: string }>(
      'SELECT user_id FROM payments WHERE id=$1',
      [p.id],
    );
    assert(record, 'Paiement introuvable.');
    await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [record.user_id]);
    const rows = await tx.query(
      'UPDATE payments SET voided_at=now(),reason=$2 WHERE id=$1 AND voided_at IS NULL RETURNING id',
      [p.id, p.reason],
    );
    assert(rows.length, 'Ce paiement est déjà annulé.');
  });
}
export async function recordExpense(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({
      cents: z.number().int().min(1).max(100000000),
      reason: z.string().trim().min(3).max(300),
      spentAt: z.string().datetime(),
    })
    .parse(input);
  await db.query('INSERT INTO expenses(id,cents,reason,spent_at,actor_id) VALUES($1,$2,$3,$4,$5)', [
    randomUUID(),
    p.cents,
    p.reason,
    p.spentAt,
    actor.id,
  ]);
}
export async function completeCosts(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({
      reason: z.string().trim().min(3).max(300),
      lines: z
        .array(z.object({ id: z.string(), costMicros: z.number().int().min(0).max(1000000000000) }))
        .min(1)
        .max(100),
    })
    .parse(input);
  assert(
    new Set(p.lines.map((l) => l.id)).size === p.lines.length,
    'Une ligne ne peut pas être répétée.',
  );
  await db.transaction(async (tx) => {
    for (const line of [...p.lines].sort((a, b) => a.id.localeCompare(b.id))) {
      const [before] = await tx.query<{ cost_micros: string | null; reversed_at: string | null }>(
        'SELECT l.cost_micros,c.reversed_at FROM consumption_lines l JOIN consumptions c ON c.id=l.consumption_id WHERE l.id=$1 FOR UPDATE OF l',
        [line.id],
      );
      assert(before, 'Ligne introuvable.');
      assert(before.cost_micros === null, 'Le coût de cette ligne est déjà renseigné.');
      assert(!before.reversed_at, 'La consommation a été annulée.');
      await tx.query('UPDATE consumption_lines SET cost_micros=$2 WHERE id=$1', [
        line.id,
        line.costMicros,
      ]);
      await tx.query(
        'INSERT INTO audit(id,actor_id,action,reference_id,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          randomUUID(),
          actor.id,
          'complete-cost',
          line.id,
          p.reason,
          JSON.stringify({ cost_micros: null }),
          JSON.stringify({ cost_micros: line.costMicros }),
        ],
      );
    }
  });
}
export async function getFinancialSummary(
  db: Database,
  actor: Member,
  from = '1970-01-01T00:00:00.000Z',
  to = new Date(Date.now() + 86400000).toISOString(),
): Promise<FinancialSummary> {
  requireAdmin(actor);
  const [sales] = await db.query<{ sales: string; covered: string; cost: string; unknown: string }>(
    `SELECT COALESCE(sum(l.quantity*l.price_cents),0) AS sales,COALESCE(sum(CASE WHEN l.cost_micros IS NOT NULL THEN l.quantity*l.price_cents ELSE 0 END),0) AS covered,COALESCE(sum(l.quantity*l.cost_micros),0) AS cost,COALESCE(sum(CASE WHEN l.cost_micros IS NULL THEN l.quantity*l.price_cents ELSE 0 END),0) AS unknown FROM consumption_lines l JOIN consumptions c ON c.id=l.consumption_id WHERE c.reversed_at IS NULL AND c.created_at >= $1 AND c.created_at < $2`,
    [from, to],
  );
  const [purchases] = await db.query<{ value: string }>(
    'SELECT COALESCE(sum(total_cents),0) AS value FROM purchases WHERE purchased_at >= $1 AND purchased_at < $2',
    [from, to],
  );
  const [payment] = await db.query<{ received: string; refunded: string }>(
    `SELECT COALESCE(sum(CASE WHEN kind='payment' THEN cents ELSE 0 END),0) AS received,COALESCE(sum(CASE WHEN kind='refund' THEN cents ELSE 0 END),0) AS refunded FROM payments WHERE voided_at IS NULL AND received_at >= $1 AND received_at < $2`,
    [from, to],
  );
  const [expenses] = await db.query<{ value: string }>(
    'SELECT COALESCE(sum(cents),0) AS value FROM expenses WHERE spent_at >= $1 AND spent_at < $2',
    [from, to],
  );
  const accounts = await getAccounts(db, actor);
  const costCents = Math.round(Number(sales.cost) / 10000);
  return {
    salesCents: Number(sales.sales),
    coveredSalesCents: Number(sales.covered),
    costCents,
    marginCents: Number(sales.covered) - costCents,
    unknownSalesCents: Number(sales.unknown),
    purchasesCents: Number(purchases.value),
    receivedCents: Number(payment.received),
    refundedCents: Number(payment.refunded),
    expensesCents: Number(expenses.value),
    cashChangeCents:
      Number(payment.received) -
      Number(payment.refunded) -
      Number(purchases.value) -
      Number(expenses.value),
    dueCents: accounts.reduce((s, a) => s + Math.max(0, a.balanceCents), 0),
    creditsCents: accounts.reduce((s, a) => s + Math.max(0, -a.balanceCents), 0),
  };
}
