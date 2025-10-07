import { query, isMissingRelationError } from "./db";
import { z } from "zod";
import { appLogger, logError } from "./server-logger";

export type RunStatus = "PASS" | "FAIL" | "SKIP" | "RUNNING";

export interface RecentRun {
  id: string;
  useCaseId: string;
  useCaseName: string;
  status: RunStatus;
  durationSeconds: number;
  startedAt: string;
}

export interface SummaryStats {
  totalRuns: number;
  passed: number;
  failed: number;
  avgDuration: number;
}

export async function getSummaryStats(): Promise<SummaryStats> {
  try {
    const res = await query(
      `SELECT 
        COUNT(*)::int as total_runs,
        COUNT(*) FILTER (WHERE status='PASS')::int as passed,
        COUNT(*) FILTER (WHERE status='FAIL')::int as failed,
        COALESCE(ROUND(AVG(duration_seconds))::int, 0) as avg_duration
      FROM automation_runs`
    );
    if (!res) throw new Error("Database returned no result for summary stats");
    const row = res.rows[0] as any;
    return {
      totalRuns: Number(row.total_runs ?? 0),
      passed: Number(row.passed ?? 0),
      failed: Number(row.failed ?? 0),
      avgDuration: Number(row.avg_duration ?? 0),
    };
  } catch (err) {
    if (isMissingRelationError(err)) {
      return { totalRuns: 0, passed: 0, failed: 0, avgDuration: 0 };
    }
    throw err;
  }
}

export async function getRecentRuns(opts: { limit?: number } = {}): Promise<RecentRun[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
  try {
    const res = await query(
      `SELECT r.id, r.use_case_id, u.name as use_case_name, r.status, r.duration_seconds, r.started_at
       FROM automation_runs r
       JOIN automation_use_cases u ON u.id = r.use_case_id
       ORDER BY r.started_at DESC
       LIMIT $1`,
      [limit]
    );
    const schema = z.array(
      z.object({
        id: z.string(),
        use_case_id: z.string(),
        use_case_name: z.string(),
        status: z.enum(["PASS", "FAIL", "SKIP", "RUNNING"]),
        duration_seconds: z.number(),
        started_at: z.date().or(z.string()),
      })
    );
    if (!res) throw new Error("Database returned no result for recent runs");
    const parsed = schema.parse(res.rows as any);
    return parsed.map((r) => ({
      id: r.id,
      useCaseId: r.use_case_id,
      useCaseName: r.use_case_name,
      status: r.status,
      durationSeconds: r.duration_seconds,
      startedAt: typeof r.started_at === 'string' ? r.started_at : r.started_at.toISOString(),
    }));
  } catch (err) {
    if (isMissingRelationError(err)) {
      return [];
    }
    throw err;
  }
}

// Use Case Reference
export type UseCaseStatus = "ACTIVE" | "DEPRECATED" | "DRAFT";

export interface UseCaseRef {
  id: string;
  name: string;
  description?: string | null;
  owner?: string | null;
  status: UseCaseStatus;
  createdAt: string;
  updatedAt?: string | null;
}

export async function getUseCases(opts: { search?: string; status?: UseCaseStatus; limit?: number; offset?: number } = {}): Promise<UseCaseRef[]> {
  // If a local reference table is present, use it; otherwise fall back to the default automation_use_cases table.
  const preferRef = (process.env.USECASE_TABLE?.toLowerCase?.() === 'usecase_savings_ref');
  if (preferRef || (await tableExists('usecase_savings_ref'))) {
    try {
      return await getUseCasesFromSavingsRef(opts);
    } catch (e) {
      // Fall back silently if mapping fails, so the page still renders using the default table
      appLogger.warn({
        operation: 'usecase_fallback',
        attemptedTable: 'usecase_savings_ref',
        fallbackTable: 'automation_use_cases',
        error: (e as Error).message
      }, 'usecase_savings_ref query failed, falling back to automation_use_cases');
    }
  }

  const { search, status } = opts;
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const clauses: string[] = [];
  const params: any[] = [];
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(u.name ILIKE $${params.length} OR u.description ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    clauses.push(`u.status = $${params.length}`);
  }
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sql = `
    SELECT u.id, u.name, u.description, u.owner, u.status, u.created_at, u.updated_at
    FROM automation_use_cases u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${limitIdx}
    OFFSET $${offsetIdx}
  `;
  const res = await query(sql, params);

  const schema = z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
      owner: z.string().nullable().optional(),
      status: z.enum(["ACTIVE", "DEPRECATED", "DRAFT"]).or(z.string()),
      created_at: z.date().or(z.string()),
      updated_at: z.date().or(z.string()).nullable().optional(),
    })
  );
  if (!res) throw new Error("Database returned no result for use cases");
  const rows = schema.parse(res.rows as any);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    owner: r.owner ?? null,
    status: (typeof r.status === 'string' ? r.status : 'ACTIVE') as UseCaseStatus,
    createdAt: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
    updatedAt: r.updated_at ? (typeof r.updated_at === 'string' ? r.updated_at : new Date(r.updated_at).toISOString()) : null,
  }));
}

