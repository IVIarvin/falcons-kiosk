import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { checkout } from '@/features/checkout/service';
import {
  balance,
  getFinancialSummary,
  removeConsumptionLine,
  reverseConsumption,
} from '@/features/ledger/service';
import { getCommunity } from '@/features/achievements/service';
import { dispatch, getSnapshot } from '@/lib/application';
import { createBackup, restoreBackup } from '@/lib/backup';
import { prepareDataReset, resetApplicationData } from '@/features/admin-data/service';

const password = 'Falcons-ticket-test!';
const period = { from: '2026-11-11', to: '2026-11-11' };
type Board = {
  rows: {
    memberId: string;
    productId: string;
    served: number;
    declared: number;
    missing: number;
  }[];
  tickets: { id: string; voidedAt: string | null; actorName: string }[];
};
let db: Database, admin: Member, member: Member, other: Member;
const record = (key: string, memberId = member.id, productId = 'beer') =>
  dispatch(db, admin, 'recordServiceTicket', {
    memberId,
    productId,
    idempotencyKey: key,
  }) as Promise<{ id: string }>;
const board = () => dispatch(db, admin, 'serviceBoard', period) as Promise<Board>;
const dateTickets = () => db.query("UPDATE service_tickets SET created_at='2026-11-11T18:00:00Z'");
const buy = async (quantity: number, productId = 'beer') => {
  const receipt = await checkout(db, member, {
    idempotencyKey: crypto.randomUUID(),
    lines: [{ productId, quantity, expectedPriceCents: 200 }],
  });
  await db.query("UPDATE consumptions SET created_at='2026-11-11T18:01:00Z' WHERE id=$1", [
    receipt.id,
  ]);
  return receipt;
};

