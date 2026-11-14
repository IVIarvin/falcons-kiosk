import { afterEach, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { saveProduct } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import { recordFreeEntry } from '@/features/free-entry/service';
import { getCommunity } from '@/features/achievements/service';
import { getAccountLedger, reverseConsumption } from '@/features/ledger/service';
import {
  createPatchCampaign,
  getPatchBoard,
  reservePatch,
  updatePatchEstimate,
  confirmPatchOrder,
} from '@/features/patches/service';
import { createBackup, restoreBackup } from '@/lib/backup';
let db: Database;
afterEach(async () => db?.close());
it('reprend seulement les anciens achats explicitement alcoolisés puis fige leur classification', async () => {
  const { admin, member } = await setup();
  const beer = await product(admin, 'Bière', 'Boissons alcoolisées');
  const water = await product(admin, 'Eau', 'Boissons sans alcool');
  await checkout(db, member, {
    idempotencyKey: 'legacy',
    lines: [
      { productId: beer.id, quantity: 2, expectedPriceCents: 100 },
      { productId: water.id, quantity: 8, expectedPriceCents: 100 },
    ],
  });
  await recordFreeEntry(db, member, {
    name: 'Bière libre',
    category: 'Boissons alcoolisées',
    quantity: 1,
    priceCents: 100,
    idempotencyKey: 'legacy-free',
  });
  await recordFreeEntry(db, member, {
    name: 'Article inconnu',
    category: 'Autre',
    quantity: 5,
    priceCents: 100,
    idempotencyKey: 'legacy-unknown',
  });
  await db.query('ALTER TABLE consumption_lines DROP COLUMN is_alcoholic');
  const sql = await readFile('db/migrations/010_alcohol_patch_quantity.sql', 'utf8');
  const migrate = async () => {
    for (const statement of sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean))
      await db.query(statement);
  };
  await migrate();
  expect((await getCommunity(db, member)).drinks[0].score).toBe(3);
  await saveProduct(db, admin, { ...beer, category: 'Boissons sans alcool' });
  await migrate();
  expect((await getCommunity(db, member)).drinks[0].score).toBe(3);
});
async function setup() {
  db = await createTestDatabase();
  const admin = await register(db, {
    name: 'Admin',
    grade: 'Cpl',
    phone: '0791112233',
    password: 'password-falcons',
  });
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
  admin.role = 'admin';
  const member = await register(db, {
    name: 'Membre',
    grade: 'Sdt',
    phone: '0792223344',
    password: 'password-falcons',
  });
  return { admin, member };
}
async function product(admin: Member, name: string, category: string) {
  return saveProduct(db, admin, {
    name,
    category,
    price_cents: 100,
    price_mode: 'manual',
    cost_micros: null,
    is_beverage: true,
  });
}
it('classe uniquement l’alcool, instantané stable après modification du catalogue et correction', async () => {
  const { admin, member } = await setup();
  const beer = await product(admin, 'Bière', 'Boissons alcoolisées');
  const water = await product(admin, 'Eau', 'Boissons sans alcool');
  const unknown = await product(admin, 'Boisson à classer', 'À classer');
  const receipt = await checkout(db, member, {
    idempotencyKey: 'mixed',
    lines: [
      { productId: beer.id, quantity: 2, expectedPriceCents: 100 },
      { productId: water.id, quantity: 8, expectedPriceCents: 100 },
      { productId: unknown.id, quantity: 5, expectedPriceCents: 100 },
    ],
  });
  expect((await getCommunity(db, member)).drinks.map((r) => r.score)).toEqual([2]);
  await saveProduct(db, admin, {
    ...beer,
    category: 'Boissons sans alcool',
    price_mode: 'manual',
    cost_micros: null,
    price_cents: 100,
  });
  expect((await getCommunity(db, member)).drinks[0].score).toBe(2);
  await recordFreeEntry(db, member, {
    name: 'Bière oubliée',
    category: 'Boissons alcoolisées',
    quantity: 1,
    priceCents: 150,
    idempotencyKey: 'free-beer',
  });
  await recordFreeEntry(db, member, {
    name: 'Eau oubliée',
    category: 'Boissons sans alcool',
    quantity: 20,
    priceCents: 100,
    idempotencyKey: 'free-water',
  });
  expect((await getCommunity(db, member)).drinks[0].score).toBe(3);
  await reverseConsumption(db, admin, { id: receipt.id, reason: 'Erreur de saisie' });
  expect((await getCommunity(db, member)).drinks[0].score).toBe(1);
});
it('défaut100pièces, seuil en quantité indépendant du prix et protection contre un objectif obsolète', async () => {
  const { admin, member } = await setup();
  const baseline = await createPatchCampaign(db, admin, {
    name: 'Défaut',
    priceCents: 500,
    deadline: '2099-12-31',
  });
  expect((await getPatchBoard(db, member)).find((c) => c.id === baseline.id)).toHaveProperty(
    'minimumQuantity',
    100,
  );
  const { id } = await createPatchCampaign(db, admin, {
    name: 'Minimum trois',
    priceCents: 10000,
    minimumQuantity: 3,
    deadline: '2099-12-31',
  });
  await reservePatch(db, member, {
    campaignId: id,
    quantity: 2,
    expectedPriceCents: 10000,
    idempotencyKey: 'reserve-two',
  });
  await expect(
    confirmPatchOrder(db, admin, {
      campaignId: id,
      expectedTotalQuantity: 2,
      expectedPriceCents: 10000,
      expectedMinimumQuantity: 3,
      finalPriceCents: 10000,
      idempotencyKey: 'too-few',
    }),
  ).rejects.toThrow(/minimum|quantité/);
  expect((await getAccountLedger(db, member)).balanceCents).toBe(0);
  await reservePatch(db, member, {
    campaignId: id,
    quantity: 3,
    expectedPriceCents: 10000,
    idempotencyKey: 'reserve-three',
  });
  await updatePatchEstimate(db, admin, { campaignId: id, priceCents: 10, minimumQuantity: 3 });
  const input = {
    campaignId: id,
    expectedTotalQuantity: 3,
    expectedPriceCents: 10,
    expectedMinimumQuantity: 2,
    finalPriceCents: 10,
    idempotencyKey: 'stale-goal',
  };
  await expect(confirmPatchOrder(db, admin, input)).rejects.toMatchObject({
    code: 'PRICE_CHANGED',
  });
  const valid = { ...input, expectedMinimumQuantity: 3, idempotencyKey: 'order' };
  expect((await confirmPatchOrder(db, admin, valid)).totalCents).toBe(30);
  expect((await confirmPatchOrder(db, admin, valid)).replay).toBe(true);
  expect((await getAccountLedger(db, member)).balanceCents).toBe(30);
});
it('restaure les nouveaux champs et reprend une ancienne sauvegarde sans eux', async () => {
  const { admin, member } = await setup();
  const beer = await product(admin, 'Bière', 'Boissons alcoolisées');
  await checkout(db, member, {
    idempotencyKey: 'beer',
    lines: [{ productId: beer.id, quantity: 1, expectedPriceCents: 100 }],
  });
  await createPatchCampaign(db, admin, {
    name: 'Test sauvegarde',
    priceCents: 300,
    minimumQuantity: 12,
    deadline: '2099-12-31',
  });
  const backup = await createBackup(db, admin);
  expect(backup.tables.consumption_lines[0]).toHaveProperty('is_alcoholic', true);
  const restored = await createTestDatabase();
  try {
    await restoreBackup(restored, backup);
    expect((await getPatchBoard(restored, member))[0]).toHaveProperty('minimumQuantity', 12);
    expect((await getCommunity(restored, member)).drinks[0].score).toBe(1);
  } finally {
    await restored.close();
  }
  for (const row of backup.tables.consumption_lines as Record<string, unknown>[])
    delete row.is_alcoholic;
  for (const row of backup.tables.patch_campaigns as Record<string, unknown>[])
    delete row.minimum_quantity;
  for (const row of backup.tables.products as Record<string, unknown>[]) delete row.details;
  const legacy = await createTestDatabase();
  try {
    await restoreBackup(legacy, backup);
    expect((await getPatchBoard(legacy, member))[0]).toHaveProperty('minimumQuantity', 100);
    expect((await getCommunity(legacy, member)).drinks[0].score).toBe(1);
    await checkout(legacy, member, {
      idempotencyKey: 'restored-next',
      lines: [{ productId: beer.id, quantity: 1, expectedPriceCents: 100 }],
    });
    expect((await getCommunity(legacy, member)).drinks[0].score).toBe(2);
  } finally {
    await legacy.close();
  }
});
