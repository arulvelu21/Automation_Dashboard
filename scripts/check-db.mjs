import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Client } from 'pg';

// Load .env.local first (Next.js convention), then fallback to .env
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
  console.log(`Loaded env from .env.local`);
} else {
  dotenv.config();
  console.log(`Loaded env from .env`);
}

function getConfig() {
  const { DATABASE_URL, PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, PGSSL } = process.env;
  if (DATABASE_URL) {
    return { connectionString: DATABASE_URL, ssl: PGSSL === 'require' ? { rejectUnauthorized: false } : undefined };
  }
  if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE) {
    throw new Error('Missing PG env. Provide DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE');
  }
  return {
    host: PGHOST,
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
    port: PGPORT ? Number(PGPORT) : 5432,
    ssl: PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
  };
}

function quoteIdent(id) {
  return '"' + String(id).replace(/"/g, '""') + '"';
}

async function main() {
  const cfg = getConfig();
  const pretty = (o) => {
    if (o.connectionString) return { connectionString: o.connectionString, ssl: !!o.ssl };
    // hide password
    const { password, ...rest } = o;
    return { ...rest, ssl: !!o.ssl };
  };
  console.log('Checking PostgreSQL connectivity with config:', pretty(cfg));

  const client = new Client(cfg);
  const start = Date.now();
  try {
    await client.connect();
    const ping = await client.query(
      `SELECT current_database() AS db, current_user AS usr, inet_server_addr() AS host, inet_server_port() AS port, now() AS now`
    );
    const info = ping.rows[0];
    console.log('Connected:', info);

    const table = process.env.USECASE_TABLE || 'usecase_savings_ref';
    const existsRes = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = current_schema() AND table_name = $1
       ) AS exists`,
      [table]
    );
    const exists = !!existsRes.rows[0]?.exists;
    console.log(`Table check: ${table} ${exists ? 'exists' : 'does NOT exist'} in schema ${process.env.PGSCHEMA || 'current_schema()'}`);
    if (exists) {
      try {
        const countRes = await client.query(`SELECT COUNT(*)::int AS n FROM ${quoteIdent(table)}`);
        console.log(`Row count for ${table}:`, countRes.rows[0]?.n ?? 0);
      } catch (e) {
        console.warn(`Could not count rows in ${table}:`, e.message);
      }
    }
    const ms = Date.now() - start;
    console.log(`✅ Database connection OK (${ms}ms)`);
    process.exit(0);
  } catch (e) {
    const ms = Date.now() - start;
    console.error(`❌ Database connection FAILED (${ms}ms):`, e.message);
    process.exit(1);
  } finally {
    try { await client.end(); } catch {}
  }
}

main();