describe('tickets de service indépendants', () => {
  beforeAll(async () => {
    db = await createTestDatabase();
    admin = await register(db, {
      name: 'Admin service',
      grade: 'Sgt',
      phone: '0791112233',
      password,
    });
    member = await register(db, { name: 'Martin', grade: 'Sdt', phone: '0791112234', password });
    other = await register(db, {
      name: 'Autre membre',
      grade: 'Cpl',
      phone: '0791112235',
      password,
    });
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
    admin.role = 'admin';
    await db.query(
      "INSERT INTO products(id,name,unit,category,price_cents) VALUES('beer','Bière','33 cl','Boissons alcoolisées',200),('water','Eau','50 cl','Boissons sans alcool',200)",
    );
  });
  beforeEach(async () => {
    await db.query('DELETE FROM consumption_removals');
    await db.query('DELETE FROM consumption_lines');
    await db.query('DELETE FROM consumptions');
    await db.query('DELETE FROM audit');
    // Until the feature exists the first test must fail on the action, not fixture setup.
    const exists = await db.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name='service_tickets'",
    );
    if (exists.length) {
      await db.query('DELETE FROM service_tickets');
      await db.query('DELETE FROM service_visitors');
    }
    await db.query(
      "UPDATE users SET active=true,role=CASE WHEN id=$1 THEN 'admin' ELSE 'member' END",
      [admin.id],
    );
    await db.query(
      "UPDATE products SET active=true,name=CASE WHEN id='beer' THEN 'Bière' ELSE 'Eau' END",
    );
  });
  afterAll(async () => db.close());

  it('réserve création, lecture et annulation aux admins, même via API forgée', async () => {
    for (const [action, input] of [
      ['recordServiceTicket', { memberId: member.id, productId: 'beer', idempotencyKey: 'denied' }],
      ['serviceBoard', period],
      ['servicePeople', {}],
      ['createServiceVisitor', { name: 'Visiteur', idempotencyKey: 'denied' }],
      ['mergeServiceVisitor', { visitorId: 'unknown', memberId: member.id }],
      ['voidServiceTicket', { id: 'unknown', reason: 'Erreur de saisie' }],
    ] as const)
      await expect(dispatch(db, member, action, input)).rejects.toMatchObject({ status: 403 });
    expect((await getSnapshot(db, member)).admin).toBeNull();
  });

  it('enregistre le service sans ardoise, revenu ni classement', async () => {
    const { id } = await record('first');
    expect(id).toBeTruthy();
    expect(await balance(db, member.id)).toBe(0);
    expect((await getFinancialSummary(db, admin)).salesCents).toBe(0);
    expect((await getCommunity(db, member)).drinks).toEqual([]);
    await dateTickets();
    expect((await board()).rows).toEqual([
      expect.objectContaining({
        memberId: member.id,
        productId: 'beer',
        served: 1,
        declared: 0,
        missing: 1,
      }),
    ]);
    expect((await board()).tickets[0].actorName).toBe(admin.name);
  });

  it('retrouve la même opération concurrente et refuse de réutiliser sa clé pour une autre personne', async () => {
    const [a, b] = await Promise.all([record('retry'), record('retry')]);
    expect(a.id).toBe(b.id);
    expect(await db.query('SELECT * FROM service_tickets')).toHaveLength(1);
    await expect(record('retry', other.id)).rejects.toThrow(/autre/);
  });

  it('refuse produits ou membres absents/inactifs et un admin révoqué', async () => {
    await expect(record('bad-product', member.id, 'absent')).rejects.toThrow(/produit|Produit/);
    await expect(record('bad-user', 'absent')).rejects.toThrow(/compte|Compte|membre/i);
    await db.query('UPDATE users SET active=false WHERE id=$1', [member.id]);
    await expect(record('inactive-user')).rejects.toThrow(/compte|membre/i);
    await db.query("UPDATE products SET active=false WHERE id='beer'");
    await expect(record('inactive-product', other.id)).rejects.toThrow(/produit/i);
    await db.query("UPDATE users SET role='member' WHERE id=$1", [admin.id]);
    await expect(record('revoked', other.id, 'water')).rejects.toMatchObject({ status: 403 });
  });

  it('compare chaque membre/produit et accepte le libre-service supplémentaire', async () => {
    await record('a');
    await record('b');
    await record('c', other.id);
    await record('d', member.id, 'water');
    await dateTickets();
    await buy(1);
    await buy(3, 'water');
    const rows = (await board()).rows;
    expect(rows).toHaveLength(3);
    expect(rows).toContainEqual(
      expect.objectContaining({
        memberId: member.id,
        productId: 'beer',
        served: 2,
        declared: 1,
        missing: 1,
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        memberId: member.id,
        productId: 'water',
        served: 1,
        declared: 3,
        missing: 0,
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        memberId: other.id,
        productId: 'beer',
        served: 1,
        declared: 0,
        missing: 1,
      }),
    );
  });

  it('recalcule après retrait partiel, annulation et changement de libellé', async () => {
    await record('a');
    await record('b');
    await dateTickets();
    const receipt = await buy(2);
    expect((await board()).rows[0].missing).toBe(0);
    await db.query('UPDATE consumptions SET created_at=now() WHERE id=$1', [receipt.id]);
    const [line] = await db.query<{ id: string }>(
      'SELECT id FROM consumption_lines WHERE consumption_id=$1',
      [receipt.id],
    );
    await removeConsumptionLine(db, member, {
      lineId: line.id,
      quantity: 1,
      idempotencyKey: 'remove',
    });
    await db.query("UPDATE consumptions SET created_at='2026-11-11T18:01:00Z' WHERE id=$1", [
      receipt.id,
    ]);
    await db.query("UPDATE products SET name='Nouveau nom',active=false WHERE id='beer'");
    expect((await board()).rows[0]).toMatchObject({ served: 2, declared: 1, missing: 1 });
    await reverseConsumption(db, admin, { id: receipt.id, reason: 'Erreur de saisie' });
    expect((await board()).rows[0]).toMatchObject({ declared: 0, missing: 2 });
  });

  it('annule sans effacer et conserve une seule trace même en reprise', async () => {
    const ticket = await record('cancel');
    await dateTickets();
    await expect(
      dispatch(db, admin, 'voidServiceTicket', { id: ticket.id, reason: '' }),
    ).rejects.toThrow();
    const input = { id: ticket.id, reason: 'Mauvaise personne' };
    await dispatch(db, admin, 'voidServiceTicket', input);
    await dispatch(db, admin, 'voidServiceTicket', input);
    expect((await board()).rows).toEqual([]);
    expect((await board()).tickets[0].voidedAt).toBeTruthy();
    expect(await db.query("SELECT * FROM audit WHERE action='service-ticket-void'")).toHaveLength(
      1,
    );
    expect((await record('cancel')).id).toBe(ticket.id);
    expect(await balance(db, member.id)).toBe(0);
  });

  it('applique minuit suisse aux deux relevés et valide la période', async () => {
    await record('inside');
    await record('outside');
    await db.query(
      "UPDATE service_tickets SET created_at=CASE WHEN idempotency_key='inside' THEN '2026-11-10T23:00:00Z'::timestamptz ELSE '2026-11-11T23:00:00Z'::timestamptz END",
    );
    const receipt = await buy(1);
    await db.query("UPDATE consumptions SET created_at='2026-11-10T23:00:00Z' WHERE id=$1", [
      receipt.id,
    ]);
    expect((await board()).rows[0]).toMatchObject({ served: 1, declared: 1 });
    for (const invalid of [
      { from: '2026-02-30', to: '2026-03-01' },
      { from: '2026-11-12', to: '2026-11-11' },
      { from: '2026-01-01', to: '2026-11-11' },
    ])
      await expect(dispatch(db, admin, 'serviceBoard', invalid)).rejects.toThrow();
    await db.query("UPDATE service_tickets SET created_at='2026-03-28T23:00:00Z'");
    const dst = (await dispatch(db, admin, 'serviceBoard', {
      from: '2026-03-29',
      to: '2026-03-29',
    })) as Board;
    expect(dst.rows[0].served).toBe(2);
  });

  it('exclut articles libres et précommandes, et ne crée pas de faux écarts sans service', async () => {
    await buy(4, 'water');
    expect((await board()).rows).toEqual([]);
    await record('tracked');
    await dateTickets();
    const receipt = await buy(2);
    for (const origin of ['free', 'patch']) {
      await db.query('UPDATE consumptions SET origin=$2 WHERE id=$1', [receipt.id, origin]);
      expect((await board()).rows[0].declared).toBe(0);
    }
  });

  it('crée un visiteur avec son seul nom et conserve ses tickets jusqu’au rattachement manuel', async () => {
    const input = { name: 'Visiteur Paul', idempotencyKey: 'guest-one' };
    const visitor = (await dispatch(db, admin, 'createServiceVisitor', input)) as { id: string };
    expect(((await dispatch(db, admin, 'createServiceVisitor', input)) as { id: string }).id).toBe(
      visitor.id,
    );
    const ticket = (await dispatch(db, admin, 'recordServiceTicket', {
      visitorId: visitor.id,
      productId: 'beer',
      idempotencyKey: 'guest-beer',
    })) as { id: string };
    await dateTickets();
    expect((await board()).rows[0]).toMatchObject({
      memberId: null,
      visitorId: visitor.id,
      served: 1,
      declared: 0,
    });
    expect(await db.query('SELECT * FROM users')).toHaveLength(3);
    await record('member-beer');
    await dateTickets();
    await buy(2);
    await dispatch(db, admin, 'mergeServiceVisitor', {
      visitorId: visitor.id,
      memberId: member.id,
    });
    await dispatch(db, admin, 'mergeServiceVisitor', {
      visitorId: visitor.id,
      memberId: member.id,
    });
    expect((await board()).rows).toHaveLength(1);
    expect((await board()).rows[0]).toMatchObject({
      memberId: member.id,
      visitorId: null,
      served: 2,
      declared: 2,
      missing: 0,
    });
    expect((await board()).tickets.map((t) => t.id)).toContain(ticket.id);
    const people = (await dispatch(db, admin, 'servicePeople', {})) as {
      visitors: { id: string }[];
    };
    expect(people.visitors).toEqual([]);
    expect(await db.query("SELECT * FROM audit WHERE action='service-visitor-merge'")).toHaveLength(
      1,
    );
    expect(await balance(db, member.id)).toBe(400);
    await expect(
      dispatch(db, admin, 'mergeServiceVisitor', { visitorId: visitor.id, memberId: other.id }),
    ).rejects.toThrow(/rattaché/);
    await expect(
      dispatch(db, admin, 'recordServiceTicket', {
        visitorId: visitor.id,
        productId: 'beer',
        idempotencyKey: 'stale-visitor',
      }),
    ).rejects.toThrow(/rattaché/);
  });

  it('refuse les noms vides et les destinataires ambigus, sans confondre les homonymes', async () => {
    await expect(
      dispatch(db, admin, 'createServiceVisitor', { name: ' ', idempotencyKey: 'blank' }),
    ).rejects.toThrow();
    const a = (await dispatch(db, admin, 'createServiceVisitor', {
      name: 'Paul',
      idempotencyKey: 'paul-a',
    })) as { id: string };
    const b = (await dispatch(db, admin, 'createServiceVisitor', {
      name: 'Paul',
      idempotencyKey: 'paul-b',
    })) as { id: string };
    expect(a.id).not.toBe(b.id);
    await expect(
      dispatch(db, admin, 'recordServiceTicket', {
        memberId: member.id,
        visitorId: a.id,
        productId: 'beer',
        idempotencyKey: 'ambiguous',
      }),
    ).rejects.toThrow();
    await db.query('UPDATE users SET active=false WHERE id=$1', [member.id]);
    await expect(
      dispatch(db, admin, 'mergeServiceVisitor', { visitorId: a.id, memberId: member.id }),
    ).rejects.toThrow(/compte|membre/i);
  });

  it('sauvegarde et restaure les tickets et accepte les anciennes sauvegardes', async () => {
    const visitor = (await dispatch(db, admin, 'createServiceVisitor', {
      name: 'À conserver',
      idempotencyKey: 'backup-visitor',
    })) as { id: string };
    await dispatch(db, admin, 'recordServiceTicket', {
      visitorId: visitor.id,
      productId: 'beer',
      idempotencyKey: 'backup',
    });
    await dateTickets();
    const backup = JSON.parse(JSON.stringify(await createBackup(db, admin)));
    expect(backup.tables.service_tickets).toHaveLength(1);
    const restored = await createTestDatabase();
    const legacy = await createTestDatabase();
    try {
      await restoreBackup(restored, backup);
      expect(
        ((await dispatch(restored, admin, 'serviceBoard', period)) as Board).rows[0].served,
      ).toBe(1);
      expect(backup.tables.service_visitors).toHaveLength(1);
      delete backup.tables.service_tickets;
      delete backup.tables.service_visitors;
      await restoreBackup(legacy, backup);
      expect(await legacy.query('SELECT * FROM service_tickets')).toEqual([]);
    } finally {
      await restored.close();
      await legacy.close();
    }
  });

  it('inclut les tickets dans la sauvegarde de reset et les efface avant les comptes/produits', async () => {
    const visitor = (await dispatch(db, admin, 'createServiceVisitor', {
      name: 'Reset visiteur',
      idempotencyKey: 'reset-visitor',
    })) as { id: string };
    await dispatch(db, admin, 'recordServiceTicket', {
      visitorId: visitor.id,
      productId: 'beer',
      idempotencyKey: 'reset',
    });
    const prepared = await prepareDataReset(db, admin);
    expect(prepared.backup.tables.service_tickets).toHaveLength(1);
    await resetApplicationData(db, admin, {
      token: prepared.token,
      password,
      confirmation: 'RESET FALCONS',
      backupDownloaded: true,
    });
    expect(await db.query('SELECT * FROM service_tickets')).toEqual([]);
    expect(await db.query("SELECT * FROM users WHERE role='admin'")).toHaveLength(1);
  });
});
