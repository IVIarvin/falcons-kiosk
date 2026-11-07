import { readFile, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { getDatabase } from '../src/lib/db/index';
import { restoreBackup } from '../src/lib/backup';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const file = process.argv[2];
if (!file)
  throw new Error('Usage : pnpm db:restore chemin/sauvegarde.json — base vide uniquement.');
const db = await getDatabase();
try {
  const text = await promisify(readFile)(file, 'utf8');
  await restoreBackup(db, JSON.parse(text));
  console.log('Restauration terminée. Les anciennes sessions ne sont pas restaurées.');
} finally {
  await db.close();
}
