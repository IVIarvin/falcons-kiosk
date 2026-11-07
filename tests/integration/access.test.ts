import { expect, it } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register } from '@/features/auth/service';
import { dispatch, getSnapshot } from '@/lib/application';
it('ne fournit aucune donnée administrative au membre et contrôle les mutations', async () => {
  const db = await createTestDatabase();
  try {
    const user = await register(db, {
      name: 'Membre',
      grade: 'Sdt',
      phone: '0793334455',
      password: 'falcons-password',
    });
    await expect(
      dispatch(db, user, 'settings', { markupBasisPoints: 3000, pillerEnabled: true }),
    ).rejects.toThrow(/responsable/);
    const snapshot = await getSnapshot(db, user);
    expect(snapshot.admin).toBeNull();
    expect(snapshot.user.phone).toBe(user.phone);
    expect(snapshot.community.contributors).toEqual([]);
  } finally {
    await db.close();
  }
});
