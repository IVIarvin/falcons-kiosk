import { expect, it } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register } from '@/features/auth/service';
import { updateMember } from '@/features/admin/service';
import { saveProduct } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import { completeCosts, getFinancialSummary } from '@/features/ledger/service';
it('corrige les coordonnées par admin avec trace et complète explicitement un coût inconnu', async () => {
  const db = await createTestDatabase();
  try {
    const actor = await register(db, {
      name: 'Admin',
      grade: 'Cpl',
      phone: '0794444444',
      password: 'falcons-password',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [actor.id]);
    actor.role = 'admin';
    const member = await register(db, {
      name: 'Membre',
      grade: 'Sdt',
      phone: '0795555555',
      password: 'falcons-password',
    });
    await updateMember(db, actor, {
      id: member.id,
      role: 'member',
      active: true,
      name: 'Nom corrigé',
      grade: 'App',
      phone: '0796666666',
    });
    expect(
      (
        await db.query<{ name: string; phone: string }>(
          'SELECT name,phone FROM users WHERE id=$1',
          [member.id],
        )
      )[0],
    ).toEqual({ name: 'Nom corrigé', phone: '+41796666666' });
    const product = await saveProduct(db, actor, {
      name: 'Boisson',
      unit: '50 cl',
      category: 'Boissons',
      is_beverage: true,
      price_cents: 250,
      price_mode: 'manual',
      cost_micros: null,
    });
    const order = await checkout(db, member, {
      idempotencyKey: 'missing-cost',
      lines: [{ productId: product.id, quantity: 1, expectedPriceCents: 250 }],
    });
    const [line] = await db.query<{ id: string }>(
      'SELECT id FROM consumption_lines WHERE consumption_id=$1',
      [order.id],
    );
    await completeCosts(db, actor, {
      reason: 'Prix d’achat retrouvé',
      lines: [{ id: line.id, costMicros: 1000000 }],
    });
    const f = await getFinancialSummary(db, actor);
    expect(f.unknownSalesCents).toBe(0);
    expect(f.marginCents).toBe(150);
    await expect(
      completeCosts(db, actor, { reason: 'Autre coût', lines: [{ id: line.id, costMicros: 0 }] }),
    ).rejects.toThrow(/déjà/);
    expect((await db.query('SELECT id FROM audit')).length).toBe(2);
  } finally {
    await db.close();
  }
});
