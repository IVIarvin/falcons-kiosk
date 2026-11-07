import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/lib/db';
import { assert } from '@/lib/errors';
import { requireAdmin, type Member } from '@/features/auth/service';
import { quotes, type Quote, type QuoteTopic } from './quotes';

export type ManagedQuote = Quote & { enabled: boolean; revision: number };
const schema = z.object({
  id: z.string().max(100),
  text: z.string().trim().min(1).max(160),
  topic: z.enum([
    'general',
    'sugary',
    'sugar-free',
    'energy',
    'coffee',
    'alcohol',
    'water',
    'snack',
    'bulk',
  ]),
  enabled: z.boolean(),
  revision: z.number().int().min(0),
});

export async function getPillerQuotes(db: Database): Promise<ManagedQuote[]> {
  const overrides = await db.query<{
    id: string;
    text: string;
    topic: QuoteTopic;
    enabled: boolean;
    revision: number;
  }>('SELECT id,text,topic,enabled,revision FROM piller_quotes');
  const byId = new Map(overrides.map((q) => [q.id, q]));
  return quotes
    .filter((q) => !q.archived)
    .map((q) => ({ ...q, enabled: true, revision: 0, ...byId.get(q.id) }));
}
export async function getPillerLibrary(db: Database, actor: Member) {
  requireAdmin(actor);
  return getPillerQuotes(db);
}
export async function savePillerQuote(
  db: Database,
  actor: Member,
  input: unknown,
): Promise<ManagedQuote> {
  requireAdmin(actor);
  const p = schema.parse(input);
  const initial = quotes.find((q) => q.id === p.id && !q.archived);
  assert(initial, 'Réplique introuvable.');
  return db.transaction(async (tx) => {
    const [stored] = await tx.query<ManagedQuote>(
      'SELECT * FROM piller_quotes WHERE id=$1 FOR UPDATE',
      [p.id],
    );
    const before = stored ?? { ...initial, enabled: true, revision: 0 };
    assert(
      before.revision === p.revision,
      'Cette réplique a été modifiée. Ferme le répertoire et actualise avant de réessayer.',
      'QUOTE_CHANGED',
      409,
    );
    const [saved] = await tx.query<ManagedQuote>(
      `INSERT INTO piller_quotes(id,text,topic,enabled,revision) VALUES($1,$2,$3,$4,1) ON CONFLICT(id) DO UPDATE SET text=EXCLUDED.text,topic=EXCLUDED.topic,enabled=EXCLUDED.enabled,revision=piller_quotes.revision+1 WHERE piller_quotes.revision=$5 RETURNING *`,
      [p.id, p.text, p.topic, p.enabled, p.revision],
    );
    assert(
      saved,
      'Cette réplique a été modifiée. Ferme le répertoire et actualise avant de réessayer.',
      'QUOTE_CHANGED',
      409,
    );
    await tx.query(
      'INSERT INTO audit(id,actor_id,action,reference_id,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [
        randomUUID(),
        actor.id,
        'piller-quote',
        p.id,
        'Modification d’une réplique de Piller',
        JSON.stringify(before),
        JSON.stringify(saved),
      ],
    );
    return saved;
  });
}
