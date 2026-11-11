import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDatabase, type Database } from '@/lib/db';
import { register, type Member } from '@/features/auth/service';
import { getSnapshot, type Snapshot } from '@/lib/application';
import { AppContext } from '@/components/context';
import { KioskView } from '@/features/checkout/view';
let db: Database, admin: Member, member: Member;
beforeAll(async () => {
  db = await createTestDatabase();
  admin = await register(db, {
    name: 'Admin UI',
    grade: 'Sgt',
    phone: '0791112233',
    password: 'Falcons-ui-test!',
  });
  member = await register(db, {
    name: 'Membre UI',
    grade: 'Sdt',
    phone: '0791112234',
    password: 'Falcons-ui-test!',
  });
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
  admin.role = 'admin';
  await db.query(
    "INSERT INTO products(id,name,unit,category,price_cents) VALUES('beer','Bière test','33 cl','Boissons alcoolisées',200)",
  );
});
afterAll(async () => db.close());
function render(state: Snapshot) {
  return renderToStaticMarkup(
    createElement(
      AppContext.Provider,
      {
        value: {
          state,
          busy: false,
          notice: () => {},
          refresh: async () => {},
          run: async <T>() => undefined as T,
        },
      },
      createElement(KioskView),
    ),
  );
}
it('affiche Servir sur le produit pour un admin et conserve son panier personnel', async () => {
  const html = render(await getSnapshot(db, admin));
  expect(html).toContain('aria-label="Servir Bière test"');
  expect(html).toContain('aria-label="Ajouter Bière test"');
  expect(html).toContain('href="/admin/service"');
});
it('ne rend ni accès au service ni bouton produit pour un membre', async () => {
  const html = render(await getSnapshot(db, member));
  expect(html).not.toContain('aria-label="Servir');
  expect(html).not.toContain('href="/admin/service"');
  expect(html).toContain('aria-label="Ajouter Bière test"');
});
