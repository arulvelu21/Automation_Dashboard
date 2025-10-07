import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/lib/api-logging";
import { appLogger } from "@/lib/server-logger";

async function healthHandler(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Basic health check
    const healthData = {
      ok: true,
      time: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      nodeVersion: process.version,
    };

    appLogger.info({
      operation: 'health_check',
      duration_ms: Date.now() - startTime,
      memoryUsage: healthData.memory,
      uptime: healthData.uptime,
    }, 'Health check completed successfully');

    return NextResponse.json(healthData);
  } catch (error) {
    appLogger.error({
      operation: 'health_check',
      duration_ms: Date.now() - startTime,
      error: (error as Error).message,
    }, 'Health check failed');

    return NextResponse.json(
      { ok: false, error: 'Health check failed' },
      { status: 500 }
    );
  }
}

export const GET = withLogging(healthHandler, 'health-check');
