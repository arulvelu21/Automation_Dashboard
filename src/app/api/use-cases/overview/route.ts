import { NextResponse } from "next/server";
import { getUseCaseOverviewByName, getReportingAggregates, getSavingsUseCases } from "@/lib/data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get('name') || '').trim();
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

  try {
    const [overview, aggs, savingsList] = await Promise.all([
      getUseCaseOverviewByName(name),
      getReportingAggregates({ names: [name], from, to }),
      getSavingsUseCases({ search: name, limit: 500 }),
    ]);
    const agg = aggs[0] || null;
    const savings = savingsList.find(r => r.useCaseName.trim().toLowerCase() === name.trim().toLowerCase()) || null;
    const hoursSaved = agg ? agg.minutes.total / 60 : 0;
    return NextResponse.json({
      name,
      overview,
      reporting: agg ? {
        executions: agg.executions,
        success: agg.success,
        failure: agg.failure,
        partial: agg.partial,
        invalid: agg.invalid,
        minutes: agg.minutes,
        hoursSaved,
      } : null,
      savings,
      range: { from: from ?? null, to: to ?? null },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch use case details' }, { status: 500 });
  }
}
