import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import {
  saveProduct,
  recordPurchase,
  previewAutomaticPrices,
  publishPrices,
} from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import {
  getAccountLedger,
  recordPayment,
  reverseConsumption,
  voidPayment,
  getFinancialSummary,
} from '@/features/ledger/service';

describe('catalogue et journal financier', () => {
  let db: Database;
  let admin: Member;
  let member: Member;
  let productId: string;
  let purchaseId: string;
  beforeAll(async () => {
    db = await createTestDatabase();
    admin = await register(db, {
      name: 'Responsable',
      grade: 'Cpl',
      phone: '0791112233',
      password: 'password-falcons',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    member = await register(db, {
      name: 'Martin',
      grade: 'Sdt',
      phone: '0792223344',
      password: 'password-falcons',
    });
  });
  afterAll(async () => {
    await db.close();
  });
  it('réserve le catalogue admin, trace les achats et attend la publication des tarifs', async () => {
    const input = {
      name: 'Rivella',
      unit: '50 cl',
      category: 'Boissons',
      is_beverage: true,
      price_cents: 100,
      price_mode: 'auto',
      cost_micros: 1000000,
      image: '/products/rivella.png',
      available: true,
      active: true,
    };
    await expect(saveProduct(db, member, input)).rejects.toThrow(/responsable/);
    const product = await saveProduct(db, admin, input);
    productId = product.id;
    await recordPurchase(db, admin, {
      productId,
      quantity: 24,
      totalCents: 2400,
      purchasedAt: new Date().toISOString(),
    });
    await db.query('UPDATE settings SET markup_basis_points=3000 WHERE id=1');
    const preview = await previewAutomaticPrices(db, admin);
    expect(preview[0].newPriceCents).toBe(130);
    expect(
      (
        await db.query<{ price_cents: number }>('SELECT price_cents FROM products WHERE id=$1', [
          productId,
        ])
      )[0].price_cents,
    ).toBe(100);
    await publishPrices(db, admin, preview);
  });
  it('fige les tarifs, refuse prix falsifié et double requête, même concurrente', async () => {
    await expect(
      checkout(db, member, {
        idempotencyKey: 'wrong',
        lines: [{ productId, quantity: 2, expectedPriceCents: 1 }],
      }),
    ).rejects.toThrow(/prix/);
    const input = {
      idempotencyKey: 'first-order',
      lines: [{ productId, quantity: 10, expectedPriceCents: 130 }],
    };
    const [a, b] = await Promise.all([checkout(db, member, input), checkout(db, member, input)]);
    expect(a.id).toBe(b.id);
    expect(a.totalCents).toBe(1300);
    purchaseId = a.id;
    expect((await getAccountLedger(db, member)).balanceCents).toBe(1300);
    await expect(
      checkout(db, member, {
        ...input,
        lines: [{ productId, quantity: 1, expectedPriceCents: 130 }],
      }),
    ).rejects.toThrow(/autre/);
    await db.query('UPDATE products SET price_cents=250 WHERE id=$1', [productId]);
    expect((await getAccountLedger(db, member)).balanceCents).toBe(1300);
  });
  it('distingue achats, marge, ventes et argent effectivement reçu', async () => {
    const summary = await getFinancialSummary(db, admin);
    expect(summary.salesCents).toBe(1300);
    expect(summary.marginCents).toBe(300);
    expect(summary.purchasesCents).toBe(2400);
    expect(summary.receivedCents).toBe(0);
    expect(summary.cashChangeCents).toBe(-2400);
  });
  it('conserve une nouvelle consommation après demande et gère les paiements partiels', async () => {
    await checkout(db, member, {
      idempotencyKey: 'second-order',
      lines: [{ productId, quantity: 4, expectedPriceCents: 250 }],
    });
    await recordPayment(db, admin, {
      memberId: member.id,
      cents: 2000,
      idempotencyKey: 'payment-one',
    });
    expect((await getAccountLedger(db, member)).balanceCents).toBe(300);
    await expect(
      recordPayment(db, admin, { memberId: member.id, cents: 400, idempotencyKey: 'too-much' }),
    ).rejects.toThrow(/solde/);
  });
  it('ne compte pas deux encaissements simultanés et garde un avoir correctif', async () => {
    const results = await Promise.allSettled([
      recordPayment(db, admin, { memberId: member.id, cents: 300, idempotencyKey: 'p-a' }),
      recordPayment(db, admin, { memberId: member.id, cents: 300, idempotencyKey: 'p-b' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await reverseConsumption(db, admin, { id: purchaseId, reason: 'Erreur de saisie' });
    expect((await getAccountLedger(db, member)).balanceCents).toBe(-1300);
    await expect(
      recordPayment(db, admin, {
        memberId: member.id,
        cents: 1400,
        kind: 'refund',
        idempotencyKey: 'bad-refund',
      }),
    ).rejects.toThrow(/avoir/);
    const refund = await recordPayment(db, admin, {
      memberId: member.id,
      cents: 1300,
      kind: 'refund',
      idempotencyKey: 'refund',
    });
    expect((await getAccountLedger(db, member)).balanceCents).toBe(0);
    await voidPayment(db, admin, { id: refund.id, reason: 'Remboursement non effectué' });
    expect((await getAccountLedger(db, member)).balanceCents).toBe(-1300);
  });
  it('ne révèle pas le compte d’un autre membre', async () => {
    await expect(getAccountLedger(db, member, admin.id)).rejects.toThrow(/accès|Accès/);
  });
});