// --- Adaptive support for custom reference table: usecase_savings_ref ---
let tableExistsCache: Record<string, boolean> = {};

async function tableExists(tableName: string): Promise<boolean> {
  if (tableExistsCache[tableName] !== undefined) return tableExistsCache[tableName];
  const schema = process.env.PGSCHEMA;
  const res = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables 
       WHERE table_schema = COALESCE(nullif($2, ''), current_schema()) AND table_name = $1
     ) AS exists`,
    [tableName, schema]
  );
  const exists = !!res?.rows?.[0]?.exists;
  tableExistsCache[tableName] = exists;
  return exists;
}

function quoteIdent(id: string) {
  return '"' + id.replace(/"/g, '""') + '"';
}

function pickFirst<T extends string>(available: Set<string>, candidates: T[]): string | undefined {
  for (const c of candidates) {
    if (available.has(c)) return c;
  }
  return undefined;
}

export async function getUseCasesFromSavingsRef(opts: { search?: string; status?: UseCaseStatus; limit?: number; offset?: number } = {}): Promise<UseCaseRef[]> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const search = opts.search;
  // Fetch column metadata
  const schema = process.env.PGSCHEMA;
  const colsRes = await query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_schema = COALESCE(nullif($2, ''), current_schema()) AND table_name = $1`,
    ['usecase_savings_ref', schema]
  );
  if (!colsRes || colsRes.rowCount === 0) {
    throw new Error('Table usecase_savings_ref not found in current schema');
  }
  const cols = colsRes.rows.map((r) => r.column_name);
  const set = new Set(cols.map((c) => c.toLowerCase()));

  const idCol = pickFirst(set, ['id', 'usecase_id', 'uc_id', 'uuid']);
  const nameCol = pickFirst(set, ['name', 'usecase', 'use_case', 'usecase_name', 'use_case_name', 'title']);
  const descCol = pickFirst(set, ['description', 'desc', 'details', 'summary']);
  const ownerCol = pickFirst(set, ['owner', 'owner_name', 'team', 'group', 'squad']);
  const statusCol = pickFirst(set, ['status', 'state', 'lifecycle_status', 'prod_status']);
  const createdCol = pickFirst(set, ['created_at', 'createdon', 'created_on', 'created_ts', 'createddate', 'created_date', 'created_time', 'createdtime']);
  const liveBoolCol = pickFirst(set, ['is_live', 'live', 'is_active', 'active']);
  const envCol = pickFirst(set, ['environment', 'env', 'stage', 'deployment_env']);

  if (!nameCol) {
    throw new Error('Unable to map a name column in usecase_savings_ref');
  }

  const selects: string[] = [];
  // id
  if (idCol) {
    selects.push(`CAST(${quoteIdent(idCol)} AS TEXT) AS id`);
  } else {
    // synthesize a stable id from name
    selects.push(`md5(CAST(${quoteIdent(nameCol)} AS TEXT)) AS id`);
  }
  // name
  selects.push(`CAST(${quoteIdent(nameCol)} AS TEXT) AS name`);
  // description
  if (descCol) selects.push(`CAST(${quoteIdent(descCol)} AS TEXT) AS description`);
  else selects.push(`NULL::TEXT AS description`);
  // owner
  if (ownerCol) selects.push(`CAST(${quoteIdent(ownerCol)} AS TEXT) AS owner`);
  else selects.push(`NULL::TEXT AS owner`);
  // status mapping
  if (liveBoolCol) {
    const liveQ = quoteIdent(liveBoolCol);
    selects.push(`CASE WHEN ${liveQ} = true THEN 'ACTIVE' ELSE 'DRAFT' END AS status`);
  } else if (statusCol) {
    const s = quoteIdent(statusCol);
    selects.push(`CASE 
      WHEN ${s} ILIKE 'deprec%' THEN 'DEPRECATED'
      WHEN ${s} ILIKE 'draft%' THEN 'DRAFT'
      WHEN ${s} ILIKE 'inactive%' THEN 'DRAFT'
      ELSE 'ACTIVE'
    END AS status`);
  } else {
    selects.push(`'ACTIVE'::TEXT AS status`);
  }
  // createdAt
  if (createdCol) {
    selects.push(`CAST(${quoteIdent(createdCol)} AS TEXT) AS created_at`);
  } else {
    selects.push(`now()::TEXT AS created_at`);
  }

  const whereClauses: string[] = [];
  const params: any[] = [];

  // Live in production filter
  if (liveBoolCol) {
    whereClauses.push(`${quoteIdent(liveBoolCol)} = true`);
  } else if (statusCol) {
    const s = quoteIdent(statusCol);
    whereClauses.push(`(${s} ILIKE 'live' OR ${s} ILIKE 'prod%' OR ${s} ILIKE 'production%' OR ${s} ILIKE 'active%')`);
  } else if (envCol) {
    const e = quoteIdent(envCol);
    whereClauses.push(`(${e} ILIKE 'prod' OR ${e} ILIKE 'prod%' OR ${e} ILIKE 'production%')`);
  }

  if (search) {
    const likeParam = `%${search}%`;
    params.push(likeParam);
    const idx = params.length;
    const nameExpr = `CAST(${quoteIdent(nameCol)} AS TEXT)`;
    const descExpr = descCol ? `CAST(${quoteIdent(descCol)} AS TEXT)` : `''`;
    whereClauses.push(`( ${nameExpr} ILIKE $${idx} OR ${descExpr} ILIKE $${idx} )`);
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const sql = `
    SELECT ${selects.join(', ')}
    FROM ${quoteIdent('usecase_savings_ref')}
    ${where}
    ORDER BY 1 DESC
    LIMIT $${limitIdx}
    OFFSET $${offsetIdx}
  `;

  const res = await query(sql, params);
  if (!res) throw new Error('Database returned no result for usecase_savings_ref');

  // Coerce rows into UseCaseRef
  const out: UseCaseRef[] = (res.rows as any[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: r.description ?? null,
    owner: r.owner ?? null,
    status: (r.status as UseCaseStatus) ?? 'ACTIVE',
    createdAt: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
    updatedAt: null,
  }));
  return out;
}

