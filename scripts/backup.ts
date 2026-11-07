import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDatabase } from '../src/lib/db/index';
import { createBackup } from '../src/lib/backup';
import type { Member } from '../src/features/auth/service';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const db = await getDatabase();
try {
  const [admin] = await db.query<Member>(
    "SELECT id,name,grade,phone,role,active,must_change_password FROM users WHERE role='admin' AND active=true ORDER BY created_at LIMIT 1",
  );
  if (!admin)
    throw new Error('Aucun responsable actif : crée le compte initial avant une sauvegarde.');
  const data = await createBackup(db, admin);
  const directory = path.resolve(process.argv[2] ?? '.data/backups');
  await mkdir(directory, { recursive: true });
  const file = path.join(
    directory,
    `falcons-${new Date().toISOString().replaceAll(':', '-')}.json`,
  );
  await writeFile(file, JSON.stringify(data), { mode: 0o600 });
  console.log(`Sauvegarde créée : ${file}`);
} finally {
  await db.close();
}
