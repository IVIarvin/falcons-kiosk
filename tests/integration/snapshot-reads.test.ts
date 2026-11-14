import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import type { Member } from '@/features/auth/service';
import { getSnapshot } from '@/lib/application';
import { getAccountLedger, getFinancialSummary } from '@/features/ledger/service';
import { previewAutomaticPrices } from '@/features/catalog/service';

let db: Database;
const admin: Member = {
  id: 'admin',
  name: 'Admin',
  grade: 'Cpl',
  phone: '0791112233',
  role: 'admin',
  active: true,
  must_change_password: false,
};
const member: Member = {
  ...admin,
  id: 'member',
  name: 'Membre',
  phone: '0792223344',
  role: 'member',
};
beforeAll(async () => {
  db = await createTestDatabase();
  for (const user of [admin, member])
    await db.query(
      'INSERT INTO users(id,name,grade,phone,role,password_hash) VALUES($1,$2,$3,$4,$5,$6)',
      [user.id, user.name, user.grade, user.phone, user.role, 'unused'],
    );
  await db.query(
    "INSERT INTO products(id,name,unit,price_cents,price_mode,cost_micros) VALUES('product','Produit','pièce',200,'auto',1000000)",
  );
  await db.query('UPDATE settings SET markup_basis_points=3000 WHERE id=1');
  await db.query(
    "INSERT INTO consumptions(id,user_id,total_cents,idempotency_key,request_hash,created_at,reversed_at) VALUES('live','member',800,'live','x',now(),NULL),('void','member',200,'void','x',now()-interval '1 hour',now())",
  );
  await db.query(
    "INSERT INTO consumption_lines(id,consumption_id,product_id,product_name,unit,quantity,removed_quantity,price_cents,cost_micros,is_beverage) VALUES('a','live','product','A','pièce',3,1,200,1000000,true),('b','live','product','B','pièce',2,0,100,NULL,false),('c','void','product','C','pièce',1,0,200,1000000,true)",
  );
  await db.query(
    "INSERT INTO payments(id,user_id,actor_id,cents,kind,idempotency_key,request_hash,received_at) VALUES('paid','member','admin',100,'payment','paid','x',now()),('credit','admin','admin',50,'payment','credit','x',now())",
  );
});
afterAll(async () => {
  await db.close();
});

it('reads shared admin balances, catalogue and settings once per snapshot without stale financial data', async () => {
  const reads: string[] = [];
  const observed: Database = {
    ...db,
    async query<T>(sql: string, params?: unknown[]) {
      reads.push(sql);
      return db.query<T>(sql, params);
    },
  };
  const snapshot = await getSnapshot(observed, admin);
  expect(snapshot.admin!.financial).toMatchObject({
    salesCents: 600,
    coveredSalesCents: 400,
    unknownSalesCents: 200,
    costCents: 200,
    marginCents: 200,
    receivedCents: 150,
    dueCents: 500,
    creditsCents: 50,
  });
  expect(snapshot.admin!.weekFinancial).toMatchObject({ dueCents: 500, creditsCents: 50 });
  expect(snapshot.admin!.priceChanges).toEqual([
    { id: 'product', name: 'Produit', oldPriceCents: 200, newPriceCents: 130 },
  ]);
  expect(reads.filter((sql) => sql.startsWith('SELECT u.id,u.name,u.grade,u.phone'))).toHaveLength(
    1,
  );
  expect(reads.filter((sql) => sql.startsWith('SELECT * FROM products '))).toHaveLength(1);
  expect(reads.filter((sql) => sql === 'SELECT * FROM settings WHERE id=1')).toHaveLength(1);
  await db.query("UPDATE payments SET cents=125 WHERE id='paid'");
  const refreshed = await getSnapshot(db, admin);
  expect(refreshed.admin!.financial.dueCents).toBe(475);
  expect(refreshed.admin!.weekFinancial.dueCents).toBe(475);
  await db.query("UPDATE payments SET cents=100 WHERE id='paid'");
});

it('preserves partial removals, voided history and the member data boundary', async () => {
  const snapshot = await getSnapshot(db, member);
  expect(snapshot.admin).toBeNull();
  expect(snapshot.products[0]).toMatchObject({ cost_micros: null, price_mode: 'manual' });
  expect(snapshot.ledger.balanceCents).toBe(500);
  expect(snapshot.ledger.entries.find((entry) => entry.id === 'live')).toMatchObject({
    cents: 600,
    voided: false,
    lines: [
      { id: 'a', name: 'A', quantity: 3, removedQuantity: 1, priceCents: 200 },
      { id: 'b', name: 'B', quantity: 2, removedQuantity: 0, priceCents: 100 },
    ],
  });
  expect(snapshot.ledger.entries.find((entry) => entry.id === 'void')).toMatchObject({
    cents: 200,
    voided: true,
  });
  await expect(getAccountLedger(db, member, admin.id)).rejects.toThrow(/refusé/);
  await expect(getFinancialSummary(db, member)).rejects.toThrow(/responsable/);
  await expect(previewAutomaticPrices(db, member)).rejects.toThrow(/responsable/);
  await expect(getFinancialSummary(db, member, undefined, undefined, [])).rejects.toThrow(
    /responsable/,
  );
  await expect(
    previewAutomaticPrices(db, member, { products: [], markupBasisPoints: 3000 }),
  ).rejects.toThrow(/responsable/);
});
