import { existsSync } from 'node:fs';
import path from 'node:path';
import { createTestDatabase } from '../src/lib/db';
import { hashToken } from '../src/features/auth/service';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (
  process.env.FALCONS_DEMO !== '1' ||
  process.env.DATABASE_URL ||
  process.env.VERCEL ||
  process.env.NODE_ENV === 'production'
)
  throw new Error('Réservé à la démonstration locale explicite, serveur arrêté.');
const directory = path.resolve('.data/postgres');
if (!existsSync(directory)) throw new Error('Démonstration locale absente.');
const db = await createTestDatabase(directory);
try {
  const [admin] = await db.query<{ name: string }>('SELECT name FROM users WHERE phone=$1', [
    '+41790000001',
  ]);
  if (admin?.name !== 'Responsable Démo')
    throw new Error('Compte de démonstration attendu introuvable. Aucun compteur modifié.');
  for (const key of ['phone:+41790000001', 'phone:+41790000002', 'ip:local'])
    await db.query('DELETE FROM auth_attempts WHERE key=$1', [hashToken(key)]);
  if (process.argv.includes('--retire-test-products')) {
    await db.query(
      "UPDATE products SET active=false WHERE name LIKE 'Produit QA %' OR name='Coca-Cola Original QA' OR name ~ '^Libre [0-9]+$'",
    );
    console.log('Produits fictifs des parcours QA masqués ; historique conservé.');
  }
  console.log(
    'Compteurs de connexion de la démonstration réinitialisés. Données du kiosque conservées.',
  );
} finally {
  await db.close();
}
