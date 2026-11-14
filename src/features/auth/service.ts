import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import { assert, DomainError } from '@/lib/errors';

const derive = promisify(scrypt);
export type Member = {
  id: string;
  name: string;
  grade: string;
  phone: string;
  role: 'member' | 'admin';
  active: boolean;
  must_change_password: boolean;
};
export const sessionCookie = 'falcons_session';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function normalizePhone(value: string) {
  const parsed = parsePhoneNumberFromString(value, 'CH');
  assert(parsed && parsed.isValid(), 'Numéro de téléphone invalide.');
  return parsed.number as string;
}
const fields = 'id,name,grade,phone,role,active,must_change_password';
const passwordSchema = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères.')
  .max(128);
async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await derive(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}
async function passwordMatches(password: string, stored: string) {
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const key = (await derive(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === key.length && timingSafeEqual(key, expected);
}
export async function register(db: Database, input: unknown): Promise<Member> {
  const data = z
    .object({
      name: z.string().trim().min(2).max(90),
      grade: z.string().trim().min(1).max(30),
      phone: z.string().max(35),
      password: passwordSchema,
    })
    .parse(input);
  const phone = normalizePhone(data.phone);
  try {
    const rows = await db.query<Member>(
      `INSERT INTO users(id,name,grade,phone,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING ${fields}`,
      [randomUUID(), data.name, data.grade, phone, await passwordHash(data.password)],
    );
    return rows[0];
  } catch (e) {
    if ((e as { code?: string }).code === '23505')
      throw new DomainError(
        'Ce numéro possède déjà un compte. Connecte-toi ou contacte le responsable.',
      );
    throw e;
  }
}
async function throttle(db: Database, key: string) {
  const now = Date.now();
  const [row] = await db.query<{ attempts: number }>(
    `INSERT INTO auth_attempts(key,attempts,started_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.started_at<$3 THEN 1 ELSE auth_attempts.attempts+1 END, started_at=CASE WHEN auth_attempts.started_at<$3 THEN $2 ELSE auth_attempts.started_at END RETURNING attempts`,
    [hashToken(key), now, now - 900000],
  );
  assert(
    row.attempts <= (key.startsWith('ip:') ? 200 : 15),
    'Trop de tentatives. Réessaie dans 15 minutes.',
    'RATE_LIMIT',
    429,
  );
}
export async function login(db: Database, input: unknown, clientKey: string) {
  const data = z.object({ phone: z.string().max(35), password: z.string().max(128) }).parse(input);
  await throttle(db, `ip:${clientKey}`);
  const phone = normalizePhone(data.phone);
  await throttle(db, `phone:${phone}`);
  const [user] = await db.query<Member & { password_hash: string }>(
    `SELECT ${fields},password_hash FROM users WHERE phone=$1`,
    [phone],
  );
  const valid = user
    ? await passwordMatches(data.password, user.password_hash)
    : await passwordMatches(data.password, await passwordHash('dummy-password'));
  assert(user?.active && valid, 'Téléphone ou mot de passe incorrect.', 'AUTH', 401);
  return createSession(db, user);
}
export async function registerAndLogin(db: Database, input: unknown, clientKey: string) {
  const data = z.object({ phone: z.string().max(35) }).parse(input);
  // Attempts must survive a rejected registration or a failed account/session transaction.
  await throttle(db, `ip:${clientKey}`);
  await throttle(db, `phone:${normalizePhone(data.phone)}`);
  return db.transaction(async (tx) => createSession(tx, await register(tx, input)));
}
async function createSession(db: Database, user: Member) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 86400000);
  await db.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [
    hashToken(token),
    user.id,
    expires,
  ]);
  return { token, expires, user: publicMember(user) };
}
export const publicMember = (user: Member): Member => ({
  id: user.id,
  name: user.name,
  grade: user.grade,
  phone: user.phone,
  role: user.role,
  active: user.active,
  must_change_password: user.must_change_password,
});
export async function resolveSession(db: Database, token?: string): Promise<Member | null> {
  if (!token) return null;
  const rows = await db.query<Member>(
    `SELECT ${fields
      .split(',')
      .map((f) => `u.${f}`)
      .join(
        ',',
      )} FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}
export async function logout(db: Database, token: string) {
  await db.query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]);
}
export function requireAdmin(user: Member) {
  assert(user.role === 'admin', 'Accès réservé au responsable.', 'FORBIDDEN', 403);
}
export async function verifyAdminPassword(db: Database, actor: Member, password: string) {
  requireAdmin(actor);
  await throttle(db, `admin-reset:${actor.id}`);
  const [user] = await db.query<Member & { password_hash: string }>(
    'SELECT role,active,password_hash FROM users WHERE id=$1',
    [actor.id],
  );
  assert(user?.active && user.role === 'admin', 'Accès administrateur requis.', 'FORBIDDEN', 403);
  assert(
    await passwordMatches(password, user.password_hash),
    'Mot de passe actuel incorrect.',
    'PASSWORD_CONFIRM',
    403,
  );
}
export async function updateProfile(db: Database, user: Member, input: unknown) {
  const data = z
    .object({
      name: z.string().trim().min(2).max(90),
      grade: z.string().trim().min(1).max(30),
      phone: z.string().max(35),
    })
    .parse(input);
  try {
    return (
      await db.query<Member>(
        `UPDATE users SET name=$2,grade=$3,phone=$4 WHERE id=$1 RETURNING ${fields}`,
        [user.id, data.name, data.grade, normalizePhone(data.phone)],
      )
    )[0];
  } catch (e) {
    if ((e as { code?: string }).code === '23505')
      throw new DomainError('Ce numéro est déjà utilisé.');
    throw e;
  }
}
export async function changePassword(db: Database, user: Member, input: unknown) {
  const data = z.object({ current: z.string().max(128), password: passwordSchema }).parse(input);
  const [row] = await db.query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id=$1',
    [user.id],
  );
  assert(await passwordMatches(data.current, row.password_hash), 'Mot de passe actuel incorrect.');
  await db.transaction(async (tx) => {
    await tx.query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1', [
      user.id,
      await passwordHash(data.password),
    ]);
    await tx.query('DELETE FROM sessions WHERE user_id=$1', [user.id]);
    await tx.query('UPDATE reset_tokens SET used=true WHERE user_id=$1', [user.id]);
  });
}
export async function issueReset(db: Database, actor: Member, userId: string) {
  requireAdmin(actor);
  const token = randomBytes(20).toString('hex');
  await db.query('INSERT INTO reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [
    hashToken(token),
    userId,
    new Date(Date.now() + 15 * 60000),
  ]);
  return token;
}
export async function resetPassword(db: Database, input: unknown) {
  const data = z
    .object({ token: z.string().min(20).max(100), password: passwordSchema })
    .parse(input);
  await db.transaction(async (tx) => {
    const [reset] = await tx.query<{ user_id: string }>(
      'SELECT user_id FROM reset_tokens WHERE token_hash=$1 AND used=false AND expires_at>now() FOR UPDATE',
      [hashToken(data.token)],
    );
    assert(reset, 'Code de récupération invalide ou expiré.');
    await tx.query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1', [
      reset.user_id,
      await passwordHash(data.password),
    ]);
    await tx.query('UPDATE reset_tokens SET used=true WHERE user_id=$1', [reset.user_id]);
    await tx.query('DELETE FROM sessions WHERE user_id=$1', [reset.user_id]);
  });
}