// --- Savings Ref dashboard helpers ---
export interface SavingsRefRow {
  id: string;
  useCaseName: string;
  savingsType: string | null;
  fixedSavingsPerRun: number;
  savingsPerRun: number;
  partialSavingsPerRun: number;
}

export async function getSavingsUseCases(opts: { search?: string; type?: string; limit?: number; offset?: number } = {}): Promise<SavingsRefRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);
  const search = opts.search?.trim();
  const type = opts.type?.trim();

  // Ensure table exists
  if (!(await tableExists('usecase_savings_ref'))) {
    throw new Error('Table usecase_savings_ref not found');
  }

  const clauses: string[] = [];
  const params: any[] = [];
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`use_case_name ILIKE $${params.length}`);
  }
  if (type) {
    params.push(type);
    clauses.push(`savings_type = $${params.length}`);
  }
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT 
      md5(CAST(use_case_name AS TEXT)) AS id,
      CAST(use_case_name AS TEXT) AS use_case_name,
      CAST(savings_type AS TEXT) AS savings_type,
      COALESCE(fixed_savings_per_run, 0) AS fixed_savings_per_run,
      COALESCE(savings_per_run, 0) AS savings_per_run,
      COALESCE(partial_savings_per_run, 0) AS partial_savings_per_run
    FROM usecase_savings_ref
    ${where}
    ORDER BY use_case_name ASC
    LIMIT $${limitIdx}
    OFFSET $${offsetIdx}
  `;
  const res = await query(sql, params);
  if (!res) throw new Error('No result from usecase_savings_ref');
  return (res.rows as any[]).map((r) => ({
    id: String(r.id),
    useCaseName: String(r.use_case_name),
    savingsType: r.savings_type ?? null,
    fixedSavingsPerRun: Number(r.fixed_savings_per_run ?? 0),
    savingsPerRun: Number(r.savings_per_run ?? 0),
    partialSavingsPerRun: Number(r.partial_savings_per_run ?? 0),
  }));
}

export async function getSavingsTypes(): Promise<string[]> {
  if (!(await tableExists('usecase_savings_ref'))) return [];
  const res = await query<{ savings_type: string }>(
    `SELECT DISTINCT CAST(savings_type AS TEXT) AS savings_type FROM usecase_savings_ref WHERE savings_type IS NOT NULL ORDER BY 1`
  );
  return res?.rows?.map((r) => r.savings_type)?.filter(Boolean) ?? [];
}

// --- Use Case overview (stakeholder, description, HLD link) ---
export interface UseCaseOverview {
  name: string;
  stakeholder: string | null;
  description: string | null;
  hldUrl: string | null;
}

export async function getUseCaseOverviewByName(name: string): Promise<UseCaseOverview | null> {
  const n = name?.trim();
  if (!n) return null;

  // Prefer savings ref if available, attempting to map likely columns dynamically
  if (await tableExists('usecase_savings_ref')) {
    try {
      const schema = process.env.PGSCHEMA;
      const colsRes = await query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_schema = COALESCE(nullif($2, ''), current_schema()) AND table_name = $1`,
        ['usecase_savings_ref', schema]
      );
      const cols = (colsRes?.rows ?? []).map((r) => r.column_name.toLowerCase());
      const set = new Set(cols);
      const nameCol = pickFirst(set, ['name','usecase_name','use_case_name','usecase','use_case','title']);
      const ownerCol = pickFirst(set, ['stakeholder','owner','owner_name','business_owner','product_owner','team','group','squad']);
      const descCol = pickFirst(set, ['process_summary','process','short_desc','short_description','description','desc','details','summary']);
      const hldCol = pickFirst(set, ['hld','hld_link','hldurl','hld_url','confluence','confluence_link','confluence_url','doc','doc_link','documentation','wiki','wiki_link']);
      if (nameCol) {
        function qi(id: string) { return '"' + id.replace(/"/g, '""') + '"'; }
        const params: any[] = [n];
        const where = `LOWER(TRIM(CAST(${qi(nameCol)} AS TEXT))) = LOWER(TRIM($1))`;
        const selects = [
          `CAST(${qi(nameCol)} AS TEXT) AS name`,
          ownerCol ? `CAST(${qi(ownerCol)} AS TEXT) AS stakeholder` : `NULL::TEXT AS stakeholder`,
          descCol ? `CAST(${qi(descCol)} AS TEXT) AS description` : `NULL::TEXT AS description`,
          hldCol ? `CAST(${qi(hldCol)} AS TEXT) AS hld_url` : `NULL::TEXT AS hld_url`,
        ];
        const sql = `SELECT ${selects.join(', ')} FROM ${qi('usecase_savings_ref')} WHERE ${where} LIMIT 1`;
        const res = await query(sql, params);
        const row = res?.rows?.[0] as any;
        if (row) {
          return {
            name: String(row.name),
            stakeholder: row.stakeholder ?? null,
            description: row.description ?? null,
            hldUrl: row.hld_url ?? null,
          };
        }
      }
    } catch (e) {
      appLogger.warn({
        operation: 'use_case_overview_lookup',
        table: 'usecase_savings_ref',
        useCaseName: n,
        error: (e as Error).message
      }, 'getUseCaseOverviewByName savings_ref lookup failed');
    }
  }

  // Fallback to automation_use_cases if present
  if (await tableExists('automation_use_cases')) {
    const res = await query(
      `SELECT CAST(name AS TEXT) AS name, CAST(owner AS TEXT) AS stakeholder, CAST(description AS TEXT) AS description
       FROM automation_use_cases
       WHERE LOWER(TRIM(CAST(name AS TEXT))) = LOWER(TRIM($1))
       LIMIT 1`,
      [n]
    );
    const row = res?.rows?.[0] as any;
    if (row) {
      return {
        name: String(row.name),
        stakeholder: row.stakeholder ?? null,
        description: row.description ?? null,
        hldUrl: null,
      };
    }
  }

  return null;
}

