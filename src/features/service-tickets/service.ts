import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import { assert } from '@/lib/errors';
import { requireAdmin, type Member } from '@/features/auth/service';
import { requestHash } from '@/features/ledger/service';

const key = z.string().min(1).max(100);
// Lock accounts in the same order for self-service, guest linking and multi-admin use.
async function serviceAdmin(db: Database, actor: Member, ids: string[] = [], lock = false) {
  requireAdmin(actor);
  const people = await db.query<{
    id: string;
    name: string;
    grade: string;
    role: string;
    active: boolean;
  }>(
    `SELECT id,name,grade,role,active FROM users WHERE id=ANY($1::text[]) ORDER BY id${lock ? ' FOR UPDATE' : ''}`,
    [[...new Set([actor.id, ...ids])]],
  );
  const current = people.find((p) => p.id === actor.id);
  assert(
    current?.active && current.role === 'admin',
    'Accès réservé au responsable.',
    'FORBIDDEN',
    403,
  );
  return people;
}
export type ServiceReceipt = {
  id: string;
  memberId: string | null;
  visitorId: string | null;
  recipientName: string;
  productId: string;
  productName: string;
};
type StoredTicket = {
  id: string;
  member_id: string | null;
  visitor_id: string | null;
  recipient_name: string;
  product_id: string;
  product_name: string;
  request_hash: string;
};
function receipt(ticket: StoredTicket): ServiceReceipt {
  return {
    id: ticket.id,
    memberId: ticket.member_id,
    visitorId: ticket.visitor_id,
    recipientName: ticket.recipient_name,
    productId: ticket.product_id,
    productName: ticket.product_name,
  };
}
export async function recordServiceTicket(
  db: Database,
  actor: Member,
  input: unknown,
): Promise<ServiceReceipt> {
  requireAdmin(actor);
  const p = z
    .object({
      memberId: z.string().min(1).optional(),
      visitorId: z.string().min(1).optional(),
      productId: z.string().min(1),
      idempotencyKey: key,
    })
    .refine((p) => !!p.memberId !== !!p.visitorId, 'Choisis un membre ou un visiteur.')
    .parse(input);
  const hash = requestHash({
    memberId: p.memberId ?? null,
    visitorId: p.visitorId ?? null,
    productId: p.productId,
  });
  return db.transaction(async (tx) => {
    const people = await serviceAdmin(tx, actor, p.memberId ? [p.memberId] : [], true);
    const [existing] = await tx.query<StoredTicket>(
      'SELECT * FROM service_tickets WHERE actor_id=$1 AND idempotency_key=$2',
      [actor.id, p.idempotencyKey],
    );
    if (existing) {
      assert(
        existing.request_hash === hash,
        'Cette confirmation appartient à une autre opération.',
      );
      return receipt(existing);
    }
    let name: string;
    if (p.memberId) {
      const member = people.find((m) => m.id === p.memberId);
      assert(member?.active, 'Compte membre introuvable ou désactivé.');
      name = member.name;
    } else {
      const [visitor] = await tx.query<{ name: string; merged_user_id: string | null }>(
        'SELECT name,merged_user_id FROM service_visitors WHERE id=$1 FOR UPDATE',
        [p.visitorId],
      );
      assert(visitor, 'Visiteur introuvable.');
      assert(
        !visitor.merged_user_id,
        'Ce visiteur est déjà rattaché. Actualise la liste des membres.',
      );
      name = visitor.name;
    }
    const [product] = await tx.query<{ name: string; unit: string; active: boolean }>(
      'SELECT name,unit,active FROM products WHERE id=$1 FOR SHARE',
      [p.productId],
    );
    assert(product?.active, 'Produit introuvable ou désactivé.');
    const [ticket] = await tx.query<StoredTicket>(
      'INSERT INTO service_tickets(id,member_id,visitor_id,recipient_name,product_id,product_name,unit,actor_id,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [
        randomUUID(),
        p.memberId ?? null,
        p.visitorId ?? null,
        name,
        p.productId,
        product.name,
        product.unit,
        actor.id,
        p.idempotencyKey,
        hash,
      ],
    );
    return receipt(ticket);
  });
}
export async function voidServiceTicket(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({ id: z.string().min(1), reason: z.string().trim().min(3).max(300) })
    .parse(input);
  return db.transaction(async (tx) => {
    await serviceAdmin(tx, actor, [], true);
    const [ticket] = await tx.query<{ voided_at: string | null }>(
      'SELECT voided_at FROM service_tickets WHERE id=$1 FOR UPDATE',
      [p.id],
    );
    assert(ticket, 'Ticket introuvable.');
    if (ticket.voided_at) return { id: p.id };
    await tx.query(
      'UPDATE service_tickets SET voided_at=now(),voided_by=$2,void_reason=$3 WHERE id=$1',
      [p.id, actor.id, p.reason],
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,after_data) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        actor.id,
        'service-ticket-void',
        p.id,
        p.reason,
        JSON.stringify({ voided: true }),
      ],
    );
    return { id: p.id };
  });
}
export async function createServiceVisitor(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z.object({ name: z.string().trim().min(1).max(90), idempotencyKey: key }).parse(input);
  const hash = requestHash({ name: p.name });
  return db.transaction(async (tx) => {
    await serviceAdmin(tx, actor, [], true);
    const [existing] = await tx.query<{ id: string; name: string; request_hash: string }>(
      'SELECT id,name,request_hash FROM service_visitors WHERE actor_id=$1 AND idempotency_key=$2',
      [actor.id, p.idempotencyKey],
    );
    if (existing) {
      assert(
        existing.request_hash === hash,
        'Cette confirmation appartient à une autre opération.',
      );
      return { id: existing.id, name: existing.name };
    }
    const id = randomUUID();
    await tx.query(
      'INSERT INTO service_visitors(id,name,actor_id,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5)',
      [id, p.name, actor.id, p.idempotencyKey, hash],
    );
    return { id, name: p.name };
  });
}
export async function mergeServiceVisitor(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z.object({ visitorId: z.string().min(1), memberId: z.string().min(1) }).parse(input);
  return db.transaction(async (tx) => {
    const people = await serviceAdmin(tx, actor, [p.memberId], true);
    const member = people.find((m) => m.id === p.memberId);
    const [visitor] = await tx.query<{ name: string; merged_user_id: string | null }>(
      'SELECT name,merged_user_id FROM service_visitors WHERE id=$1 FOR UPDATE',
      [p.visitorId],
    );
    assert(visitor, 'Visiteur introuvable.');
    if (visitor.merged_user_id) {
      assert(
        visitor.merged_user_id === p.memberId,
        'Ce visiteur est déjà rattaché à un autre compte.',
      );
      return { visitorId: p.visitorId, memberId: p.memberId };
    }
    assert(member?.active, 'Compte membre introuvable ou désactivé.');
    await tx.query(
      'UPDATE service_visitors SET merged_user_id=$2,merged_at=now(),merged_by=$3 WHERE id=$1',
      [p.visitorId, p.memberId, actor.id],
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [
        randomUUID(),
        actor.id,
        'service-visitor-merge',
        p.visitorId,
        'Rattachement manuel du visiteur à son compte inscrit',
        JSON.stringify({ name: visitor.name }),
        JSON.stringify({ memberId: member.id, memberName: member.name }),
      ],
    );
    return { visitorId: p.visitorId, memberId: p.memberId };
  });
}
export async function getServicePeople(db: Database, actor: Member) {
  await serviceAdmin(db, actor);
  const members = await db.query<{
    id: string;
    name: string;
    grade: string;
    avatar_seed: string | null;
  }>('SELECT id,name,grade,avatar_seed FROM users WHERE active=true ORDER BY name,id');
  const visitors = await db.query<{ id: string; name: string; createdAt: string }>(
    'SELECT id,name,created_at AS "createdAt" FROM service_visitors WHERE merged_user_id IS NULL ORDER BY created_at DESC,id',
  );
  const recent = await db.query<{ person: string }>(
    `SELECT person FROM (SELECT CASE WHEN COALESCE(t.member_id,v.merged_user_id) IS NOT NULL THEN 'member:'||COALESCE(t.member_id,v.merged_user_id) ELSE 'visitor:'||t.visitor_id END AS person,max(t.created_at) AS last_at FROM service_tickets t LEFT JOIN service_visitors v ON v.id=t.visitor_id WHERE t.voided_at IS NULL AND t.actor_id=$1 GROUP BY person) r ORDER BY last_at DESC,person LIMIT 6`,
    [actor.id],
  );
  return { members, visitors, recent: recent.map((r) => r.person) };
}
export type ServicePeople = Awaited<ReturnType<typeof getServicePeople>>;
export type ServiceRow = {
  memberId: string | null;
  visitorId: string | null;
  personName: string;
  grade: string;
  productId: string;
  productName: string;
  unit: string;
  served: number;
  declared: number;
  missing: number;
};
export type ServiceHistoryTicket = {
  id: string;
  personName: string;
  recipientName: string;
  productName: string;
  unit: string;
  actorName: string;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  voidedByName: string | null;
};
export async function getServiceBoard(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z.object({ from: z.iso.date(), to: z.iso.date() }).parse(input);
  const days = (Date.parse(p.to) - Date.parse(p.from)) / 86400000;
  assert(
    days >= 0 && days < 93,
    'Choisis une période de 1 à 93 jours, dans l’ordre chronologique.',
  );
  return db.transaction(async (tx) => {
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await serviceAdmin(tx, actor);
    const rows = await tx.query<ServiceRow>(
      `
      WITH served AS (
        SELECT COALESCE(t.member_id,v.merged_user_id) AS member_id,
          CASE WHEN v.merged_user_id IS NULL THEN t.visitor_id ELSE NULL END AS visitor_id,
          t.product_id,max(t.product_name) AS product_name,max(t.unit) AS unit,sum(t.quantity)::integer AS quantity
        FROM service_tickets t LEFT JOIN service_visitors v ON v.id=t.visitor_id
        WHERE t.voided_at IS NULL AND t.created_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich')
          AND t.created_at<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Zurich')
        GROUP BY 1,2,3
      ), declared AS (
        SELECT c.user_id,l.product_id,sum(l.quantity-l.removed_quantity)::integer AS quantity
        FROM consumptions c JOIN consumption_lines l ON l.consumption_id=c.id
        WHERE c.reversed_at IS NULL AND c.origin='kiosk'
          AND c.created_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich')
          AND c.created_at<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Zurich') GROUP BY 1,2
      )
      SELECT s.member_id AS "memberId",s.visitor_id AS "visitorId",COALESCE(u.name,v.name) AS "personName",
        COALESCE(u.grade,'Visiteur') AS grade,s.product_id AS "productId",s.product_name AS "productName",s.unit,
        s.quantity AS served,COALESCE(d.quantity,0) AS declared,GREATEST(s.quantity-COALESCE(d.quantity,0),0) AS missing
      FROM served s LEFT JOIN users u ON u.id=s.member_id LEFT JOIN service_visitors v ON v.id=s.visitor_id
      LEFT JOIN declared d ON d.user_id=s.member_id AND d.product_id=s.product_id
      ORDER BY missing DESC,"personName",s.product_name,s.product_id`,
      [p.from, p.to],
    );
    const tickets = await tx.query<ServiceHistoryTicket>(
      `
      SELECT t.id,COALESCE(u.name,v.name) AS "personName",t.recipient_name AS "recipientName",
        t.product_name AS "productName",t.unit,a.name AS "actorName",t.created_at AS "createdAt",
        t.voided_at AS "voidedAt",t.void_reason AS "voidReason",va.name AS "voidedByName"
      FROM service_tickets t LEFT JOIN service_visitors v ON v.id=t.visitor_id
      LEFT JOIN users u ON u.id=COALESCE(t.member_id,v.merged_user_id) JOIN users a ON a.id=t.actor_id
      LEFT JOIN users va ON va.id=t.voided_by
      WHERE t.created_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich')
        AND t.created_at<(($2::date+1)::timestamp AT TIME ZONE 'Europe/Zurich')
      ORDER BY t.created_at DESC,t.id DESC LIMIT 100`,
      [p.from, p.to],
    );
    return { ...p, rows, tickets };
  });
}
export type ServiceBoard = Awaited<ReturnType<typeof getServiceBoard>>;
