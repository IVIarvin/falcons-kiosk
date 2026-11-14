import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase } from '@/lib/db';
import { DomainError, assert } from '@/lib/errors';
import {
  registerAndLogin,
  login,
  logout,
  resolveSession,
  sessionCookie,
  resetPassword,
} from '@/features/auth/service';
import { dispatch } from '@/lib/application';
import { sameOrigin } from '@/lib/origin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function body(req: NextRequest) {
  const reader = req.body?.getReader();
  assert(reader, 'Requête vide.');
  let size = 0;
  const chunks: Uint8Array[] = [];
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
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(all));
}
export async function POST(req: NextRequest) {
  try {
    assert(
      sameOrigin(req.headers.get('origin'), req.url, req.headers.get('host')),
      'Origine de requête refusée.',
      'FORBIDDEN',
      403,
    );
    const { action, data } = z
      .object({ action: z.string().max(50), data: z.unknown().optional() })
      .parse(await body(req));
    const db = await getDatabase();
    const token = req.cookies.get(sessionCookie)?.value;
    if (action === 'login' || action === 'register') {
      const clientKey = req.headers.get('x-real-ip') ?? 'local';
      const session =
        action === 'register'
          ? await registerAndLogin(db, data, clientKey)
          : await login(db, data, clientKey);
      const response = NextResponse.json(
        { ok: true, data: { user: session.user } },
        { headers: { 'Cache-Control': 'no-store' } },
      );
      response.cookies.set(sessionCookie, session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: session.expires,
      });
      return response;
    }
    if (action === 'reset') {
      await resetPassword(db, data);
      return NextResponse.json(
        { ok: true, data: null },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const user = await resolveSession(db, token);
    assert(user, 'Connecte-toi pour continuer.', 'AUTH', 401);
    if (action === 'logout') {
      await logout(db, token!);
      const response = NextResponse.json({ ok: true, data: null });
      response.cookies.delete(sessionCookie);
      return response;
    }
    const result = await dispatch(db, user, action, data);
    return NextResponse.json(
      { ok: true, data: result ?? null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const domain = error instanceof DomainError;
    const invalid = error instanceof z.ZodError || error instanceof SyntaxError;
    return NextResponse.json(
      {
        ok: false,
        message: domain
          ? error.message
          : invalid
            ? 'Vérifie les champs du formulaire.'
            : 'L’opération a échoué. Réessaie ou contacte le responsable.',
        code: domain ? error.code : invalid ? 'INVALID' : 'SERVER',
      },
      {
        status: domain ? error.status : invalid ? 400 : 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
