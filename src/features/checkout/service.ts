import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import type { CheckoutReceipt, Product } from '@/lib/types';
import { assert } from '@/lib/errors';
import type { Member } from '@/features/auth/service';
import { balance, requestHash } from '@/features/ledger/service';
import { selectQuote } from '@/features/piller/quotes';

const schema = z.object({
  idempotencyKey: z.string().min(1).max(100),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(1000),
        expectedPriceCents: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(100),
});
export async function checkout(
  db: Database,
  actor: Member,
  input: unknown,
): Promise<CheckoutReceipt> {
  const p = schema.parse(input);
  const lines = [...p.lines].sort((a, b) => a.productId.localeCompare(b.productId));
  assert(
    new Set(lines.map((l) => l.productId)).size === lines.length,
    'Produit répété dans le panier.',
  );
  const hash = requestHash(lines);
  return db.transaction(async (tx) => {
    const [member] = await tx.query<{ active: boolean }>(
      'SELECT active FROM users WHERE id=$1 FOR UPDATE',
      [actor.id],
    );
    assert(member?.active, 'Compte désactivé.');
    const [existing] = await tx.query<{
      id: string;
      total_cents: number;
      quote_id: string | null;
      request_hash: string;
    }>('SELECT * FROM consumptions WHERE user_id=$1 AND idempotency_key=$2', [
      actor.id,
      p.idempotencyKey,
    ]);
    if (existing) {
      assert(existing.request_hash === hash, 'Cette confirmation appartient à un autre panier.');
      return {
        id: existing.id,
        totalCents: existing.total_cents,
        balanceCents: await balance(tx, actor.id),
        quoteId: existing.quote_id,
        replay: true,
      };
    }
    const resolved = [];
    let total = 0;
    for (const line of lines) {
      const [product] = await tx.query<Product>('SELECT * FROM products WHERE id=$1 FOR UPDATE', [
        line.productId,
      ]);
      assert(product?.active && product.available, 'Un produit du panier est indisponible.');
      assert(
        product.price_cents === line.expectedPriceCents,
        'Un prix a changé. Vérifie le panier et confirme le nouveau montant.',
        'PRICE_CHANGED',
        409,
      );
      total += product.price_cents * line.quantity;
      resolved.push({ product, quantity: line.quantity });
    }
    assert(Number.isSafeInteger(total) && total <= 100000000, 'Le total du panier est trop élevé.');
    const id = randomUUID();
    const [settings] = await tx.query<{ piller_enabled: boolean }>(
      'SELECT piller_enabled FROM settings WHERE id=1',
    );
    const [previous] = await tx.query<{ quote_id: string | null }>(
      'SELECT quote_id FROM consumptions WHERE user_id=$1 AND quote_id IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      [actor.id],
    );
    const quoteId = settings.piller_enabled ? selectQuote(previous?.quote_id, resolved).id : null;
    await tx.query(
      'INSERT INTO consumptions(id,user_id,total_cents,idempotency_key,request_hash,quote_id) VALUES($1,$2,$3,$4,$5,$6)',
      [id, actor.id, total, p.idempotencyKey, hash, quoteId],
    );
    for (const { product, quantity } of resolved)
      await tx.query(
        'INSERT INTO consumption_lines(id,consumption_id,product_id,product_name,unit,quantity,price_cents,cost_micros,is_beverage) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          randomUUID(),
          id,
          product.id,
          product.name,
          product.unit,
          quantity,
          product.price_cents,
          product.cost_micros,
          product.is_beverage,
        ],
      );
    return {
      id,
      totalCents: total,
      balanceCents: await balance(tx, actor.id),
      quoteId,
      replay: false,
    };
  });
}
