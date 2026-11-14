import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import {
  register,
  login,
  resolveSession,
  logout,
  changePassword,
  issueReset,
  resetPassword,
} from '@/features/auth/service';

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
  it('invalide les anciens codes de récupération après un changement de mot de passe', async () => {
    const member = await register(db, {
      name: 'Récupération',
      grade: 'Sdt',
      phone: '0795556677',
      password: 'falcons-secret-123',
    });
    const admin = { ...member, role: 'admin' as const };
    const token = await issueReset(db, admin, member.id);
    const session = await login(
      db,
      { phone: member.phone, password: 'falcons-secret-123' },
      'password-change',
    );
    await changePassword(db, member, {
      current: 'falcons-secret-123',
      password: 'new-falcons-secret',
    });
    await expect(resetPassword(db, { token, password: 'old-code-secret' })).rejects.toThrow(
      /invalide ou expiré/,
    );
    expect(await resolveSession(db, session.token)).toBeNull();
    await expect(
      login(db, { phone: member.phone, password: 'new-falcons-secret' }, 'password-change'),
    ).resolves.toHaveProperty('token');
    const freshToken = await issueReset(db, admin, member.id);
    await expect(
      resetPassword(db, { token: freshToken, password: 'fresh-code-secret' }),
    ).resolves.toBeUndefined();
  });
});
