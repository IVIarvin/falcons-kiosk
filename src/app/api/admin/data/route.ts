import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase } from '@/lib/db';
import { assert, DomainError } from '@/lib/errors';
import { sameOrigin } from '@/lib/origin';
import { requireAdmin, resolveSession, sessionCookie } from '@/features/auth/service';
import {
  prepareDataReset,
  readAdminData,
  resetApplicationData,
} from '@/features/admin-data/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
function failure(error: unknown) {
  const domain = error instanceof DomainError,
    invalid = error instanceof z.ZodError || error instanceof SyntaxError;
  return NextResponse.json(
    {
      ok: false,
      message: domain
        ? error.message
        : invalid
          ? 'Vérifie les champs.'
          : 'Opération impossible. Réessaie.',
      code: domain ? error.code : invalid ? 'INVALID' : 'SERVER',
    },
    { status: domain ? error.status : invalid ? 400 : 500, headers },
  );
}
async function actor(req: NextRequest) {
  const db = await getDatabase(),
    user = await resolveSession(db, req.cookies.get(sessionCookie)?.value);
  assert(user, 'Connexion requise.', 'AUTH', 401);
  requireAdmin(user);
  return { db, user };
}
async function readBody(req: NextRequest) {
  const reader = req.body?.getReader();
  assert(reader, 'Requête vide.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader.cancel();
      throw new DomainError('Requête trop volumineuse.', 'INVALID', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function GET(req: NextRequest) {
  try {
    const { db, user } = await actor(req);
    const data = await readAdminData(db, user, Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json({ ok: true, data }, { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    assert(
      sameOrigin(req.headers.get('origin'), req.url, req.headers.get('host')),
      'Origine refusée.',
      'FORBIDDEN',
      403,
    );
    const { db, user } = await actor(req);
    const input = z
      .object({ action: z.enum(['prepare', 'reset']), data: z.unknown().optional() })
      .parse(await readBody(req));
    const data =
      input.action === 'prepare'
        ? await prepareDataReset(db, user)
        : await resetApplicationData(db, user, input.data);
    const response = NextResponse.json({ ok: true, data }, { headers });
    if (input.action === 'reset') response.cookies.delete(sessionCookie);
    return response;
  } catch (e) {
    return failure(e);
  }
}
