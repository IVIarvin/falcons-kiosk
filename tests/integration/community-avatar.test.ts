import { expect, it } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register } from '@/features/auth/service';
import { getCommunity } from '@/features/achievements/service';
import { saveProduct } from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
it('partage l’avatar enregistré dans les classements et actualise le choix sans changer les scores', async () => {
  const db = await createTestDatabase();
  try {
    const member = await register(db, {
      name: 'Membre test',
      grade: 'Sdt',
      phone: '0791112233',
      password: 'password-falcons',
    });
    await db.query(
      "UPDATE users SET role='admin',avatar_seed='11111111-1111-4111-8111-111111111111' WHERE id=$1",
      [member.id],
    );
    member.role = 'admin';
    const product = await saveProduct(db, member, {
      name: 'Bière',
      category: 'Boissons alcoolisées',
      is_beverage: true,
      price_cents: 200,
      price_mode: 'manual',
      cost_micros: null,
    });
    await checkout(db, member, {
      idempotencyKey: 'avatar-rank',
      lines: [{ productId: product.id, quantity: 2, expectedPriceCents: 200 }],
    });
    let community = await getCommunity(db, member);
    expect(community.contributors[0]).toMatchObject({
      avatarSeed: '11111111-1111-4111-8111-111111111111',
      score: 400,
    });
    expect(community.drinks[0]).toMatchObject({
      avatarSeed: '11111111-1111-4111-8111-111111111111',
      score: 2,
    });
    expect(community.allTime[0]).toMatchObject({
      avatarSeed: '11111111-1111-4111-8111-111111111111',
      score: 400,
    });
    expect(community.drinks[0]).not.toHaveProperty('phone');
    await db.query(
      "UPDATE users SET avatar_seed='22222222-2222-4222-8222-222222222222' WHERE id=$1",
      [member.id],
    );
    community = await getCommunity(db, member);
    expect(community.contributors[0]).toMatchObject({
      avatarSeed: '22222222-2222-4222-8222-222222222222',
      score: 400,
    });
    expect(community.drinks[0]).toMatchObject({
      avatarSeed: '22222222-2222-4222-8222-222222222222',
      score: 2,
    });
  } finally {
    await db.close();
  }
});
