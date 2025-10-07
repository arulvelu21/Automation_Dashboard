import { Pool, QueryResult, QueryResultRow } from "pg";
import { dbLogger, logDatabaseOperation, logError } from './server-logger';

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;
  const { 
    PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, 
    DATABASE_URL, PGSCHEMA,
    // Optional: Read replica support
    PGHOST_READ, DATABASE_URL_READ,
    // Optional: Connection tuning
    PGMAXCONNECTIONS, PGIDLE_TIMEOUT
  } = process.env;
  
  // Prefer read replica if configured
  const connectionString = DATABASE_URL_READ || DATABASE_URL;
  const host = PGHOST_READ || PGHOST;
  
  const hasUrl = !!connectionString;
  if (hasUrl) {
    pool = new Pool({ 
      connectionString, 
      ssl: getSSL(),
      // Production optimizations
      max: parseInt(PGMAXCONNECTIONS || '20', 10),
      idleTimeoutMillis: parseInt(PGIDLE_TIMEOUT || '30000', 10),
    });
  } else if (host && PGUSER && PGPASSWORD && PGDATABASE) {
    const config = { 
      host, 
      user: PGUSER, 
      password: PGPASSWORD, 
      database: PGDATABASE, 
      port: PGPORT ? Number(PGPORT) : 5432, 
      ssl: getSSL(),
      max: parseInt(PGMAXCONNECTIONS || '20', 10),
      idleTimeoutMillis: parseInt(PGIDLE_TIMEOUT || '30000', 10),
    };
    pool = new Pool(config);
  }
  
  // Set schema if specified
  if (pool && PGSCHEMA) {
    pool.on('connect', async (client) => {
      try {
        await client.query(`SET search_path TO ${PGSCHEMA}`);
        // Optional: Set read-only mode for extra safety with read replicas
        if (DATABASE_URL_READ || PGHOST_READ) {
          await client.query(`SET default_transaction_read_only = on`);
        }
        
        dbLogger.debug({
          schema: PGSCHEMA,
          readReplica: !!(DATABASE_URL_READ || PGHOST_READ),
          pid: process.pid
        }, 'Database client connected and configured');
      } catch (err) {
        logError(err as Error, {
          operation: 'schema_setup',
          schema: PGSCHEMA,
          readReplica: !!(DATABASE_URL_READ || PGHOST_READ)
        });
      }
    });

    // Log connection pool events
    pool.on('error', (err) => {
      logError(err, {
        operation: 'pool_error',
        poolSize: pool?.totalCount,
        idleCount: pool?.idleCount
      });
    });

    pool.on('connect', () => {
      dbLogger.debug({
        totalConnections: pool?.totalCount,
        idleConnections: pool?.idleCount,
        waitingClients: pool?.waitingCount
      }, 'New database connection established');
    });
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
  const startTime = Date.now();
  const p = getPool();
  
  if (!p) {
    const error = new Error("PostgreSQL is not configured. Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE env vars.");
    logError(error, { 
      operation: 'query_execution',
      queryType: 'unknown',
      configured: false 
    });
    throw error;
  }

  // Extract query type for logging
  const queryType = text.trim().split(' ')[0]?.toLowerCase() || 'unknown';
  const queryId = Math.random().toString(36).substring(7);
  
  try {
    const result = (await p.query(text, params)) as QueryResult<T>;
    const duration = Date.now() - startTime;
    
    logDatabaseOperation('query_execution', {
      queryId,
      queryType,
      rowCount: result.rowCount,
      paramCount: params?.length || 0,
      success: true,
      poolStats: {
        total: p.totalCount,
        idle: p.idleCount,
        waiting: p.waitingCount
      }
    }, duration);

    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    
    logError(err as Error, {
      operation: 'query_execution',
      queryId,
      queryType,
      paramCount: params?.length || 0,
      duration_ms: duration,
      poolStats: {
        total: p.totalCount,
        idle: p.idleCount,
        waiting: p.waitingCount
      },
      sqlState: (err as any)?.code,
      queryPreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });
    
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
