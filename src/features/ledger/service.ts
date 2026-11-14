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
    `SELECT COALESCE((SELECT sum((l.quantity-l.removed_quantity)*l.price_cents) FROM consumptions c JOIN consumption_lines l ON l.consumption_id=c.id WHERE c.user_id=$1 AND c.reversed_at IS NULL),0)-COALESCE((SELECT sum(CASE WHEN kind='payment' THEN cents ELSE -cents END) FROM payments WHERE user_id=$1 AND voided_at IS NULL),0) AS value`,
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
    origin: 'kiosk' | 'free' | 'patch';
    created_at: string;
    reversed_at: string | null;
    reason: string | null;
  }>(
    'SELECT id,total_cents,origin,created_at,reversed_at,reason FROM consumptions WHERE user_id=$1 ORDER BY created_at DESC',
    [userId],
  );
  const lines = await db.query<{
    id: string;
    consumption_id: string;
    product_name: string;
    quantity: number;
    removed_quantity: number;
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
  const groupedLines = new Map<
    string,
    { cents: number; lines: NonNullable<LedgerEntry['lines']> }
  >();
  for (const line of lines) {
    let group = groupedLines.get(line.consumption_id);
    if (!group) {
      group = { cents: 0, lines: [] };
      groupedLines.set(line.consumption_id, group);
    }
    group.cents += (line.quantity - line.removed_quantity) * line.price_cents;
    group.lines.push({
      id: line.id,
      name: line.product_name,
      quantity: line.quantity,
      removedQuantity: line.removed_quantity,
      priceCents: line.price_cents,
    });
  }
  const entries: LedgerEntry[] = [
    ...purchases.map((p) => ({
      id: p.id,
      kind: 'consumption' as const,
      cents: groupedLines.get(p.id)?.cents ?? 0,
      at: new Date(p.created_at).toISOString(),
      label:
        p.origin === 'free'
          ? 'Article libre'
          : p.origin === 'patch'
            ? 'Précommande de patchs'
            : 'Consommation',
      voided: !!p.reversed_at,
      removableUntil:
        p.origin === 'patch'
          ? undefined
          : new Date(new Date(p.created_at).getTime() + 600000).toISOString(),
      reason: p.reason ?? undefined,
      lines: groupedLines.get(p.id)?.lines ?? [],
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
    `SELECT u.id,u.name,u.grade,u.phone,u.role,u.active,u.must_change_password,COALESCE(c.total,0)-COALESCE(p.total,0) AS balance FROM users u LEFT JOIN (SELECT c.user_id,sum((l.quantity-l.removed_quantity)*l.price_cents) AS total FROM consumptions c JOIN consumption_lines l ON l.consumption_id=c.id WHERE c.reversed_at IS NULL GROUP BY c.user_id) c ON c.user_id=u.id LEFT JOIN (SELECT user_id,sum(CASE WHEN kind='payment' THEN cents ELSE -cents END) AS total FROM payments WHERE voided_at IS NULL GROUP BY user_id) p ON p.user_id=u.id ORDER BY u.name`,
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
export async function removeConsumptionLine(db: Database, actor: Member, input: unknown) {
  const p = z
    .object({
      lineId: z.string().min(1),
      quantity: z.number().int().min(1).max(1000),
      idempotencyKey: z.string().min(1).max(100),
    })
    .parse(input);
  const hash = requestHash({ lineId: p.lineId, quantity: p.quantity });
  return db.transaction(async (tx) => {
    // Same lock order as checkout, payments and admin corrections.
    await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [actor.id]);
    const [existing] = await tx.query<{ id: string; request_hash: string }>(
      'SELECT id,request_hash FROM consumption_removals WHERE user_id=$1 AND idempotency_key=$2',
      [actor.id, p.idempotencyKey],
    );
    if (existing) {
      assert(existing.request_hash === hash, 'Cette confirmation correspond à un autre retrait.');
      return { id: existing.id };
    }
    const [line] = await tx.query<{
      user_id: string;
      quantity: number;
      removed_quantity: number;
      reversed_at: string | null;
      within_deadline: boolean;
      origin: string;
    }>(
      `SELECT c.user_id,c.origin,l.quantity,l.removed_quantity,c.reversed_at,c.created_at+interval '10 minutes'>clock_timestamp() AS within_deadline FROM consumption_lines l JOIN consumptions c ON c.id=l.consumption_id WHERE l.id=$1 FOR UPDATE OF l`,
      [p.lineId],
    );
    assert(
      line && line.user_id === actor.id,
      'Accès à cette consommation refusé.',
      'FORBIDDEN',
      403,
    );
    assert(
      line.origin !== 'patch',
      'Ces patchs ont été commandés. Demande une correction au responsable.',
    );
    assert(!line.reversed_at, 'Cette consommation est déjà annulée.');
    assert(
      line.within_deadline,
      'Les 10 minutes sont écoulées. Demande une correction à un administrateur.',
    );
    assert(
      p.quantity <= line.quantity - line.removed_quantity,
      'Cette quantité a déjà été retirée de ton ardoise.',
    );
    const id = randomUUID();
    await tx.query(
      'UPDATE consumption_lines SET removed_quantity=removed_quantity+$2 WHERE id=$1',
      [p.lineId, p.quantity],
    );
    await tx.query(
      'INSERT INTO consumption_removals(id,user_id,line_id,quantity,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6)',
      [id, actor.id, p.lineId, p.quantity, p.idempotencyKey, hash],
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [
        randomUUID(),
        actor.id,
        'self-remove',
        p.lineId,
        'Article non pris — retrait dans les 10 minutes',
        JSON.stringify({ removed_quantity: line.removed_quantity }),
        JSON.stringify({ removed_quantity: line.removed_quantity + p.quantity }),
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
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,after_data) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), actor.id, 'payment-void', p.id, p.reason, JSON.stringify({ voided: true })],
    );
  });
}
export async function recordExpense(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({
      cents: z.number().int().min(1).max(100000000),
      reason: z.string().trim().min(3).max(300),
      spentAt: z.string().datetime(),
      idempotencyKey: z.string().min(1).max(100),
    })
    .parse(input);
  const { idempotencyKey, ...values } = p;
  const hash = requestHash(values);
  return db.transaction(async (tx) => {
    await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [actor.id]);
    const [existing] = await tx.query<{ id: string; request_hash: string }>(
      'SELECT id,request_hash FROM expenses WHERE actor_id=$1 AND idempotency_key=$2',
      [actor.id, idempotencyKey],
    );
    if (existing) {
      assert(existing.request_hash === hash, 'Cette confirmation correspond à une autre dépense.');
      return { id: existing.id };
    }
    const id = randomUUID();
    await tx.query(
      'INSERT INTO expenses(id,cents,reason,spent_at,actor_id,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [id, p.cents, p.reason, p.spentAt, actor.id, idempotencyKey, hash],
    );
    return { id };
  });
}
export async function voidExpense(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z.object({ id: z.string(), reason: z.string().trim().min(3).max(300) }).parse(input);
  const rows = await db.query(
    'UPDATE expenses SET voided_at=now(),voided_by=$2,void_reason=$3 WHERE id=$1 AND voided_at IS NULL RETURNING id',
    [p.id, actor.id, p.reason],
  );
  assert(rows.length, 'Dépense introuvable ou déjà annulée.');
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
  snapshotAccounts?: Awaited<ReturnType<typeof getAccounts>>,
): Promise<FinancialSummary> {
  requireAdmin(actor);
  const [sales] = await db.query<{ sales: string; covered: string; cost: string; unknown: string }>(
    `SELECT COALESCE(sum((l.quantity-l.removed_quantity)*l.price_cents),0) AS sales,COALESCE(sum(CASE WHEN l.cost_micros IS NOT NULL THEN (l.quantity-l.removed_quantity)*l.price_cents ELSE 0 END),0) AS covered,COALESCE(sum((l.quantity-l.removed_quantity)*l.cost_micros),0) AS cost,COALESCE(sum(CASE WHEN l.cost_micros IS NULL THEN (l.quantity-l.removed_quantity)*l.price_cents ELSE 0 END),0) AS unknown FROM consumption_lines l JOIN consumptions c ON c.id=l.consumption_id WHERE c.reversed_at IS NULL AND c.created_at >= $1 AND c.created_at < $2`,
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
    'SELECT COALESCE(sum(cents),0) AS value FROM expenses WHERE voided_at IS NULL AND spent_at >= $1 AND spent_at < $2',
    [from, to],
  );
  const accounts = snapshotAccounts ?? (await getAccounts(db, actor));
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
