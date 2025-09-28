import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Client } from 'pg';

// Load .env.local first (Next.js convention), then fallback to .env
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
} else {
  dotenv.config();
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

const ddl = `
CREATE TABLE IF NOT EXISTS automation_use_cases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','DEPRECATED','DRAFT')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  use_case_id TEXT NOT NULL REFERENCES automation_use_cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PASS','FAIL','SKIP','RUNNING')),
  duration_seconds INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const seedUseCases = async (client) => {
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM automation_use_cases');
  if (rows[0].n > 0) return; // already seeded
  const owners = ['QA', 'Automation', 'SDET Team', 'Platform'];
  const statuses = ['ACTIVE','DRAFT','DEPRECATED'];
  const values = [];
  for (let i = 1; i <= 12; i++) {
    values.push({
      id: `uc_${i}`,
      name: `Use Case ${i}`,
      description: `Sample use case ${i} created by init script`,
      owner: owners[i % owners.length],
      status: statuses[i % statuses.length],
    });
  }
  for (const v of values) {
    await client.query(
      `INSERT INTO automation_use_cases (id, name, description, owner, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [v.id, v.name, v.description, v.owner, v.status]
    );
  }
};

async function main() {
  const cfg = getConfig();
  const client = new Client(cfg);
  await client.connect();
  try {
    console.log('Creating tables if not exists...');
    await client.query(ddl);
    console.log('Seeding use cases (if empty)...');
    await seedUseCases(client);
    console.log('Done.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('DB init failed:', e);
  process.exit(1);
});