// --- Reporting aggregates joined with savings ---
export interface ReportingAggregate {
  useCaseName: string;
  success: number;
  failure: number;
  invalid: number;
  partial: number;
  executions: number;
  minutes: {
    fixedTotal: number;
    variableSuccessTotal: number;
    variablePartialTotal: number;
    total: number;
  };
}

type FixedPeriod = 'per_day' | 'per_week' | 'per_month' | 'per_range';

export async function getReportingAggregates(opts: { from?: string | Date; to?: string | Date; search?: string; names?: string[]; fixedPeriod?: FixedPeriod } = {}): Promise<ReportingAggregate[]> {
  const reportingTable = process.env.REPORTING_TABLE || 'reporting';
  if (!(await tableExists(reportingTable))) {
    // Gracefully degrade to empty when reporting table is unavailable
    return [];
  }

  // fetch reporting columns to find identifiers
  const schema = process.env.PGSCHEMA;
  const colsRes = await query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = COALESCE(nullif($2, ''), current_schema()) AND table_name = $1`,
    [reportingTable, schema]
  );
  const colSet = new Set((colsRes?.rows ?? []).map((r) => r.column_name.toLowerCase()));
  const colsByType = new Map<string, string[]>();
  for (const r of (colsRes?.rows ?? [])) {
    const k = r.data_type.toLowerCase();
    const arr = colsByType.get(k) || [];
    arr.push(r.column_name.toLowerCase());
    colsByType.set(k, arr);
  }
  const envName = process.env.REPORTING_NAME_COLUMN?.toLowerCase();
  const envDate = process.env.REPORTING_DATE_COLUMN?.toLowerCase();
  const envSucc = process.env.REPORTING_SUCCESS_COLUMN?.toLowerCase();
  const envFail = process.env.REPORTING_FAILURE_COLUMN?.toLowerCase();
  const envInv = process.env.REPORTING_INVALID_COLUMN?.toLowerCase();
  const envPar = process.env.REPORTING_PARTIAL_COLUMN?.toLowerCase();

  const nameCol = envName || pickFirst(colSet, ['use_case_name','usecase_name','usecase','use_case','name']);
  let dateCol = envDate || pickFirst(colSet, ['date','day','run_date','executed_at','created_at','ts','timestamp','reported_at']);
  if (!dateCol) {
    // Fallback: choose first date-ish column by type
    const dateTypeCols = [
      ...(colsByType.get('date') || []),
      ...(colsByType.get('timestamp without time zone') || []),
      ...(colsByType.get('timestamp with time zone') || []),
    ];
    dateCol = dateTypeCols[0];
  }
  const successCol = envSucc || pickFirst(colSet, ['success','success_count','passed','pass']);
  const failureCol = envFail || pickFirst(colSet, ['failure','fail','failed','failure_count']);
  const invalidCol = envInv || pickFirst(colSet, ['invalid','invalid_count','skip','skipped']);
  const partialCol = envPar || pickFirst(colSet, ['partial','partial_count','partially_successful']);

  if (!nameCol) {
    throw new Error('Unable to detect use case name column in reporting');
  }

  function qi(id: string) { return '"' + id.replace(/"/g, '""') + '"'; }

  const whereClauses: string[] = [];
  const params: any[] = [];
  // time range: treat 'to' as inclusive day by querying < (to + 1 day)
  function isDateOnlyString(v: unknown): v is string {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  }
  function toDate(v: string | Date | undefined, fallback: Date): Date {
    if (!v) return fallback;
    if (isDateOnlyString(v)) {
      // Interpret as UTC start of day for stability
      return new Date(`${v}T00:00:00Z`);
    }
    return new Date(v);
  }
  let from = toDate(opts.from as any, new Date(Date.now() - 30*24*60*60*1000));
  let to = toDate(opts.to as any, new Date());
  if (from > to) { const t = from; from = to; to = t; }
  // exclusive upper bound
  const toExclusive = new Date(to.getTime() + 24*60*60*1000);
  // determine fixed savings period handling (defaults to weekly per business guidance)
  function parseFixedPeriod(v: any): FixedPeriod | undefined {
    const s = String(v || '').toLowerCase().trim();
    if (!s) return undefined;
    if (s === 'per_day' || s === 'day' || s === 'daily') return 'per_day';
    if (s === 'per_week' || s === 'week' || s === 'weekly') return 'per_week';
    if (s === 'per_month' || s === 'month' || s === 'monthly') return 'per_month';
    if (s === 'per_range' || s === 'range' || s === 'total') return 'per_range';
    return undefined;
  }
  const fixedPeriod: FixedPeriod = opts.fixedPeriod || parseFixedPeriod(process.env.FIXED_SAVINGS_PERIOD) || 'per_week';
  function countPeriods(fp: FixedPeriod, start: Date, endExclusive: Date): number {
    const ms = endExclusive.getTime() - start.getTime();
    const oneDay = 24*60*60*1000;
    if (fp === 'per_range') return 1;
    if (fp === 'per_day') {
      const days = ms / oneDay; 
      return Math.max(1, Math.ceil(days));
    }
    if (fp === 'per_week') {
      const weeks = ms / (7*oneDay);
      return Math.max(1, Math.ceil(weeks));
    }
    if (fp === 'per_month') {
      // Approximate months by calendar boundaries: count distinct month starts overlapped by [start, endExclusive)
      const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      const e = new Date(Date.UTC(endExclusive.getUTCFullYear(), endExclusive.getUTCMonth(), 1));
      // number of months between s and e, inclusive if range crosses into next month
      const months = (e.getUTCFullYear() - s.getUTCFullYear())*12 + (e.getUTCMonth() - s.getUTCMonth());
      return Math.max(1, months + 1);
    }
    return 1;
  }
  const fixedPeriodsInRange = countPeriods(fixedPeriod, from, toExclusive);
  if (dateCol) {
    params.push(from.toISOString());
    const fromIdx = params.length;
    params.push(toExclusive.toISOString());
    const toIdx = params.length;
    // Compare with explicit timestamptz cast to be robust across DATE/TIMESTAMP column types
    whereClauses.push(`(${qi(dateCol)}::timestamptz) >= $${fromIdx} AND (${qi(dateCol)}::timestamptz) < $${toIdx}`);
  } else {
    console.warn(`No date column detected in ${reportingTable}; time range filter will be ignored. Set REPORTING_DATE_COLUMN to fix.`);
  }
  if (opts.search && opts.search.trim()) {
    params.push(`%${opts.search.trim()}%`);
    const idx = params.length;
    whereClauses.push(`CAST(${qi(nameCol)} AS TEXT) ILIKE $${idx}`);
  }
  if (opts.names && opts.names.length) {
    const normalized = opts.names.map((n) => n?.trim()?.toLowerCase()).filter(Boolean) as string[];
    if (normalized.length) {
      params.push(normalized);
      const idx = params.length;
      whereClauses.push(`LOWER(TRIM(CAST(${qi(nameCol)} AS TEXT))) = ANY($${idx}::text[])`);
    }
  }
  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Build aggregates; if a count column is missing, coalesce to 0
  const sExpr = successCol ? `COALESCE(${qi(successCol)},0)` : `0`;
  const fExpr = failureCol ? `COALESCE(${qi(failureCol)},0)` : `0`;
  const iExpr = invalidCol ? `COALESCE(${qi(invalidCol)},0)` : `0`;
  const pExpr = partialCol ? `COALESCE(${qi(partialCol)},0)` : `0`;

  const sql = `
    SELECT 
      LOWER(TRIM(CAST(${qi(nameCol)} AS TEXT))) AS key_name,
      CAST(${qi(nameCol)} AS TEXT) AS use_case_name,
      SUM(${sExpr})::int AS success,
      SUM(${fExpr})::int AS failure,
      SUM(${iExpr})::int AS invalid,
      SUM(${pExpr})::int AS partial
    FROM ${qi(reportingTable)}
    ${where}
    GROUP BY key_name, use_case_name
    ORDER BY use_case_name ASC
  `;
  const aggRes = await query(sql, params);
  const rows = (aggRes?.rows ?? []).map((r: any) => ({
    keyName: String(r.key_name),
    useCaseName: String(r.use_case_name),
    success: Number(r.success ?? 0),
    failure: Number(r.failure ?? 0),
    invalid: Number(r.invalid ?? 0),
    partial: Number(r.partial ?? 0),
  }));

  // Fetch savings ref map (optional). If the reference table is missing, proceed with zero savings.
  const savMap = new Map<string, { fixed: number; variable: number; partial: number; type?: string | null }>();
  try {
    if (await tableExists('usecase_savings_ref')) {
      const savRes = await query(
        `SELECT CAST(use_case_name AS TEXT) AS use_case_name, 
                COALESCE(fixed_savings_per_run,0) AS fixed, 
                COALESCE(savings_per_run,0) AS variable,
                COALESCE(partial_savings_per_run,0) AS partial,
                CAST(savings_type AS TEXT) AS savings_type
         FROM usecase_savings_ref`
      );
      for (const r of (savRes?.rows ?? []) as any[]) {
        const key = String(r.use_case_name).trim().toLowerCase();
        savMap.set(key, { fixed: Number(r.fixed ?? 0), variable: Number(r.variable ?? 0), partial: Number(r.partial ?? 0), type: r.savings_type ?? null });
      }
    }
  } catch (err) {
    // If the table is missing for any reason, ignore and continue with empty savings
    if (!isMissingRelationError(err)) throw err;
  }

  // Compute minutes saved
  const out: ReportingAggregate[] = rows.map((r) => {
    const minutes = savMap.get(r.keyName) ?? { fixed: 0, variable: 0, partial: 0, type: null };
    const executions = r.success + r.failure + r.invalid + r.partial;
    // If savings_type indicates a fixed model, treat fixed as period-based, not per execution.
    const isFixedType = typeof minutes.type === 'string' && minutes.type.toLowerCase().includes('fix');
    const fixedTotal = isFixedType
      ? (fixedPeriodsInRange * minutes.fixed)
      : (executions * minutes.fixed);
    const variableSuccessTotal = r.success * minutes.variable;
    const variablePartialTotal = r.partial * minutes.partial;
    const total = fixedTotal + variableSuccessTotal + variablePartialTotal;
    return {
      useCaseName: r.useCaseName,
      success: r.success,
      failure: r.failure,
      invalid: r.invalid,
      partial: r.partial,
      executions,
      minutes: { fixedTotal, variableSuccessTotal, variablePartialTotal, total },
    };
  });

  return out;
}

// Daily aggregates grouped by day and use case
export interface ReportingDailyRow {
  day: string; // ISO date string (yyyy-mm-dd)
  useCaseName: string;
  success: number;
  failure: number;
  invalid: number;
  partial: number;
  total: number;
}

export async function getReportingDailyAggregates(opts: { from?: string | Date; to?: string | Date; search?: string; limitDays?: number } = {}): Promise<ReportingDailyRow[]> {
  const reportingTable = process.env.REPORTING_TABLE || 'reporting';
  if (!(await tableExists(reportingTable))) {
    throw new Error(`Table ${reportingTable} not found`);
  }

  // fetch reporting columns to find identifiers
  const schema = process.env.PGSCHEMA;
  const colsRes = await query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = COALESCE(nullif($2, ''), current_schema()) AND table_name = $1`,
    [reportingTable, schema]
  );
  const colSet = new Set((colsRes?.rows ?? []).map((r) => r.column_name.toLowerCase()));
  const colsByType = new Map<string, string[]>();
  for (const r of (colsRes?.rows ?? [])) {
    const k = r.data_type.toLowerCase();
    const arr = colsByType.get(k) || [];
    arr.push(r.column_name.toLowerCase());
    colsByType.set(k, arr);
  }
  const envName = process.env.REPORTING_NAME_COLUMN?.toLowerCase();
  const envDate = process.env.REPORTING_DATE_COLUMN?.toLowerCase();
  const envSucc = process.env.REPORTING_SUCCESS_COLUMN?.toLowerCase();
  const envFail = process.env.REPORTING_FAILURE_COLUMN?.toLowerCase();
  const envInv = process.env.REPORTING_INVALID_COLUMN?.toLowerCase();
  const envPar = process.env.REPORTING_PARTIAL_COLUMN?.toLowerCase();

  const nameCol = envName || pickFirst(colSet, ['use_case_name','usecase_name','usecase','use_case','name']);
  let dateCol = envDate || pickFirst(colSet, ['date','day','run_date','executed_at','created_at','ts','timestamp','reported_at']);
  if (!dateCol) {
    const dateTypeCols = [
      ...(colsByType.get('date') || []),
      ...(colsByType.get('timestamp without time zone') || []),
      ...(colsByType.get('timestamp with time zone') || []),
    ];
    dateCol = dateTypeCols[0];
  }
  const successCol = envSucc || pickFirst(colSet, ['success','success_count','passed','pass']);
  const failureCol = envFail || pickFirst(colSet, ['failure','fail','failed','failure_count']);
  const invalidCol = envInv || pickFirst(colSet, ['invalid','invalid_count','skip','skipped']);
  const partialCol = envPar || pickFirst(colSet, ['partial','partial_count','partially_successful']);

  if (!nameCol || !dateCol) throw new Error('Unable to detect name/date columns in reporting');
  function qi(id: string) { return '"' + id.replace(/"/g, '""') + '"'; }

  const whereClauses: string[] = [];
  const params: any[] = [];
  function isDateOnlyString(v: unknown): v is string { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function toDate(v: string | Date | undefined, fallback: Date): Date {
    if (!v) return fallback; if (isDateOnlyString(v)) return new Date(`${v}T00:00:00Z`); return new Date(v);
  }
  let from = toDate(opts.from as any, new Date(Date.now() - 7*24*60*60*1000));
  let to = toDate(opts.to as any, new Date());
  if (from > to) { const t = from; from = to; to = t; }
  const toExclusive = new Date(to.getTime() + 24*60*60*1000);
  params.push(from.toISOString()); const fromIdx = params.length;
  params.push(toExclusive.toISOString()); const toIdx = params.length;
  whereClauses.push(`(${qi(dateCol)}::timestamptz) >= $${fromIdx} AND (${qi(dateCol)}::timestamptz) < $${toIdx}`);

  if (opts.search && opts.search.trim()) {
    params.push(`%${opts.search.trim()}%`); const i = params.length;
    whereClauses.push(`CAST(${qi(nameCol)} AS TEXT) ILIKE $${i}`);
  }
  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sExpr = successCol ? `COALESCE(${qi(successCol)},0)` : `0`;
  const fExpr = failureCol ? `COALESCE(${qi(failureCol)},0)` : `0`;
  const iExpr = invalidCol ? `COALESCE(${qi(invalidCol)},0)` : `0`;
  const pExpr = partialCol ? `COALESCE(${qi(partialCol)},0)` : `0`;

  const sql = `
    SELECT 
      (DATE_TRUNC('day', (${qi(dateCol)}::timestamptz)))::date AS day,
      CAST(${qi(nameCol)} AS TEXT) AS use_case_name,
      SUM(${sExpr})::int AS success,
      SUM(${fExpr})::int AS failure,
      SUM(${iExpr})::int AS invalid,
      SUM(${pExpr})::int AS partial
    FROM ${qi(reportingTable)}
    ${where}
    GROUP BY day, use_case_name
    ORDER BY day DESC, use_case_name ASC
  `;
  const res = await query(sql, params);
  const out: ReportingDailyRow[] = (res?.rows ?? []).map((r: any) => {
    const success = Number(r.success ?? 0);
    const failure = Number(r.failure ?? 0);
    const invalid = Number(r.invalid ?? 0);
    const partial = Number(r.partial ?? 0);
    const total = success + failure + invalid + partial;
    // day to ISO yyyy-mm-dd
    const day = (r.day instanceof Date) ? r.day.toISOString().slice(0,10) : String(r.day).slice(0,10);
    return {
      day,
      useCaseName: String(r.use_case_name),
      success, failure, invalid, partial, total,
    };
  });
  // Optional: limit number of days
  const limitDays = Math.max(1, Math.min(opts.limitDays ?? 7, 31));
  const byDay = new Map<string, ReportingDailyRow[]>();
  for (const row of out) {
    const arr = byDay.get(row.day) || [];
    arr.push(row);
    byDay.set(row.day, arr);
  }
  // Keep latest N days
  const days = Array.from(byDay.keys()).sort((a,b) => a < b ? 1 : -1).slice(0, limitDays);
  const filtered: ReportingDailyRow[] = [];
  for (const d of days) {
    const arr = byDay.get(d)!;
    filtered.push(...arr);
  }
  return filtered;
}
