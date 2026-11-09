import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase } from '@/lib/db';
import { resolveSession, requireAdmin, sessionCookie } from '@/features/auth/service';
import { assert, DomainError } from '@/lib/errors';
import { sameOrigin } from '@/lib/origin';
import {
  readPatchImage,
  savePatchImage,
  deletePatchImage,
  maxPatchImageBytes,
} from '@/features/patches/images';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ campaignId: string; kind: string }> };
async function handle(req: NextRequest, context: Context) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const db = await getDatabase();
    const actor = await resolveSession(db, req.cookies.get(sessionCookie)?.value);
    assert(actor, 'Connecte-toi pour continuer.', 'AUTH', 401);
    const { campaignId, kind } = await context.params;
    if (req.method === 'GET') {
      const image = await readPatchImage(db, actor, campaignId, kind);
      return new Response(new Uint8Array(image.data), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'private, max-age=300',
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': `inline; filename="falcons-${kind}.webp"`,
          ETag: `"${image.version}"`,
        },
      });
    }
    requireAdmin(actor);
    assert(
      sameOrigin(req.headers.get('origin'), req.url, req.headers.get('host')),
      'Origine de requête refusée.',
      'FORBIDDEN',
      403,
    );
    if (req.method === 'DELETE') {
      await deletePatchImage(db, actor, campaignId, kind);
      return NextResponse.json({ ok: true }, { headers });
    }
    const reader = req.body?.getReader();
    assert(reader, 'Choisis une image.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxPatchImageBytes + 16384) {
        await reader.cancel();
        throw new DomainError('Choisis une image de 2 Mo maximum.', 'INVALID', 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { 'Content-Type': req.headers.get('content-type') ?? '' },
      }).formData();
    } catch {
      throw new DomainError('Choisis une image PNG, JPEG ou WebP.');
    }
    const file = form.get('file');
    assert(file instanceof File, 'Choisis une image PNG, JPEG ou WebP.');
    const result = await savePatchImage(
      db,
      actor,
      campaignId,
      kind,
      new Uint8Array(await file.arrayBuffer()),
    );
    return NextResponse.json({ ok: true, data: result }, { headers });
  } catch (error) {
    const domain = error instanceof DomainError;
    const invalid = error instanceof z.ZodError;
    return NextResponse.json(
      {
        ok: false,
        message: domain
          ? error.message
          : invalid
            ? 'Type d’image invalide.'
            : 'Impossible d’enregistrer cette image pour le moment. Réessaie.',
        code: domain ? error.code : invalid ? 'INVALID' : 'INTERNAL',
      },
      { status: domain ? error.status : invalid ? 400 : 500, headers },
    );
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
