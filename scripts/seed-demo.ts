import { getDatabase } from '../src/lib/db/index';
import { register } from '../src/features/auth/service';
import { saveProduct, recordPurchase } from '../src/features/catalog/service';
import { checkout } from '../src/features/checkout/service';
import { assert } from '../src/lib/errors';

assert(
  !process.env.VERCEL && process.env.NODE_ENV !== 'production',
  'La démonstration ne doit pas être installée en production.',
);
const db = await getDatabase();
try {
  assert(
    !(await db.query('SELECT id FROM users LIMIT 1')).length,
    'La base contient déjà des comptes : aucune donnée existante n’a été modifiée.',
  );
  const names = [
    'Responsable Démo',
    'Martin Démo',
    'Dubois Démo',
    'Morel Démo',
    'Favre Démo',
    'Laurent Démo',
    'Perrin Démo',
  ];
  const members = [];
  for (let i = 0; i < names.length; i++)
    members.push(
      await register(db, {
        name: names[i],
        grade: i === 0 ? 'Cpl' : 'Sdt',
        phone: `+4179000000${i + 1}`,
        password: 'Falcons-demo-2026!',
      }),
    );
  const admin = members[0];
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
  admin.role = 'admin';
  const data = [
    {
      name: 'Rivella rouge',
      unit: '50 cl',
      category: 'Boissons',
      price_cents: 250,
      cost_micros: 1200000,
      image: '/products/rivella.png',
      is_beverage: true,
    },
    {
      name: 'Coca-Cola',
      unit: '33 cl',
      category: 'Boissons',
      price_cents: 200,
      cost_micros: 800000,
      image: '/products/cola.png',
      is_beverage: true,
    },
    {
      name: 'Eau minérale',
      unit: '50 cl',
      category: 'Boissons',
      price_cents: 100,
      cost_micros: 350000,
      image: '/products/water.png',
      is_beverage: true,
    },
    {
      name: 'Chips paprika',
      unit: '30 g',
      category: 'Snacks',
      price_cents: 200,
      cost_micros: 700000,
      image: '/products/chips.png',
      is_beverage: false,
    },
  ];
  const products = [];
  for (const p of data) {
    const product = await saveProduct(db, admin, {
      ...p,
      price_mode: 'manual',
      available: true,
      active: true,
    });
    products.push(product);
    await recordPurchase(db, admin, {
      productId: product.id,
      quantity: 24,
      totalCents: Math.round((p.cost_micros / 10000) * 24),
      purchasedAt: new Date().toISOString(),
    });
  }
  await db.query('UPDATE settings SET piller_enabled=true,markup_basis_points=3000 WHERE id=1');
  for (let i = 1; i < members.length; i++)
    await checkout(db, members[i], {
      idempotencyKey: `demo-${i}`,
      lines: [
        { productId: products[0].id, quantity: i + 1, expectedPriceCents: 250 },
        { productId: products[3].id, quantity: i, expectedPriceCents: 200 },
      ],
    });
  console.log(
    'Démonstration locale créée : 7 comptes, 4 produits. Les accès sont documentés dans README.md.',
  );
} finally {
  await db.close();
}
