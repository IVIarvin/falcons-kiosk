import { readFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

export interface Database {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

async function schema() {
  const directory = path.join(process.cwd(), 'db/migrations');
  const files = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  return (
    await Promise.all(files.map((name) => readFile(path.join(directory, name), 'utf8')))
  ).join('\n');
}

export async function createTestDatabase(directory?: string): Promise<Database> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite(directory);
  await pg.waitReady;
  await pg.exec(await schema());
  const wrap = (client: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  }): Database => ({
    async query<T>(sql: string, params?: unknown[]) {
      return (await client.query(sql, params)).rows as T[];
    },
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      return pg.transaction((tx) => fn(wrap(tx)));
    },
    async close() {
      await pg.close();
    },
  });
  return wrap(pg);
}

async function connect(): Promise<Database> {
  if (!process.env.DATABASE_URL) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production')
      throw new Error('DATABASE_URL manque : configure une base PostgreSQL persistante.');
    const directory = path.join(process.cwd(), '.data/postgres');
    await mkdir(path.dirname(directory), { recursive: true });
    return createTestDatabase(directory);
  }
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  const db: Database = {
    async query<T>(sql: string, params?: unknown[]) {
      return (await pool.query(sql, params)).rows as T[];
    },
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx: Database = {
          ...db,
          async query<U>(sql: string, params?: unknown[]) {
            return (await client.query(sql, params)).rows as U[];
          },
          transaction: async () => {
            throw new Error('Transaction imbriquée interdite.');
          },
        };
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
  return db;
}
const globalDb = globalThis as unknown as { falconsDatabase?: Promise<Database> };
export function getDatabase(): Promise<Database> {
  return (globalDb.falconsDatabase ??= connect());
}
export async function migrate(db: Database) {
  await db.transaction(async (tx) => {
    for (const statement of (await schema())
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean))
      await tx.query(statement);
  });
}
