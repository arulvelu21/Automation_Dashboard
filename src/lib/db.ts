import { Pool, QueryResult, QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, DATABASE_URL } = process.env;
  const hasUrl = !!DATABASE_URL;
  if (hasUrl) {
    pool = new Pool({ connectionString: DATABASE_URL, ssl: getSSL() });
  } else if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    pool = new Pool({ host: PGHOST, user: PGUSER, password: PGPASSWORD, database: PGDATABASE, port: PGPORT ? Number(PGPORT) : 5432, ssl: getSSL() });
  }
  return pool;
}

function getSSL() {
  if (process.env.PGSSL === "require") return { rejectUnauthorized: false } as any;
  return undefined as any;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T> | null> {
  const p = getPool();
  if (!p) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE env vars.");
  }
  try {
    return (await p.query(text, params)) as QueryResult<T>;
  } catch (err) {
    // Surface DB errors directly so callers can handle or bubble to Next error boundary
    throw err;
  }
}

// Utility to detect 'relation does not exist' (undefined_table) errors
// Postgres error code: 42P01
export function isMissingRelationError(err: unknown): boolean {
  const code = (err as any)?.code;
  return code === '42P01';
}
