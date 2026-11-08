import type { Database } from './db';
import { assert } from './errors';
import { requireAdmin, type Member } from '@/features/auth/service';
const columns: Record<string, string[]> = {
  piller_quotes: ['id', 'text', 'topic', 'enabled', 'revision'],
  users: [
    'id',
    'name',
    'grade',
    'phone',
    'password_hash',
    'role',
    'active',
    'must_change_password',
    'created_at',
  ],
  products: [
    'details',
    'id',
    'name',
    'unit',
    'category',
    'is_beverage',
    'price_cents',
    'price_mode',
    'cost_micros',
    'image',
    'active',
    'available',
    'created_at',
  ],
  purchases: [
    'idempotency_key',
    'request_hash',
    'id',
    'product_id',
    'quantity',
    'total_cents',
    'purchased_at',
    'actor_id',
    'created_at',
  ],
  consumptions: [
    'id',
    'user_id',
    'total_cents',
    'idempotency_key',
    'request_hash',
    'quote_id',
    'quote_text',
    'created_at',
    'reversed_at',
    'reversed_by',
    'reason',
  ],
  consumption_lines: [
    'removed_quantity',
    'id',
    'consumption_id',
    'product_id',
    'product_name',
    'unit',
    'quantity',
    'price_cents',
    'cost_micros',
    'is_beverage',
  ],
  consumption_removals: [
    'id',
    'user_id',
    'line_id',
    'quantity',
    'idempotency_key',
    'request_hash',
    'created_at',
  ],
  payments: [
    'id',
    'user_id',
    'actor_id',
    'cents',
    'kind',
    'idempotency_key',
    'request_hash',
    'received_at',
    'created_at',
    'voided_at',
    'reason',
  ],
  expenses: [
    'id',
    'cents',
    'reason',
    'spent_at',
    'actor_id',
    'idempotency_key',
    'request_hash',
    'voided_at',
    'voided_by',
    'void_reason',
  ],
  audit: [
    'id',
    'actor_id',
    'action',
    'reference_id',
    'reason',
    'before_data',
    'after_data',
    'created_at',
  ],
  settings: ['id', 'markup_basis_points', 'piller_enabled'],
};
export async function createBackup(db: Database, actor: Member) {
  requireAdmin(actor);
  return db.transaction(async (tx) => {
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const tables: Record<string, unknown[]> = {};
    for (const table of Object.keys(columns))
      tables[table] = await tx.query(`SELECT * FROM ${table}`);
    return { format: 'falcons-backup-v1' as const, createdAt: new Date().toISOString(), tables };
  });
}
export async function restoreBackup(db: Database, input: unknown) {
  assert(input && typeof input === 'object', 'Format de sauvegarde invalide.');
  const backup = input as { format?: unknown; tables?: Record<string, unknown> };
  assert(backup.format === 'falcons-backup-v1' && backup.tables, 'Format de sauvegarde invalide.');
  for (const name of Object.keys(columns))
    assert(
      (['piller_quotes', 'consumption_removals'].includes(name) &&
        backup.tables[name] === undefined) ||
        Array.isArray(backup.tables[name]),
      `Table absente : ${name}.`,
    );
  await db.transaction(async (tx) => {
    const [{ count }] = await tx.query<{ count: string }>('SELECT count(*) AS count FROM users');
    assert(Number(count) === 0, 'La restauration exige une base vide.');
    for (const [name, fields] of Object.entries(columns)) {
      const rows = (backup.tables![name] ?? []) as Record<string, unknown>[];
      assert(rows.length <= 500000, 'Sauvegarde trop volumineuse.');
      for (const row of rows) {
        const values = fields.map((field) => {
          const value =
            row[field] ??
            (name === 'products' && field === 'details'
              ? {}
              : name === 'consumption_lines' && field === 'removed_quantity'
                ? 0
                : null);
          return (name === 'products' && field === 'details') ||
            (name === 'audit' &&
              (field === 'before_data' || field === 'after_data') &&
              value !== null)
            ? JSON.stringify(value)
            : value;
        });
        const update =
          name === 'settings'
            ? ` ON CONFLICT(id) DO UPDATE SET markup_basis_points=EXCLUDED.markup_basis_points,piller_enabled=EXCLUDED.piller_enabled`
            : '';
        await tx.query(
          `INSERT INTO ${name}(${fields.join(',')}) VALUES(${fields.map((_, i) => `$${i + 1}`).join(',')})${update}`,
          values,
        );
      }
    }
  });
}
