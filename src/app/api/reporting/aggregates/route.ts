import { NextRequest } from "next/server";
import { getReportingAggregates } from "@/lib/data";

export async function GET(req: NextRequest) {
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
  try {
  const data = await getReportingAggregates({ from: from || undefined, to: to || undefined, search: search || undefined, names, fixedPeriod });
    return new Response(JSON.stringify({ ok: true, data }), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
