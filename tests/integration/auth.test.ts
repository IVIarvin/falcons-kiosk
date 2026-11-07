import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, login, resolveSession, logout } from '@/features/auth/service';

describe('comptes autonomes et sessions', () => {
  let db: Database;
  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.close();
  });
  it('inscrit immédiatement, normalise le téléphone et ignore un rôle fourni', async () => {
    const member = await register(db, {
      name: 'Martin',
      grade: 'Sdt',
      phone: '079 123 45 67',
      password: 'falcons-secret-123',
      role: 'admin',
    });
    expect(member.role).toBe('member');
    expect(member.phone).toBe('+41791234567');
    await expect(
      register(db, {
        name: 'Autre',
        grade: 'Sdt',
        phone: '+41 79 123 45 67',
        password: 'falcons-secret-123',
      }),
    ).rejects.toThrow(/déjà/);
    const rows = await db.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id=$1',
      [member.id],
    );
    expect(rows[0].password_hash).not.toContain('falcons-secret');
  });
  it('refuse le mauvais mot de passe et révoque une session à la déconnexion', async () => {
    await expect(
      login(db, { phone: '0791234567', password: 'incorrect-password' }, 'test-ip'),
    ).rejects.toThrow(/incorrect/);
    const session = await login(
      db,
      { phone: '0791234567', password: 'falcons-secret-123' },
      'test-ip',
    );
    expect((await resolveSession(db, session.token))?.name).toBe('Martin');
    await logout(db, session.token);
    expect(await resolveSession(db, session.token)).toBeNull();
  });
});
