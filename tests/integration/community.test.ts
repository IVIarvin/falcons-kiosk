import { expect, it } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register } from '@/features/auth/service';
import { saveProduct } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import { getCommunity } from '@/features/achievements/service';
import { quotes } from '@/features/piller/quotes';
import { reverseConsumption, recordPayment, getAccountLedger } from '@/features/ledger/service';
it('compte les boissons et contributions, conserve la réplique et recalcule les corrections', async () => {
  const db = await createTestDatabase();
  try {
    const u = await register(db, {
      name: 'Membre',
      grade: 'Sdt',
      phone: '0795556677',
      password: 'falcons-password',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
    u.role = 'admin';
    const p = await saveProduct(db, u, {
      name: 'Boisson',
      unit: '50 cl',
      category: 'Boissons',
      is_beverage: true,
      price_cents: 200,
      price_mode: 'manual',
      cost_micros: null,
    });
    const s = await saveProduct(db, u, {
      name: 'Snack',
      unit: '30 g',
      category: 'Snacks',
      is_beverage: false,
      price_cents: 150,
      price_mode: 'manual',
      cost_micros: null,
    });
    const initial = await checkout(db, u, {
      idempotencyKey: 'off',
      lines: [{ productId: s.id, quantity: 1, expectedPriceCents: 150 }],
    });
    expect(initial.quoteId).toBeNull();
    await db.query('UPDATE settings SET piller_enabled=true WHERE id=1');
    const input = {
      idempotencyKey: 'on',
      lines: [
        { productId: p.id, quantity: 3, expectedPriceCents: 200 },
        { productId: s.id, quantity: 2, expectedPriceCents: 150 },
      ],
    };
    const first = await checkout(db, u, input);
    const replay = await checkout(db, u, input);
    expect(quotes.some((q) => q.id === first.quoteId)).toBe(true);
    expect(replay.quoteId).toBe(first.quoteId);
    expect(replay.replay).toBe(true);
    let community = await getCommunity(db, u);
    expect(community.drinks[0].score).toBe(3);
    expect(community.contributors[0].score).toBe(1050);
    expect(community.contributors[0]).not.toHaveProperty('phone');
    expect(community.badges.some((b) => b.type === 'first')).toBe(true);
    await reverseConsumption(db, u, { id: first.id, reason: 'Erreur de panier' });
    community = await getCommunity(db, u);
    expect(community.drinks).toHaveLength(0);
    expect(community.contributors[0].score).toBe(150);
    await reverseConsumption(db, u, { id: initial.id, reason: 'Erreur de panier' });
    expect((await getCommunity(db, u)).badges).toHaveLength(0);
  } finally {
    await db.close();
  }
});

it('réattribue le succès d’une semaine terminée après correction sans perdre l’avoir', async () => {
  const db = await createTestDatabase();
  try {
    const admin = await register(db, {
      name: 'Ancien gagnant',
      grade: 'Cpl',
      phone: '0795551111',
      password: 'falcons-password',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    const other = await register(db, {
      name: 'Nouveau gagnant',
      grade: 'Sdt',
      phone: '0795552222',
      password: 'falcons-password',
    });
    const product = await saveProduct(db, admin, {
      name: 'Eau',
      unit: '50 cl',
      category: 'Boissons',
      is_beverage: true,
      price_cents: 100,
      price_mode: 'manual',
      cost_micros: 0,
    });
    const old = await checkout(db, admin, {
      idempotencyKey: 'old',
      lines: [{ productId: product.id, quantity: 2, expectedPriceCents: 100 }],
    });
    const next = await checkout(db, other, {
      idempotencyKey: 'next',
      lines: [{ productId: product.id, quantity: 1, expectedPriceCents: 100 }],
    });
    await db.query('UPDATE consumptions SET created_at=$1 WHERE id IN ($2,$3)', [
      '2026-03-29T21:59:59Z',
      old.id,
      next.id,
    ]);
    const monday = new Date('2026-03-29T22:00:00Z');
    expect(
      (await getCommunity(db, admin, monday)).badges.some(
        (b) => b.type === 'drinks' && b.period === '2026-03-23',
      ),
    ).toBe(true);
    await recordPayment(db, admin, {
      memberId: admin.id,
      cents: 200,
      kind: 'payment',
      idempotencyKey: 'old-paid',
      receivedAt: new Date().toISOString(),
    });
    await reverseConsumption(db, admin, { id: old.id, reason: 'Ancienne erreur confirmée' });
    expect((await getCommunity(db, admin, monday)).badges).toHaveLength(0);
    expect(
      (await getCommunity(db, other, monday)).badges.some(
        (b) => b.type === 'drinks' && b.period === '2026-03-23',
      ),
    ).toBe(true);
    expect((await getAccountLedger(db, admin)).balanceCents).toBe(-200);
  } finally {
    await db.close();
  }
});
