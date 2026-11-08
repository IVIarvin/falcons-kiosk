import { expect, it } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register } from '@/features/auth/service';
import { saveProduct, getCatalog } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';

it('déduit boisson et type de la catégorie sans saisie d’unité ni disponibilité', async () => {
  const db = await createTestDatabase();
  try {
    const admin = await register(db, {
      name: 'Admin',
      grade: 'Cpl',
      phone: '0791112233',
      password: 'password-falcons',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    const base = {
      name: 'Produit',
      price_cents: 200,
      price_mode: 'manual',
      cost_micros: 1000000,
      available: false,
    };
    const beer = await saveProduct(db, admin, { ...base, category: 'Bières', is_beverage: false });
    expect(beer).toMatchObject({
      is_beverage: true,
      available: true,
      unit: 'pièce',
      details: { kind: 'beer' },
    });
    const snack = await saveProduct(db, admin, { ...base, category: 'Snacks', is_beverage: true });
    expect(snack).toMatchObject({ is_beverage: false, details: { kind: 'snack' } });
    // Ancien drapeau de stock : il ne doit plus bloquer un produit du catalogue.
    await db.query('UPDATE products SET available=false WHERE id=$1', [beer.id]);
    expect((await getCatalog(db)).find((p) => p.id === beer.id)?.available).toBe(true);
    await expect(
      checkout(db, admin, {
        idempotencyKey: 'legacy-stock',
        lines: [{ productId: beer.id, quantity: 1, expectedPriceCents: 200 }],
      }),
    ).resolves.toMatchObject({ totalCents: 200 });
    await db.query('UPDATE products SET active=false WHERE id=$1', [beer.id]);
    await expect(
      checkout(db, admin, {
        idempotencyKey: 'archived',
        lines: [{ productId: beer.id, quantity: 1, expectedPriceCents: 200 }],
      }),
    ).rejects.toThrow(/indisponible/);
  } finally {
    await db.close();
  }
});
