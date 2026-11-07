import { expect, it } from 'vitest';
import { createTestDatabase, migrate } from '@/lib/db';
it('réexécute la migration sur PostgreSQL embarqué sans perte de données', async () => {
  const db = await createTestDatabase();
  try {
    await migrate(db);
    expect(await db.query('SELECT id FROM settings')).toHaveLength(1);
  } finally {
    await db.close();
  }
});
