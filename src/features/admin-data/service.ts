import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import { assert } from '@/lib/errors';
import { createBackup } from '@/lib/backup';
import { hashToken, requireAdmin, verifyAdminPassword, type Member } from '@/features/auth/service';
import { dataTables, deletionOrder, resetTables, type DataTable } from './tables';

async function existingTables(db: Database) {
  const rows = await db.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  return new Set(rows.map((r) => r.table_name));
}
export async function readAdminData(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({
      table: z.enum(Object.keys(dataTables) as [DataTable, ...DataTable[]]).default('users'),
      search: z.string().trim().max(80).default(''),
      page: z.coerce.number().int().min(1).max(100000).default(1),
    })
    .parse(input);
  const existing = await existingTables(db);
  const tables = await Promise.all(
    Object.entries(dataTables)
      .filter(([name]) => existing.has(name))
      .map(async ([name, spec]) => {
        const [row] = await db.query<{ count: string }>(`SELECT count(*) AS count FROM ${name}`);
        return { name, label: spec.label, count: Number(row.count) };
      }),
  );
  assert(existing.has(p.table), 'Cette table n’est pas encore disponible.');
  const spec = dataTables[p.table];
  const where = p.search
    ? `WHERE (${spec.columns.map((c) => `COALESCE(${c}::text,'')`).join(" || ' ' || ")}) ILIKE $1 ESCAPE '\\'`
    : '';
  const pattern = '%' + p.search.replace(/[\\%_]/g, '\\$&') + '%';
  const params = p.search ? [pattern] : [];
  const [count] = await db.query<{ count: string }>(
    `SELECT count(*) AS count FROM ${p.table} ${where}`,
    params,
  );
  const total = Number(count.count),
    pageSize = 25,
    page = Math.min(p.page, Math.max(1, Math.ceil(total / pageSize)));
  const rows = await db.query<Record<string, unknown>>(
    `SELECT ${spec.columns.join(',')} FROM ${p.table} ${where} ORDER BY ${spec.order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { tables, table: p.table, columns: [...spec.columns], rows, total, page, pageSize };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
function fingerprint(tables: Record<string, unknown[]>) {
  const plain = JSON.parse(JSON.stringify(tables)) as Record<string, unknown[]>;
  const ordered = Object.fromEntries(
    Object.entries(plain).map(([name, rows]) => [
      name,
      rows.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ]),
  );
  return createHash('sha256')
    .update(JSON.stringify(canonical(ordered)))
    .digest('hex');
}
export async function prepareDataReset(db: Database, actor: Member) {
  requireAdmin(actor);
  const backup = await createBackup(db, actor);
  const counts = Object.fromEntries(
    Object.entries(backup.tables).map(([table, rows]) => [table, rows.length]),
  );
  const token = randomBytes(32).toString('hex');
  await db.query('DELETE FROM admin_reset_runs WHERE completed_at IS NULL AND expires_at<now()');
  await db.query(
    'INSERT INTO admin_reset_runs(id,actor_id,token_hash,snapshot_hash,counts,expires_at) VALUES($1,$2,$3,$4,$5,$6)',
    [
      randomUUID(),
      actor.id,
      hashToken(token),
      fingerprint(backup.tables),
      JSON.stringify(counts),
      new Date(Date.now() + 600000).toISOString(),
    ],
  );
  return {
    token,
    backup,
    counts,
    adminsPreserved: (backup.tables.users as { role: string }[]).filter((u) => u.role === 'admin')
      .length,
  };
}
export async function resetApplicationData(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      password: z.string().min(1).max(128),
      confirmation: z.literal('RESET FALCONS'),
      backupDownloaded: z.literal(true),
    })
    .parse(input);
  await verifyAdminPassword(db, actor, p.password);
  return db.transaction(async (tx) => {
    await tx.query("SET LOCAL lock_timeout='5s'");
    const existing = await existingTables(tx);
    assert(
      [...existing].every((name) => (resetTables as readonly string[]).includes(name)),
      'La structure de la base a changé. Mets l’application à jour avant de réinitialiser.',
    );
    const locks = resetTables.filter((name) => existing.has(name));
    await tx.query(`LOCK TABLE ${locks.join(',')} IN ACCESS EXCLUSIVE MODE`);
    const [current] = await tx.query<{ role: string; active: boolean }>(
      'SELECT role,active FROM users WHERE id=$1',
      [actor.id],
    );
    assert(
      current?.active && current.role === 'admin',
      'Accès administrateur requis.',
      'FORBIDDEN',
      403,
    );
    const [ticket] = await tx.query<{
      id: string;
      actor_id: string;
      snapshot_hash: string;
      counts: Record<string, number>;
      completed_at: string | null;
      valid: boolean;
      result: unknown;
    }>('SELECT *,expires_at>clock_timestamp() AS valid FROM admin_reset_runs WHERE token_hash=$1', [
      hashToken(p.token),
    ]);
    assert(
      ticket?.actor_id === actor.id,
      'Confirmation introuvable. Prépare une nouvelle sauvegarde.',
    );
    if (ticket.completed_at) return ticket.result;
    assert(ticket.valid, 'La confirmation a expiré. Prépare une nouvelle sauvegarde.');
    // Re-read the backup's business tables under exclusive locks. Authorization/cache
    // tables intentionally stay out, as in the existing backup format.
    const utility = [
      'sessions',
      'reset_tokens',
      'auth_attempts',
      'product_lookup_cache',
      'product_lookup_limits',
      'admin_reset_runs',
    ];
    const names = resetTables.filter((name) => existing.has(name) && !utility.includes(name));
    assert(
      JSON.stringify([...names].sort()) === JSON.stringify(Object.keys(ticket.counts).sort()),
      'La sauvegarde ne couvre plus la base. Prépare une nouvelle sauvegarde.',
      'RESET_CHANGED',
      409,
    );
    const tables = Object.fromEntries(
      await Promise.all(
        names.map(async (name) => [name, await tx.query(`SELECT * FROM ${name}`)] as const),
      ),
    );
    assert(
      fingerprint(tables) === ticket.snapshot_hash,
      'Les données ont changé. Télécharge une nouvelle sauvegarde avant de réinitialiser.',
      'RESET_CHANGED',
      409,
    );
    for (const table of deletionOrder)
      if (existing.has(table)) await tx.query(`DELETE FROM ${table}`);
    await tx.query("DELETE FROM users WHERE role<>'admin'");
    await tx.query('UPDATE settings SET markup_basis_points=0,piller_enabled=false WHERE id=1');
    await tx.query('DELETE FROM admin_reset_runs WHERE id<>$1', [ticket.id]);
    const result = {
      resetAt: new Date().toISOString(),
      adminsPreserved: tables.users.filter((u) => (u as { role: string }).role === 'admin').length,
    };
    await tx.query('UPDATE admin_reset_runs SET completed_at=now(),result=$2 WHERE id=$1', [
      ticket.id,
      JSON.stringify(result),
    ]);
    return result;
  });
}
export type AdminDataResult = Awaited<ReturnType<typeof readAdminData>>;
export type ResetPreparation = Awaited<ReturnType<typeof prepareDataReset>>;
