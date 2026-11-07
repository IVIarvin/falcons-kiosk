import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import { assert, DomainError } from '@/lib/errors';
import { requireAdmin, normalizePhone, type Member } from '@/features/auth/service';
export async function updateSettings(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const s = z
    .object({ markupBasisPoints: z.number().int().min(0).max(100000), pillerEnabled: z.boolean() })
    .parse(input);
  await db.query('UPDATE settings SET markup_basis_points=$1,piller_enabled=$2 WHERE id=1', [
    s.markupBasisPoints,
    s.pillerEnabled,
  ]);
}
export async function updateMember(db: Database, actor: Member, input: unknown) {
  requireAdmin(actor);
  const p = z
    .object({
      id: z.string(),
      role: z.enum(['admin', 'member']),
      active: z.boolean(),
      name: z.string().trim().min(2).max(90).optional(),
      grade: z.string().trim().min(1).max(30).optional(),
      phone: z.string().max(35).optional(),
    })
    .parse(input);
  try {
    await db.transaction(async (tx) => {
      const admins = await tx.query<{ id: string }>(
        "SELECT id FROM users WHERE role='admin' AND active=true ORDER BY id FOR UPDATE",
      );
      const [before] = await tx.query<Member>('SELECT * FROM users WHERE id=$1 FOR UPDATE', [p.id]);
      assert(before, 'Compte introuvable.');
      assert(
        !(
          before.role === 'admin' &&
          before.active &&
          admins.length <= 1 &&
          (p.role !== 'admin' || !p.active)
        ),
        'Le dernier administrateur actif doit conserver son accès.',
      );
      const profile = {
        name: p.name ?? before.name,
        grade: p.grade ?? before.grade,
        phone: p.phone ? normalizePhone(p.phone) : before.phone,
      };
      await tx.query('UPDATE users SET role=$2,active=$3,name=$4,grade=$5,phone=$6 WHERE id=$1', [
        p.id,
        p.role,
        p.active,
        profile.name,
        profile.grade,
        profile.phone,
      ]);
      await tx.query('DELETE FROM sessions WHERE user_id=$1', [p.id]);
      await tx.query(
        'INSERT INTO audit(id,actor_id,action,reference_id,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          randomUUID(),
          actor.id,
          'member-access',
          p.id,
          'Modification du profil et des accès',
          JSON.stringify({
            name: before.name,
            grade: before.grade,
            phone: before.phone,
            role: before.role,
            active: before.active,
          }),
          JSON.stringify({ ...p, ...profile }),
        ],
      );
    });
  } catch (e) {
    if ((e as { code?: string }).code === '23505')
      throw new DomainError('Ce numéro est déjà utilisé.');
    throw e;
  }
}
