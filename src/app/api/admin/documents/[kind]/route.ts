import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { resolveSession, sessionCookie, requireAdmin } from '@/features/auth/service';
import { getCatalog } from '@/features/catalog/service';
import { getAccounts } from '@/features/ledger/service';
import { buildCatalogPdf, buildAccessPdf, toCsv } from '@/features/documents/service';
import { DomainError, assert } from '@/lib/errors';
import { createBackup } from '@/lib/backup';
import { canonicalUrl } from '@/lib/config';
import { exportPillerVoices } from '@/features/piller/service';
import { appFilePrefix } from '@/lib/brand';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, context: { params: Promise<{ kind: string }> }) {
  try {
    const db = await getDatabase();
    const user = await resolveSession(db, req.cookies.get(sessionCookie)?.value);
    assert(user, 'Connexion requise.', 'AUTH', 401);
    requireAdmin(user);
    const { kind } = await context.params;
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (kind === 'piller')
      return NextResponse.json(await exportPillerVoices(db, user), {
        headers: {
          ...headers,
          'Content-Disposition': `attachment; filename="${appFilePrefix}-repliques.json"`,
        },
      });
    if (kind === 'catalogue' || kind === 'qr') {
      const products = await getCatalog(db);
      const bytes =
        kind === 'catalogue'
          ? await buildCatalogPdf(
              products.map((p) => ({
                name: p.name,
                unit: p.unit,
                category: p.category,
                priceCents: p.price_cents,
                available: p.available,
              })),
            )
          : await buildAccessPdf(canonicalUrl());
      return new Response(Buffer.from(bytes), {
        headers: {
          ...headers,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${appFilePrefix}-${kind}.pdf"`,
        },
      });
    }
    if (kind === 'comptes') {
      const accounts = await getAccounts(db, user);
      return new Response(
        toCsv(
          ['Grade', 'Nom', 'Téléphone', 'Solde en centimes'],
          accounts.map((u) => [u.grade, u.name, u.phone, u.balanceCents]),
        ),
        {
          headers: {
            ...headers,
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${appFilePrefix}-comptes.csv"`,
          },
        },
      );
    }
    if (kind === 'sauvegarde')
      return NextResponse.json(await createBackup(db, user), {
        headers: {
          ...headers,
          'Content-Disposition': `attachment; filename="${appFilePrefix}-sauvegarde.json"`,
        },
      });
    const tables: Record<string, string[]> = {
      achats: ['purchases'],
      consommations: ['consumptions', 'consumption_lines', 'consumption_removals'],
      paiements: ['payments'],
    };
    assert(tables[kind], 'Document inconnu.');
    const data: Record<string, unknown[]> = {};
    for (const table of tables[kind]) data[table] = await db.query(`SELECT * FROM ${table}`);
    const rows = Object.values(data).flat() as Record<string, unknown>[];
    const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    return new Response(
      toCsv(
        columns,
        rows.map((r) => columns.map((c) => r[c])),
      ),
      {
        headers: {
          ...headers,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${appFilePrefix}-${kind}.csv"`,
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        message:
          e instanceof DomainError
            ? e.message
            : e instanceof Error && /URL|adresse|HTTPS/.test(e.message)
              ? e.message
              : 'Le document ne peut pas être généré.',
      },
      {
        status: e instanceof DomainError ? e.status : 400,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
