import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, login, resolveSession, type Member } from '@/features/auth/service';
import { saveProduct } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import {
  readAdminData,
  prepareDataReset,
  resetApplicationData,
} from '@/features/admin-data/service';

let db: Database, admin: Member, otherAdmin: Member, member: Member, productId: string;
const password = 'Falcons-test-data!';
beforeAll(async () => {
  db = await createTestDatabase();
  admin = await register(db, { name: 'Admin', grade: 'Cpl', phone: '0791112233', password });
  otherAdmin = await register(db, {
    name: 'Autre admin',
    grade: 'Sgt',
    phone: '0791112234',
    password,
  });
  member = await register(db, { name: 'Membre', grade: 'Sdt', phone: '0791112235', password });
  await db.query("UPDATE users SET role='admin' WHERE id IN ($1,$2)", [admin.id, otherAdmin.id]);
  admin.role = 'admin';
  otherAdmin.role = 'admin';
  productId = (
    await saveProduct(db, admin, {
      name: 'Eau minérale',
      category: 'Boissons sans alcool',
      price_cents: 100,
      price_mode: 'manual',
      cost_micros: null,
    })
  ).id;
});
afterAll(async () => db.close());
it('réserve la consultation aux admins et ne fournit aucun secret de compte', async () => {
  await expect(readAdminData(db, member, {})).rejects.toThrow(/responsable/);
  const result = await readAdminData(db, admin, { table: 'users', search: 'Autre', page: 1 });
  expect(result.total).toBe(1);
  expect(result.rows[0]).toMatchObject({ name: 'Autre admin' });
  expect(JSON.stringify(result)).not.toMatch(/password_hash|token_hash|scrypt\$/);
  await expect(readAdminData(db, admin, { table: 'sessions' })).rejects.toThrow();
  await expect(readAdminData(db, admin, { table: 'users;DROP TABLE users' })).rejects.toThrow();
});
it('refuse le reset à un membre, un mot de passe erroné ou une confirmation absente', async () => {
  await expect(prepareDataReset(db, member)).rejects.toThrow(/responsable/);
  const prepared = await prepareDataReset(db, admin);
  const input = {
    token: prepared.token,
    password,
    confirmation: 'RESET FALCONS',
    backupDownloaded: true,
  };
  await expect(resetApplicationData(db, member, input)).rejects.toThrow(/responsable/);
  await expect(
    resetApplicationData(db, admin, { ...input, password: 'incorrect' }),
  ).rejects.toThrow(/mot de passe|Mot de passe/);
  await expect(resetApplicationData(db, admin, { ...input, confirmation: '' })).rejects.toThrow();
  expect(await db.query('SELECT id FROM products')).toHaveLength(1);
});
it('pagine les données sans interpréter les caractères de recherche comme des jokers', async () => {
  await db.query(
    "INSERT INTO products(id,name,unit,category,price_cents) SELECT 'page-'||i,'Pagination '||i,'pièce','Snacks salés',100 FROM generate_series(1,26) i",
  );
  expect(
    (await readAdminData(db, admin, { table: 'products', search: 'Pagination', page: 1 })).rows,
  ).toHaveLength(25);
  expect(
    (await readAdminData(db, admin, { table: 'products', search: 'Pagination', page: 2 })).rows,
  ).toHaveLength(1);
  expect((await readAdminData(db, admin, { table: 'products', search: '%', page: 1 })).total).toBe(
    0,
  );
  await db.query("DELETE FROM products WHERE id LIKE 'page-%'");
});
it('refuse les tickets expirés ou préparés par un autre administrateur', async () => {
  const prepared = await prepareDataReset(db, admin);
  const input = {
    token: prepared.token,
    password,
    confirmation: 'RESET FALCONS',
    backupDownloaded: true,
  };
  await expect(resetApplicationData(db, otherAdmin, input)).rejects.toThrow(
    /Confirmation introuvable/,
  );
  await db.query(
    "UPDATE admin_reset_runs SET expires_at=now()-interval '1 second' WHERE actor_id=$1 AND completed_at IS NULL",
    [admin.id],
  );
  await expect(resetApplicationData(db, admin, input)).rejects.toThrow(/expiré/);
});
it('refuse une ancienne sauvegarde quand une consommation a été ajoutée', async () => {
  const prepared = await prepareDataReset(db, admin);
  await checkout(db, member, {
    idempotencyKey: 'after-backup',
    lines: [{ productId, quantity: 1, expectedPriceCents: 100 }],
  });
  await expect(
    resetApplicationData(db, admin, {
      token: prepared.token,
      password,
      confirmation: 'RESET FALCONS',
      backupDownloaded: true,
    }),
  ).rejects.toThrow(/changé|changées|nouvelle sauvegarde/);
  expect(await db.query('SELECT id FROM consumptions')).toHaveLength(1);
});
it('efface aussi les tables006, conserve tous les admins et révoque les sessions', async () => {
  await db.query('UPDATE users SET active=false WHERE id=$1', [otherAdmin.id]);
  const session = await login(db, { phone: admin.phone, password }, 'data-test');
  await db.query(
    "INSERT INTO patch_campaigns(id,name,price_cents,deadline,actor_id) VALUES('reset-campaign','Patch',500,'2099-01-01',$1)",
    [admin.id],
  );
  await db.query(
    "INSERT INTO patch_reservations(id,campaign_id,user_id,quantity) VALUES('reset-reservation','reset-campaign',$1,2)",
    [member.id],
  );
  await db.query(
    "INSERT INTO extra_requests(user_id,action,idempotency_key,request_hash,result) VALUES($1,'reservePatch','reset-request','hash','{}')",
    [member.id],
  );
  const before = await db.query("SELECT * FROM users WHERE role='admin' ORDER BY id");
  const prepared = await prepareDataReset(db, admin);
  expect(prepared.backup.tables.patch_reservations).toHaveLength(1);
  const input = {
    token: prepared.token,
    password,
    confirmation: 'RESET FALCONS',
    backupDownloaded: true,
  };
  await resetApplicationData(db, admin, input);
  expect(await db.query('SELECT * FROM users ORDER BY id')).toEqual(before);
  for (const table of [
    'products',
    'consumptions',
    'consumption_lines',
    'patch_campaigns',
    'patch_reservations',
    'extra_requests',
    'sessions',
    'piller_quotes',
  ])
    expect(await db.query(`SELECT * FROM ${table}`)).toHaveLength(0);
  expect(await resolveSession(db, session.token)).toBeNull();
  const fresh = await saveProduct(db, admin, {
    name: 'Après reset',
    category: 'Snacks salés',
    price_cents: 100,
    price_mode: 'manual',
    cost_micros: null,
  });
  await resetApplicationData(db, admin, input);
  expect(await db.query('SELECT id FROM products')).toEqual([{ id: fresh.id }]);
});
