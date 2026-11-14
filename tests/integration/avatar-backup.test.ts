import { it, expect } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register, saveAvatar } from '@/features/auth/service';
import { createBackup, restoreBackup } from '@/lib/backup';
it('restaure les avatars et accepte une sauvegarde antérieure sans avatar', async () => {
  const source = await createTestDatabase();
  const restored = await createTestDatabase();
  const legacy = await createTestDatabase();
  try {
    const user = await register(source, {
      name: 'Admin',
      grade: 'Cpl',
      phone: '0793336610',
      password: 'Avatars-demo-2026!',
    });
    await source.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
    user.role = 'admin';
    const seed = 'c066a662-d321-458f-a119-dadf27ddf47b';
    await saveAvatar(source, user, { seed });
    const backup = await createBackup(source, user);
    await restoreBackup(restored, backup);
    expect((await restored.query('SELECT avatar_seed FROM users'))[0].avatar_seed).toBe(seed);
    for (const row of backup.tables.users as Record<string, unknown>[]) delete row.avatar_seed;
    await restoreBackup(legacy, backup);
    expect((await legacy.query('SELECT avatar_seed FROM users'))[0].avatar_seed).toBeNull();
  } finally {
    await source.close();
    await restored.close();
    await legacy.close();
  }
});
