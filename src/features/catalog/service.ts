import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import type { Product, PriceChange } from '@/lib/types';
import { assert } from '@/lib/errors';
import { priceFromCost } from '@/lib/money';
import { requireAdmin, type Member } from '@/features/auth/service';
import { detailsSchema } from './details';
import { categoryForProduct, classifyDetails, legacyKinds, productCategories } from './categories';
import { requestHash } from '@/features/ledger/service';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(90),
  unit: z.string().trim().min(1).max(40).default('pièce'),
  category: z.string().trim().min(1).max(40),
  is_beverage: z.boolean().default(false),
  price_cents: z.number().int().min(0).max(100000000),
  price_mode: z.enum(['auto', 'manual']),
  cost_micros: z.number().int().min(0).max(1000000000000).nullable(),
  image: z.string().max(1000).default(''),
  active: z.boolean().default(true),
  available: z.boolean().default(true),
  details: detailsSchema.optional(),
});
function mapProduct(row: Product): Product {
  const details = classifyDetails(row.category, detailsSchema.parse(row.details ?? {}));
  return {
    ...row,
    available: true,
    details,
    category: categoryForProduct(row.category, details, row.is_beverage),
    cost_micros: row.cost_micros === null ? null : Number(row.cost_micros),
  };
}
export async function getCatalog(db: Database, admin = false): Promise<Product[]> {
  const products = (
    await db.query<Product>(
      `SELECT * FROM products ${admin ? '' : 'WHERE active=true'} ORDER BY category,name`,
    )
  ).map(mapProduct);
  return products;
}
export async function saveProduct(db: Database, actor: Member, input: unknown): Promise<Product> {
  requireAdmin(actor);
  const p = productSchema.parse(input);
  const classification = productCategories.find((c) => c.label === p.category);
  const [existing] =
    p.id && !p.details
      ? await db.query<{ details: unknown }>('SELECT details FROM products WHERE id=$1', [p.id])
      : [];
  p.details = classifyDetails(
    p.category,
    detailsSchema.parse(p.details ?? existing?.details ?? {}),
  );
  if (classification) p.is_beverage = classification.beverage;
  else if (legacyKinds[p.category] === 'snack') p.is_beverage = false;
  else if (
    p.category === 'Boissons' ||
    (legacyKinds[p.category] && legacyKinds[p.category] !== 'snack')
  )
    p.is_beverage = true;
  p.available = true;
  assert(
    !p.image || p.image.startsWith('/products/') || /^https:\/\//.test(p.image),
    'Utilise une image locale de produit ou une adresse HTTPS.',
  );
  assert(
    p.price_mode === 'manual' || p.cost_micros !== null,
    'Un coût de référence est nécessaire au calcul automatique.',
  );
  const id = p.id ?? randomUUID();
  const rows = await db.query<Product>(
    `INSERT INTO products(id,name,unit,category,is_beverage,price_cents,price_mode,cost_micros,image,active,available,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12::jsonb,'{}'::jsonb)) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,unit=EXCLUDED.unit,category=EXCLUDED.category,is_beverage=EXCLUDED.is_beverage,price_cents=EXCLUDED.price_cents,price_mode=EXCLUDED.price_mode,cost_micros=EXCLUDED.cost_micros,image=EXCLUDED.image,active=EXCLUDED.active,available=EXCLUDED.available,details=COALESCE($12::jsonb,products.details) RETURNING *`,
    [
      id,
      p.name,
      p.unit,
      p.category,
      p.is_beverage,
      p.price_cents,
      p.price_mode,
      p.cost_micros,
      p.image,
      p.active,
      p.available,
      p.details ? JSON.stringify(p.details) : null,
    ],
  );
  return mapProduct(rows[0]);
}
const purchaseSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100000),
  totalCents: z.number().int().min(0).max(100000000),
  purchasedAt: z.string().datetime(),
});
export async function recordPurchase(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = purchaseSchema.extend({ idempotencyKey: z.string().min(1).max(100) }).parse(input);
  const { idempotencyKey, ...values } = p;
  const hash = requestHash(values);
  const id = randomUUID();
  return db.transaction(async (tx) => {
    await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [actor.id]);
    const [existing] = await tx.query<{ id: string; request_hash: string }>(
      'SELECT id,request_hash FROM purchases WHERE actor_id=$1 AND idempotency_key=$2',
      [actor.id, idempotencyKey],
    );
    if (existing) {
      assert(existing.request_hash === hash, 'Cette confirmation correspond à un autre achat.');
      return { id: existing.id };
    }
    assert(
      (await tx.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [p.productId])).length,
      'Produit introuvable.',
    );
    await tx.query(
      'INSERT INTO purchases(id,product_id,quantity,total_cents,purchased_at,actor_id,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, p.productId, p.quantity, p.totalCents, p.purchasedAt, actor.id, idempotencyKey, hash],
    );
    await refreshCost(tx, p.productId);
    return { id };
  });
}
async function refreshCost(db: Database, productId: string) {
  const [latest] = await db.query<{ quantity: number; total_cents: number }>(
    'SELECT quantity,total_cents FROM purchases WHERE product_id=$1 ORDER BY purchased_at DESC,created_at DESC LIMIT 1',
    [productId],
  );
  if (latest)
    await db.query('UPDATE products SET cost_micros=$2 WHERE id=$1', [
      productId,
      Math.round((latest.total_cents * 10000) / latest.quantity),
    ]);
}
export async function correctPurchase(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = purchaseSchema
    .extend({ id: z.string(), reason: z.string().trim().min(3).max(300) })
    .parse(input);
  await db.transaction(async (tx) => {
    const [before] = await tx.query('SELECT * FROM purchases WHERE id=$1 FOR UPDATE', [p.id]);
    assert(before, 'Achat introuvable.');
    assert(
      String(before.product_id) === p.productId,
      'Le produit d’un achat ne peut pas être changé.',
    );
    await tx.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [p.productId]);
    await tx.query('UPDATE purchases SET quantity=$2,total_cents=$3,purchased_at=$4 WHERE id=$1', [
      p.id,
      p.quantity,
      p.totalCents,
      p.purchasedAt,
    ]);
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [
        randomUUID(),
        actor.id,
        'purchase-correct',
        p.id,
        p.reason,
        JSON.stringify(before),
        JSON.stringify(p),
      ],
    );
    await refreshCost(tx, p.productId);
  });
}
export async function previewAutomaticPrices(
  db: Database,
  actor: Member,
  snapshot?: { products: Product[]; markupBasisPoints: number },
): Promise<PriceChange[]> {
  requireAdmin(actor);
  const markupBasisPoints = snapshot
    ? snapshot.markupBasisPoints
    : (await db.query<{ markup_basis_points: number }>('SELECT * FROM settings WHERE id=1'))[0]
        .markup_basis_points;
  return (snapshot?.products ?? (await getCatalog(db, true)))
    .filter((p) => p.active && p.price_mode === 'auto' && p.cost_micros !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      oldPriceCents: p.price_cents,
      newPriceCents: priceFromCost(p.cost_micros!, markupBasisPoints),
    }))
    .filter((p) => p.oldPriceCents !== p.newPriceCents);
}
export async function publishPrices(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const changes = z
    .array(
      z.object({
        id: z.string(),
        oldPriceCents: z.number().int(),
        newPriceCents: z.number().int(),
      }),
    )
    .max(1000)
    .parse(input);
  await db.transaction(async (tx) => {
    const [settings] = await tx.query<{ markup_basis_points: number }>(
      'SELECT * FROM settings WHERE id=1 FOR UPDATE',
    );
    for (const change of [...changes].sort((a, b) => a.id.localeCompare(b.id))) {
      const [raw] = await tx.query<Product>('SELECT * FROM products WHERE id=$1 FOR UPDATE', [
        change.id,
      ]);
      assert(raw, 'Produit introuvable.');
      const p = mapProduct(raw);
      assert(
        p.price_mode === 'auto' &&
          p.cost_micros !== null &&
          p.price_cents === change.oldPriceCents &&
          priceFromCost(p.cost_micros, settings.markup_basis_points) === change.newPriceCents,
        'Les prix ont changé. Actualise l’aperçu.',
      );
      await tx.query('UPDATE products SET price_cents=$2 WHERE id=$1', [
        p.id,
        change.newPriceCents,
      ]);
    }
  });
}
