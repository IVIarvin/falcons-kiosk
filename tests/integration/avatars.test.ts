import { it, expect } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register, saveAvatar, login, resolveSession } from '@/features/auth/service';
import { getAccounts } from '@/features/ledger/service';
import { getServicePeople } from '@/features/service-tickets/service';
it('enregistre uniquement son avatar et le retrouve dans session et listes admin', async () => {
  const db = await createTestDatabase();
  try {
    const a = await register(db, {
      name: 'Admin',
      grade: 'Cpl',
      phone: '0793336600',
      password: 'Avatars-demo-2026!',
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [a.id]);
    a.role = 'admin';
    const b = await register(db, {
      name: 'Membre',
      grade: 'Sdt',
      phone: '0793336601',
      password: 'Avatars-demo-2026!',
    });
    const seed = 'c066a662-d321-458f-a119-dadf27ddf47b';
    await saveAvatar(db, b, { seed });
    expect((await getAccounts(db, a)).find((u) => u.id === b.id)?.avatar_seed).toBe(seed);
    expect((await getServicePeople(db, a)).members.find((u) => u.id === b.id)?.avatar_seed).toBe(
      seed,
    );
    const session = await login(
      db,
      { phone: b.phone, password: 'Avatars-demo-2026!' },
      'avatar-test',
    );
    expect((await resolveSession(db, session.token))?.avatar_seed).toBe(seed);
    await expect(saveAvatar(db, b, { seed, userId: a.id })).rejects.toThrow();
    await expect(saveAvatar(db, b, { seed: '<svg>' })).rejects.toThrow();
    expect((await getAccounts(db, a)).find((u) => u.id === a.id)?.avatar_seed).toBeNull();
  } finally {
    await db.close();
  }
});
