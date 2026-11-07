import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { getPillerLibrary, savePillerQuote } from '@/features/piller/service';
import { quotes } from '@/features/piller/quotes';
import { checkout } from '@/features/checkout/service';
import { saveProduct } from '@/features/catalog/service';
import { createBackup, restoreBackup } from '@/lib/backup';
import { getSnapshot, dispatch } from '@/lib/application';

describe('édition des répliques depuis l’administration', () => {
  let db: Database;
  let admin: Member;
  let member: Member;
  beforeAll(async () => {
    db = await createTestDatabase();
    admin = await register(db, {
      name: 'Admin Piller',
      grade: 'Cpl',
      phone: '0799876501',
      password: 'falcons-password',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    member = await register(db, {
      name: 'Membre Piller',
      grade: 'Sdt',
      phone: '0799876502',
      password: 'falcons-password',
    });
  });
  afterAll(async () => db.close());
  const input = {
    id: 'piller-v2-general-1',
    text: 'Ravitaille. Ferme-la. Dégage.',
    topic: 'general',
    enabled: true,
    revision: 0,
  };
  it('réserve l’édition aux responsables, valide les champs et conserve les répliques initiales', async () => {
    expect(await getPillerLibrary(db, admin)).toHaveLength(60);
    await expect(getPillerLibrary(db, member)).rejects.toThrow(/responsable/);
    await expect(dispatch(db, member, 'pillerQuote', input)).rejects.toThrow(/responsable/);
    await expect(savePillerQuote(db, admin, { ...input, text: ' ' })).rejects.toThrow();
    await expect(savePillerQuote(db, admin, { ...input, text: 'x'.repeat(161) })).rejects.toThrow();
    await expect(savePillerQuote(db, admin, { ...input, topic: 'fake' })).rejects.toThrow();
    await expect(savePillerQuote(db, admin, { ...input, id: 'piller-1' })).rejects.toThrow(
      /introuvable/,
    );
  });
  it('persiste les changements, les expose dans l’admin et refuse une édition concurrente périmée', async () => {
    const saved = await savePillerQuote(db, admin, input);
    expect(saved).toMatchObject({ ...input, revision: 1 });
    await expect(
      savePillerQuote(db, admin, { ...input, text: 'Ancienne version' }),
    ).rejects.toThrow(/modifiée/);
    const snapshot = await getSnapshot(db, admin);
    expect(snapshot.admin?.pillerQuotes.find((q) => q.id === input.id)?.text).toBe(input.text);
    expect((await getSnapshot(db, member)).admin).toBeNull();
    expect((await db.query('SELECT id FROM audit WHERE action=$1', ['piller-quote'])).length).toBe(
      1,
    );
  });
  it('fige le texte après achat et à la reprise, même après édition administrative', async () => {
    const product = await saveProduct(db, admin, {
      name: 'Eau Piller',
      unit: '50 cl',
      category: 'Boissons',
      is_beverage: true,
      price_cents: 100,
      price_mode: 'manual',
      cost_micros: null,
    });
    await db.query('UPDATE settings SET piller_enabled=true WHERE id=1');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const order = {
        idempotencyKey: 'piller-before-edit',
        lines: [{ productId: product.id, quantity: 1, expectedPriceCents: 100 }],
      };
      const first = await checkout(db, member, order);
      expect(first.quoteText).toBe(input.text);
      await savePillerQuote(db, admin, {
        ...input,
        revision: 1,
        text: 'Rompez, déception nationale.',
      });
      const replay = await checkout(db, member, order);
      expect(replay.quoteText).toBe(first.quoteText);
      expect(replay.quoteId).toBe(first.quoteId);
      const next = await checkout(db, admin, { ...order, idempotencyKey: 'piller-after-edit' });
      expect(next.quoteText).toBe('Rompez, déception nationale.');
      await db.query('UPDATE consumptions SET quote_text=NULL WHERE id=$1', [first.id]);
      expect((await checkout(db, member, order)).quoteText).toBe(
        quotes.find((q) => q.id === first.quoteId)?.text,
      );
    } finally {
      random.mockRestore();
    }
  });
  it('inclut les éditions dans les sauvegardes et accepte un ancien export', async () => {
    const backup = await createBackup(db, admin);
    const copy = await createTestDatabase();
    try {
      await restoreBackup(copy, backup);
      expect(await getPillerLibrary(copy, admin)).toEqual(await getPillerLibrary(db, admin));
    } finally {
      await copy.close();
    }
    delete backup.tables.piller_quotes;
    for (const row of backup.tables.consumptions as Record<string, unknown>[])
      delete row.quote_text;
    const legacy = await createTestDatabase();
    try {
      await restoreBackup(legacy, backup);
      expect((await getPillerLibrary(legacy, admin))[0].revision).toBe(0);
    } finally {
      await legacy.close();
    }
  });
  it('continue les achats sans commentaire si toutes les répliques sont désactivées', async () => {
    for (const quote of await getPillerLibrary(db, admin))
      await savePillerQuote(db, admin, { ...quote, enabled: false });
    const [product] = await db.query<{ id: string }>('SELECT id FROM products LIMIT 1');
    const receipt = await checkout(db, member, {
      idempotencyKey: 'piller-all-disabled',
      lines: [{ productId: product.id, quantity: 1, expectedPriceCents: 100 }],
    });
    expect(receipt.quoteId).toBeNull();
    expect(receipt.quoteText).toBeNull();
    expect(receipt.totalCents).toBe(100);
  });
});
