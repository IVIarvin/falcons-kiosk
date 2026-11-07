import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { resolveSession, sessionCookie } from '@/features/auth/service';
import { getSnapshot } from '@/lib/application';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const db = await getDatabase();
    const user = await resolveSession(db, req.cookies.get(sessionCookie)?.value);
    if (!user)
      return NextResponse.json(
        { ok: false, message: 'Connecte-toi pour continuer.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    return NextResponse.json(
      { ok: true, data: await getSnapshot(db, user) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Le kiosque est indisponible. Vérifie sa configuration et réessaie.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
