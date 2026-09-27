import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import * as schema from './schema.js';

let dbInstance: any;

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    console.log('[DB] Connecting to PostgreSQL via connection string...');
    const pool = new pg.Pool({ connectionString: databaseUrl });
    dbInstance = drizzlePg(pool, { schema });
  } else {
    // Local embedded PostgreSQL (PGlite) - persistent to disk
    const dataDir = path.resolve(process.cwd(), 'data', 'sms_pg');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    console.log(`[DB] Initializing embedded persistent PostgreSQL at ${dataDir}...`);
    const pglite = new PGlite(dataDir);
    await pglite.waitReady;
    dbInstance = drizzlePglite(pglite, { schema });
  }

  return dbInstance;
}

export { schema };
