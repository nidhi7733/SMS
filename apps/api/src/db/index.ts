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
    let dataDir = path.resolve(process.cwd(), 'data', 'sms_pg');
    const apiDataDir = path.resolve(process.cwd(), 'apps', 'api', 'data', 'sms_pg');
    if (fs.existsSync(apiDataDir)) {
      dataDir = apiDataDir;
    } else if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    console.log(`[DB] Initializing embedded persistent PostgreSQL at ${dataDir}...`);
    // Clean up any stale postmaster.pid or lock file left by previous process crash
    const pidFile = path.join(dataDir, 'postmaster.pid');
    if (fs.existsSync(pidFile)) {
      try {
        fs.unlinkSync(pidFile);
        console.log(`[DB] Removed stale ${pidFile}`);
      } catch (e) {
        // ignore
      }
    }
    const lockFile = path.join(dataDir, '.s.PGSQL.5432.lock.out');
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
        console.log(`[DB] Removed stale ${lockFile}`);
      } catch (e) {
        // ignore
      }
    }

    const pglite = new PGlite(dataDir);
    await pglite.waitReady;
    dbInstance = drizzlePglite(pglite, { schema });
  }

  return dbInstance;
}

export { schema };
