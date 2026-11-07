import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestDatabase } from '@/lib/db';
import {
  register,
  login,
  resolveSession,
  issueReset,
  resetPassword,
} from '@/features/auth/service';
import { saveProduct } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import { balance, getAccounts, getFinancialSummary } from '@/features/ledger/service';
import { updateMember } from '@/features/admin/service';
import { createBackup, restoreBackup } from '@/lib/backup';
it('supporte 100 comptes et 10 achats simultanés sans perdre les montants', async () => {
  const db = await createTestDatabase();
  try {
    const admin = await register(db, {
      name: 'Responsable',
      grade: 'Cpl',
      phone: '0791111111',
      password: 'falcons-password',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    for (let i = 0; i < 99; i++)
      await db.query(
        'INSERT INTO users(id,name,grade,phone,password_hash) VALUES($1,$2,$3,$4,$5)',
        [
          randomUUID(),
          `Membre ${i}`,
          'Sdt',
          `+4178${String(i).padStart(7, '0')}`,
          'test-placeholder-not-a-login',
        ],
      );
    expect(await getAccounts(db, admin)).toHaveLength(100);
    const product = await saveProduct(db, admin, {
      name: 'Boisson',
      unit: '50 cl',
      category: 'Boissons',
      is_beverage: true,
      price_cents: 100,
      price_mode: 'manual',
      cost_micros: null,
    });
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        checkout(db, admin, {
          idempotencyKey: `concurrent-${i}`,
          lines: [{ productId: product.id, quantity: 1, expectedPriceCents: 100 }],
        }),
      ),
    );
    expect(await balance(db, admin.id)).toBe(1000);
    const finance = await getFinancialSummary(db, admin);
    expect(finance.unknownSalesCents).toBe(1000);
    expect(finance.marginCents).toBe(0);
    expect(finance.coveredSalesCents).toBe(0);
    const backup = JSON.parse(JSON.stringify(await createBackup(db, admin)));
    const restored = await createTestDatabase();
    try {
      await restoreBackup(restored, backup);
      expect(await balance(restored, admin.id)).toBe(1000);
      expect(await getAccounts(restored, admin)).toHaveLength(100);
      await expect(restoreBackup(restored, backup)).rejects.toThrow(/vide/);
    } finally {
      await restored.close();
    }
  } finally {
    await db.close();
  }
});
it('récupération à usage unique, sessions expirées et dernier admin protégé', async () => {
  const db = await createTestDatabase();
  try {
    const admin = await register(db, {
      name: 'Responsable',
      grade: 'Cpl',
      phone: '0792222222',
      password: 'falcons-password',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    const member = await register(db, {
      name: 'Membre',
      grade: 'Sdt',
      phone: '0793333333',
      password: 'falcons-password',
    });
    const session = await login(
      db,
      { phone: member.phone, password: 'falcons-password' },
      'shared-section-ip',
    );
    await db.query("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z' WHERE user_id=$1", [
      member.id,
    ]);
    expect(await resolveSession(db, session.token)).toBeNull();
    const reset = await issueReset(db, admin, member.id);
    await resetPassword(db, { token: reset, password: 'new-falcons-password' });
    await expect(
      resetPassword(db, { token: reset, password: 'again-falcons-password' }),
    ).rejects.toThrow(/invalide/);
    const newSession = await login(
      db,
      { phone: member.phone, password: 'new-falcons-password' },
      'shared-section-ip',
    );
    expect((await resolveSession(db, newSession.token))?.id).toBe(member.id);
    await expect(
      updateMember(db, admin, { id: admin.id, role: 'member', active: true }),
    ).rejects.toThrow(/dernier/);
    await updateMember(db, admin, { id: member.id, role: 'member', active: false });
    expect(await resolveSession(db, newSession.token)).toBeNull();
  } finally {
    await db.close();
  }
});
