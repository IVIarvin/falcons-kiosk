import { getDatabase } from '../src/lib/db/index';
import { register } from '../src/features/auth/service';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const db = await getDatabase();
try {
  const user = await register(db, {
    name: process.env.BOOTSTRAP_NAME,
    grade: process.env.BOOTSTRAP_GRADE,
    phone: process.env.BOOTSTRAP_PHONE,
    password: process.env.BOOTSTRAP_PASSWORD,
  });
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  console.log('Responsable créé. Aucun secret affiché.');
} finally {
  await db.close();
}
