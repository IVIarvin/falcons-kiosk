import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDatabase, migrate, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { saveProduct, getCatalog } from '@/features/catalog/service';
import { searchProducts, lookupProduct } from '@/features/catalog/lookup';
import { checkout } from '@/features/checkout/service';
import { quotes } from '@/features/piller/quotes';
import { createBackup, restoreBackup } from '@/lib/backup';

describe('catalogue enrichi', () => {
  let db: Database;
  let admin: Member;
  let member: Member;
  beforeAll(async () => {
    db = await createTestDatabase();
    admin = await register(db, {
      name: 'Admin',
      grade: 'Cpl',
      phone: '0791234567',
      password: 'falcons-password',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    member = await register(db, {
      name: 'Membre',
      grade: 'Sdt',
      phone: '0791234568',
      password: 'falcons-password',
    });
  });
  afterAll(async () => db.close());
  const input = {
    name: 'Bière test',
    unit: '33 cl',
    category: 'Boissons',
    is_beverage: true,
    price_cents: 200,
    price_mode: 'manual',
    cost_micros: null,
  };
  it('persiste les caractéristiques et migre sans perte ; un ancien formulaire préserve les données', async () => {
    const p = await saveProduct(db, admin, {
      ...input,
      details: { kind: 'beer', alcohol: 'none', sugar: 'present', caffeine: 'unknown' },
    });
    expect(p.details.alcohol).toBe('none');
    await migrate(db);
    const updated = await saveProduct(db, admin, { ...input, id: p.id, name: 'Bière corrigée' });
    expect(updated.details.alcohol).toBe('none');
    expect((await getCatalog(db, true)).find((x) => x.id === p.id)?.details.kind).toBe('beer');
  });
  it('réserve les recherches aux responsables et réutilise le cache', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          hits: [{ code: '12345678', product_name: 'Cola', categories_tags: ['en:sodas'] }],
        }),
      ),
    );
    await expect(searchProducts(db, member, { query: 'cola' }, fetcher)).rejects.toThrow(
      /responsable/,
    );
    expect(fetcher).not.toHaveBeenCalled();
    const results = await searchProducts(db, admin, { query: 'cola' }, fetcher);
    expect(results[0].name).toBe('Cola');
    await searchProducts(db, admin, { query: 'cola' }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toContain('search.openfoodfacts.org/search?');
    expect(fetcher.mock.calls[0][1]?.headers).toHaveProperty('User-Agent');
    await expect(searchProducts(db, admin, { query: 'autre référence' }, fetcher)).rejects.toThrow(
      /quelques secondes/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('récupère un code-barres et distingue une erreur du fournisseur d’une liste vide', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 1,
          product: { code: '87654321', product_name: 'Eau', categories_tags: ['en:waters'] },
        }),
      ),
    );
    expect((await lookupProduct(db, admin, { code: '87654321' }, fetcher)).details.kind).toBe(
      'water',
    );
    await db.query('DELETE FROM product_lookup_cache');
    await db.query('DELETE FROM product_lookup_limits');
    await expect(
      searchProducts(
        db,
        admin,
        { query: 'erreur' },
        async () => new Response('{}', { status: 503 }),
      ),
    ).rejects.toThrow(/saisie libre/);
    await db.query('DELETE FROM product_lookup_cache');
    await db.query('DELETE FROM product_lookup_limits');
    await expect(
      searchProducts(db, admin, { query: 'malformé' }, async () => new Response('{}')),
    ).rejects.toThrow(/saisie libre/);
  });
  it('garde la réplique à la reprise même si le produit est ensuite reclassé', async () => {
    const p = await saveProduct(db, admin, {
      ...input,
      details: { kind: 'beer', alcohol: 'none', sugar: 'unknown', caffeine: 'unknown' },
    });
    await db.query('UPDATE settings SET piller_enabled=true WHERE id=1');
    const order = {
      idempotencyKey: 'context',
      lines: [{ productId: p.id, quantity: 1, expectedPriceCents: 200 }],
    };
    const first = await checkout(db, member, order);
    expect(quotes.find((q) => q.id === first.quoteId)?.topic).toBe('general');
    await saveProduct(db, admin, {
      ...input,
      id: p.id,
      details: { kind: 'beer', alcohol: 'present' },
    });
    expect((await checkout(db, member, order)).quoteId).toBe(first.quoteId);
  });
  it('traite un code-barres absent en HTTP 404 comme une référence introuvable', async () => {
    await db.query('DELETE FROM product_lookup_limits');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ status: 0 }), { status: 404 }));
    await expect(searchProducts(db, admin, { query: '00000000' }, fetcher)).resolves.toEqual([]);
  });
  it('restaure les caractéristiques et accepte les anciennes sauvegardes sans métadonnées', async () => {
    const backup = await createBackup(db, admin);
    const copy = await createTestDatabase();
    try {
      await restoreBackup(copy, backup);
      expect((await getCatalog(copy, true))[0].details).toEqual(
        (await getCatalog(db, true))[0].details,
      );
    } finally {
      await copy.close();
    }
    for (const p of backup.tables.products as Record<string, unknown>[]) delete p.details;
    const legacy = await createTestDatabase();
    try {
      await restoreBackup(legacy, backup);
      expect((await getCatalog(legacy, true))[0].details.kind).toBe('unknown');
    } finally {
      await legacy.close();
    }
  });
});
