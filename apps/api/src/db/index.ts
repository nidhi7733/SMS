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
    const cleanStaleLocks = (dir: string) => {
      const lockFiles = ['postmaster.pid', '.s.PGSQL.5432.lock', '.s.PGSQL.5432.lock.out'];
      for (const f of lockFiles) {
        const filePath = path.join(dir, f);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`[DB] Removed stale ${filePath}`);
          } catch {
            // ignore
          }
        }
      }
    };

    cleanStaleLocks(dataDir);

    try {
      const pglite = new PGlite(dataDir);
      await pglite.waitReady;
      dbInstance = drizzlePglite(pglite, { schema });
    } catch (err: any) {
      console.error('[DB] Warning: Failed to resume existing database due to corruption or torn WAL:', err?.message || err);
      console.log('[DB] Recovering database: backing up corrupted store and re-initializing cleanly...');
      const backupDir = `${dataDir}_corrupt_${Date.now()}`;
      try {
        fs.renameSync(dataDir, backupDir);
        console.log(`[DB] Corrupted data moved to ${backupDir}`);
      } catch (renameErr) {
        console.error('[DB] Could not rename corrupted dir:', renameErr);
      }
      fs.mkdirSync(dataDir, { recursive: true });
      cleanStaleLocks(dataDir);
      const freshPglite = new PGlite(dataDir);
      await freshPglite.waitReady;
      dbInstance = drizzlePglite(freshPglite, { schema });
      console.log('[DB] Fresh database initialized successfully.');
    }
  }

  return dbInstance;
}

export { schema };
