import { expect, it } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register } from '@/features/auth/service';
import { getAccounts } from '@/features/ledger/service';
import { getServicePeople } from '@/features/service-tickets/service';
it('inscrit un membre en base et dans les listes admin/service avant tout achat', async () => {
  const db = await createTestDatabase();
  try {
    const admin = await register(db, {
      name: 'Responsable',
      grade: 'Cpl',
      phone: '0792227700',
      password: 'Demo-members-2026!',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    const member = await register(db, {
      name: 'Sans achat',
      grade: 'Sdt',
      phone: '0792227701',
      password: 'Demo-members-2026!',
    });
    expect(await db.query('SELECT id FROM consumptions')).toHaveLength(0);
    expect((await getAccounts(db, admin)).find((a) => a.id === member.id)).toMatchObject({
      balanceCents: 0,
      active: true,
    });
    expect((await getServicePeople(db, admin)).members.some((a) => a.id === member.id)).toBe(true);
  } finally {
    await db.close();
  }
});
