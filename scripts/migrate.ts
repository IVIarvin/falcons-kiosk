import { getDatabase, migrate } from '../src/lib/db/index';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const db = await getDatabase();
await migrate(db);
await db.close();
console.log('Migrations terminées.');
