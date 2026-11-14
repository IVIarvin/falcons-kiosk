import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestDatabase, type Database } from '@/lib/db';
import { hashToken, resolveSession, sessionCookie } from '@/features/auth/service';
import { POST } from '@/app/api/action/route';

let db: Database;
vi.mock('@/lib/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/db')>()),
  getDatabase: () => db,
}));
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => db.close());

function registration(phone: string, ip: string) {
  return POST(
    new NextRequest('http://localhost/api/action', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'x-real-ip': ip },
      body: JSON.stringify({
        action: 'register',
        data: {
          name: 'Nouveau membre',
          grade: 'Sdt',
          phone,
          password: 'falcons-secret-123',
          role: 'admin',
        },
      }),
    }),
  );
}

it.each([
  ['ip:registration-blocked', 200, 'registration-blocked', '+41791112233'],
  ['phone:+41792223344', 15, 'registration-phone', '+41792223344'],
])(
  'refuse une inscription limitée (%s) avant de créer le compte',
  async (key, attempts, ip, phone) => {
    await db.query('INSERT INTO auth_attempts(key,attempts,started_at) VALUES($1,$2,$3)', [
      hashToken(key),
      attempts,
      Date.now(),
    ]);
    const response = await registration(phone, ip);
    expect(response.status).toBe(429);
    expect(await db.query('SELECT id FROM users WHERE phone=$1', [phone])).toEqual([]);
    const [limit] = await db.query<{ attempts: number }>(
      'SELECT attempts FROM auth_attempts WHERE key=$1',
      [hashToken(key)],
    );
    expect(limit.attempts).toBe(attempts + 1);
  },
);

it('annule le compte si sa session échoue, tout en conservant la tentative', async () => {
  await db.query('ALTER TABLE sessions ADD CONSTRAINT reject_session CHECK(false)');
  try {
    expect((await registration('+41793334455', 'registration-failure')).status).toBe(500);
    expect(await db.query('SELECT id FROM users WHERE phone=$1', ['+41793334455'])).toEqual([]);
    const [limit] = await db.query<{ attempts: number }>(
      'SELECT attempts FROM auth_attempts WHERE key=$1',
      [hashToken('ip:registration-failure')],
    );
    expect(limit.attempts).toBe(1);
  } finally {
    await db.query('ALTER TABLE sessions DROP CONSTRAINT reject_session');
  }
});

it('crée immédiatement un membre et sa session avec une seule tentative', async () => {
  const response = await registration('+41794445566', 'registration-success');
  expect(response.status).toBe(200);
  expect((await response.json()).data.user.role).toBe('member');
  const token = response.cookies.get(sessionCookie)?.value;
  expect(token).toBeTruthy();
  expect((await resolveSession(db, token))?.phone).toBe('+41794445566');
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  expect(response.headers.get('set-cookie')).toContain('SameSite=lax');
  const [limit] = await db.query<{ attempts: number }>(
    'SELECT attempts FROM auth_attempts WHERE key=$1',
    [hashToken('ip:registration-success')],
  );
  expect(limit.attempts).toBe(1);
});
