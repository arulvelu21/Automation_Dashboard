import { NextRequest } from "next/server";
import { getReportingAggregates } from "@/lib/data";
import { withLogging, logBusinessOperation } from "@/lib/api-logging";
import { generateRequestId } from "@/lib/api-logging";

async function reportingAggregatesHandler(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const search = searchParams.get("search") || undefined;
  const fp = (searchParams.get("fixedPeriod") || undefined) as string | undefined;
  
  const fixedPeriod = ((): "per_day" | "per_week" | "per_month" | "per_range" | undefined => {
    if (!fp) return undefined;
    const v = fp.toLowerCase();
    if (["per_day", "day", "daily"].includes(v)) return "per_day";
    if (["per_week", "week", "weekly"].includes(v)) return "per_week";
    if (["per_month", "month", "monthly"].includes(v)) return "per_month";
    if (["per_range", "range", "total"].includes(v)) return "per_range";
    return undefined;
  })();
  
  // Optional repeated params: name=Use+Case+One&name=Another
  const names = searchParams.getAll("name").filter(Boolean);
  
  const queryParams = {
    from,
    to,
    search,
    fixedPeriod,
    namesCount: names.length,
    hasDateFilter: !!(from || to),
    hasSearchFilter: !!search,
    hasNameFilter: names.length > 0,
  };

  try {
    const data = await getReportingAggregates({ 
      from: from || undefined, 
      to: to || undefined, 
      search: search || undefined, 
      names, 
      fixedPeriod 
    });

    const duration = Date.now() - startTime;
    
    logBusinessOperation(requestId, 'reporting_aggregates_generated', {
      ...queryParams,
      resultCount: data.length,
      totalExecutions: data.reduce((sum, item) => sum + item.executions, 0),
      totalSavings: data.reduce((sum, item) => sum + item.minutes.total, 0),
    }, duration);

    return new Response(JSON.stringify({ ok: true, data }), { 
      headers: { "content-type": "application/json" } 
    });
  } catch (e: any) {
    const duration = Date.now() - startTime;
    
    logBusinessOperation(requestId, 'reporting_aggregates_failed', {
      ...queryParams,
      error: e?.message || String(e),
    }, duration);

    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }), 
      { 
        status: 500, 
        headers: { "content-type": "application/json" } 
      }
    );
  }
}

export const GET = withLogging(reportingAggregatesHandler, 'reporting-aggregates');
