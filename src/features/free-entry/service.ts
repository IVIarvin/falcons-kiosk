import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import type { Member } from '@/features/auth/service';
import type { CheckoutReceipt } from '@/lib/types';
import { assert } from '@/lib/errors';
import { balance, requestHash } from '@/features/ledger/service';
import { replayRequest, saveRequest } from '@/lib/extra-requests';
import { productCategories, classifyDetails } from '@/features/catalog/categories';
import { selectQuote } from '@/features/piller/quotes';
import { getPillerQuotes } from '@/features/piller/service';

const schema = z.object({
  idempotencyKey: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(120),
  category: z.enum([
    'Boissons sans alcool',
    'Boissons alcoolisées',
    'Snacks salés',
    'Snacks sucrés',
    'Autre',
  ]).default('Autre'),
  quantity: z.number().int().min(1).max(1000),
  priceCents: z.number().int().min(0).max(1000000),
});
export async function recordFreeEntry(
  db: Database,
  actor: Member,
  input: unknown,
): Promise<CheckoutReceipt> {
  const { idempotencyKey, ...data } = schema.parse(input);
  const hash = requestHash(data);
  const total = data.quantity * data.priceCents;
  assert(Number.isSafeInteger(total) && total <= 100000000, 'Le total est trop élevé.');
  return db.transaction(async (tx) => {
    const [user] = await tx.query<{ active: boolean }>(
      'SELECT active FROM users WHERE id=$1 FOR UPDATE',
      [actor.id],
    );
    assert(user?.active, 'Compte désactivé.', 'AUTH', 401);
    const previous = await replayRequest<CheckoutReceipt>(
      tx,
      actor.id,
      'freeCheckout',
      idempotencyKey,
      hash,
    );
    if (previous) return { ...previous, balanceCents: await balance(tx, actor.id), replay: true };
    const family = productCategories.find((c) => c.label === data.category);
    const [settings] = await tx.query<{ piller_enabled: boolean }>(
      'SELECT piller_enabled FROM settings WHERE id=1',
    );
    const [last] = await tx.query<{ quote_id: string | null }>(
      'SELECT quote_id FROM consumptions WHERE user_id=$1 AND quote_id IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      [actor.id],
    );
    const quote = settings.piller_enabled
      ? selectQuote(
          last?.quote_id,
          [
            {
              quantity: data.quantity,
              product: { is_beverage: family?.beverage ?? false, details: classifyDetails(data.category) },
            },
          ],
          await getPillerQuotes(tx),
        )
      : undefined;
    const id = randomUUID();
    await tx.query(
      'INSERT INTO consumptions(id,user_id,total_cents,idempotency_key,request_hash,quote_id,quote_text,origin) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        id,
        actor.id,
        total,
        `free:${randomUUID()}`,
        hash,
        quote?.id ?? null,
        quote?.text ?? null,
        'free',
      ],
    );
    await tx.query(
      'INSERT INTO consumption_lines(id,consumption_id,product_id,product_name,unit,quantity,price_cents,cost_micros,is_beverage) VALUES($1,$2,NULL,$3,$4,$5,$6,NULL,$7)',
      [randomUUID(), id, data.name, 'pièce', data.quantity, data.priceCents, family?.beverage ?? false],
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,after_data) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        actor.id,
        'free-checkout',
        id,
        'Article absent du catalogue',
        JSON.stringify(data),
      ],
    );
    const result: CheckoutReceipt = {
      id,
      totalCents: total,
      balanceCents: await balance(tx, actor.id),
      quoteId: quote?.id ?? null,
      quoteText: quote?.text ?? null,
      replay: false,
    };
    await saveRequest(tx, actor.id, 'freeCheckout', idempotencyKey, hash, result);
    return result;
  });
}
