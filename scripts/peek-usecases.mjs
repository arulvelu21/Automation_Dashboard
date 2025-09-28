import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Client } from 'pg';

// Load env (.env.local preferred)
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
else dotenv.config();

function getConfig() {
  const { DATABASE_URL, PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, PGSSL } = process.env;
  if (DATABASE_URL) return { connectionString: DATABASE_URL, ssl: PGSSL === 'require' ? { rejectUnauthorized: false } : undefined };
  if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE) throw new Error('Missing PG env. Provide DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE');
  return { host: PGHOST, user: PGUSER, password: PGPASSWORD, database: PGDATABASE, port: PGPORT ? Number(PGPORT) : 5432, ssl: PGSSL === 'require' ? { rejectUnauthorized: false } : undefined };
}

function quoteIdent(id) { return '"' + String(id).replace(/"/g, '""') + '"'; }
function pickFirst(available, candidates) { for (const c of candidates) if (available.has(c)) return c; return undefined; }

async function main() {
  const cfg = getConfig();
  const client = new Client(cfg);
  await client.connect();
  try {
    const table = process.env.USECASE_TABLE || 'usecase_savings_ref';
    console.log(`Using table: ${table}`);
    const existsRes = await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1) AS exists`, [table]);
    if (!existsRes.rows[0]?.exists) {
      console.error(`Table ${table} does not exist in current schema.`);
      process.exit(2);
    }

    // Columns
    const colsRes = await client.query(
      `SELECT column_name, data_type, ordinal_position
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    console.log('Columns:', colsRes.rows);

    // Raw sample
    const rawRes = await client.query(`SELECT * FROM ${quoteIdent(table)} LIMIT 5`);
    console.log('\nRaw sample rows (up to 5):');
    console.table(rawRes.rows);

    // Build mapped SELECT similar to app mapping
    const cols = colsRes.rows.map(r => r.column_name);
    const set = new Set(cols.map(c => c.toLowerCase()));
    const idCol = pickFirst(set, ['id', 'usecase_id', 'uc_id', 'uuid']);
  const nameCol = pickFirst(set, ['name', 'usecase', 'use_case', 'usecase_name', 'use_case_name', 'title']);
    const descCol = pickFirst(set, ['description', 'desc', 'details', 'summary']);
    const ownerCol = pickFirst(set, ['owner', 'owner_name', 'team', 'group', 'squad']);
    const statusCol = pickFirst(set, ['status', 'state', 'lifecycle_status', 'prod_status']);
    const createdCol = pickFirst(set, ['created_at', 'createdon', 'created_on', 'created_ts', 'createddate', 'created_date', 'created_time', 'createdtime']);
    const liveBoolCol = pickFirst(set, ['is_live', 'live', 'is_active', 'active']);
    const envCol = pickFirst(set, ['environment', 'env', 'stage', 'deployment_env']);
    if (!nameCol) {
      console.warn('Could not find a name-like column; skipping mapped view.');
    } else {
      const selects = [];
      if (idCol) selects.push(`CAST(${quoteIdent(idCol)} AS TEXT) AS id`); else selects.push(`md5(CAST(${quoteIdent(nameCol)} AS TEXT)) AS id`);
      selects.push(`CAST(${quoteIdent(nameCol)} AS TEXT) AS name`);
      if (descCol) selects.push(`CAST(${quoteIdent(descCol)} AS TEXT) AS description`); else selects.push(`NULL::TEXT AS description`);
      if (ownerCol) selects.push(`CAST(${quoteIdent(ownerCol)} AS TEXT) AS owner`); else selects.push(`NULL::TEXT AS owner`);
      if (liveBoolCol) {
        const liveQ = quoteIdent(liveBoolCol);
        selects.push(`CASE WHEN ${liveQ} = true THEN 'ACTIVE' ELSE 'DRAFT' END AS status`);
      } else if (statusCol) {
        const s = quoteIdent(statusCol);
        selects.push(`CASE WHEN ${s} ILIKE 'deprec%' THEN 'DEPRECATED' WHEN ${s} ILIKE 'draft%' THEN 'DRAFT' WHEN ${s} ILIKE 'inactive%' THEN 'DRAFT' ELSE 'ACTIVE' END AS status`);
      } else {
        selects.push(`'ACTIVE'::TEXT AS status`);
      }
      if (createdCol) selects.push(`CAST(${quoteIdent(createdCol)} AS TEXT) AS created_at`); else selects.push(`now()::TEXT AS created_at`);

      const whereClauses = [];
      if (liveBoolCol) {
        whereClauses.push(`${quoteIdent(liveBoolCol)} = true`);
      } else if (statusCol) {
        const s = quoteIdent(statusCol);
        whereClauses.push(`(${s} ILIKE 'live' OR ${s} ILIKE 'prod%' OR ${s} ILIKE 'production%' OR ${s} ILIKE 'active%')`);
      } else if (envCol) {
        const e = quoteIdent(envCol);
        whereClauses.push(`(${e} ILIKE 'prod' OR ${e} ILIKE 'prod%' OR ${e} ILIKE 'production%')`);
      }
      const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const mappedSql = `SELECT ${selects.join(', ')} FROM ${quoteIdent(table)} ${where} ORDER BY 1 DESC LIMIT 10`;
      const mappedRes = await client.query(mappedSql);
      console.log('\nMapped sample rows (up to 10) [id,name,description,owner,status,created_at]:');
      console.table(mappedRes.rows);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('peek-usecases failed:', e);
  process.exit(1);
});
