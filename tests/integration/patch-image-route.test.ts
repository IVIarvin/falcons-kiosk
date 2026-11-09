import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, hashToken, sessionCookie } from '@/features/auth/service';
import { createPatchCampaign } from '@/features/patches/service';
import { GET, POST, DELETE } from '@/app/api/patchs/[campaignId]/images/[kind]/route';
let db: Database;
let id: string;
let png: Buffer;
vi.mock('@/lib/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/db')>()),
  getDatabase: () => db,
}));
beforeAll(async () => {
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
  for (const [token, user] of [
    ['admin', admin],
    ['member', member],
  ] as const)
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
      [hashToken(token), user.id],
    );
  id = (
    await createPatchCampaign(db, admin, {
      name: 'Falcons',
      priceCents: 800,
      deadline: '2099-12-31',
    })
  ).id;
  png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#88cc88' } })
    .png()
    .toBuffer();
});
afterAll(async () => db.close());
function req(method: string, token?: string, body?: BodyInit, origin = 'http://localhost') {
  return new NextRequest(`http://localhost/api/patchs/${id}/images/artwork`, {
    method,
    body,
    headers: { ...(token ? { cookie: `${sessionCookie}=${token}` } : {}), origin },
  });
}
const context = () => ({ params: Promise.resolve({ campaignId: id, kind: 'artwork' }) });
it('protège la lecture, les écritures et leur origine', async () => {
  expect((await GET(req('GET'), context())).status).toBe(401);
  expect((await POST(req('POST', 'member'), context())).status).toBe(403);
  expect(
    (await DELETE(req('DELETE', 'admin', undefined, 'https://other.test'), context())).status,
  ).toBe(403);
  expect((await POST(req('POST', 'admin', 'not multipart'), context())).status).toBe(400);
  expect(
    (await POST(req('POST', 'admin', new Uint8Array(2 * 1024 * 1024 + 16385)), context())).status,
  ).toBe(413);
});
it('importe puis sert un vrai WebP au membre et permet son retrait', async () => {
  const body = new FormData();
  body.set('file', new File([new Uint8Array(png)], 'artwork.png', { type: 'image/png' }));
  expect((await POST(req('POST', 'admin', body), context())).status).toBe(200);
  const response = await GET(req('GET', 'member'), context());
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/webp');
  expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format).toBe('webp');
  expect((await DELETE(req('DELETE', 'admin'), context())).status).toBe(200);
  expect((await GET(req('GET', 'member'), context())).status).toBe(404);
});
