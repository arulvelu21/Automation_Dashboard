import { Suspense } from "react";
import { RecentActivity } from "@/components/recent-activity";
import { TopUseCasesSection } from "@/components/top-usecases-section";
import { UseCaseMetricsSection } from "@/components/usecase-metrics-section";
import { DateRangeFilters } from "@/components/date-range-filters";
import { RangeOverview } from "@/components/range-overview";
import { OverviewYearTrends } from "@/components/overview-year-trends";

export default function Home({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const sp = searchParams || {};
  const from = toSingle(sp.from);
  const to = toSingle(sp.to);
  const days = toSingle(sp.days);
  const year = parseYear(toSingle(sp.year));
  const month = toSingle(sp.month);
  const sort = toSingle(sp.sort) as any;
  return (
    <main className="space-y-6">
      <div className="card">
        <div className="card-content space-y-4">
          <DateRangeFilters showSearch={false} />
          <Suspense fallback={<div className="text-gray-500">Loading summary…</div>}>
            <RangeOverview from={from} to={to} />
          </Suspense>
          <Suspense fallback={<div className="text-gray-500">Loading trends…</div>}>
            <OverviewYearTrends year={year} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<div className="text-gray-500">Loading top use cases…</div>}>
        <TopUseCasesSection month={month} sort={sort} />
      </Suspense>
      <Suspense fallback={<div className="text-gray-500">Loading use case charts…</div>}>
        <UseCaseMetricsSection />
      </Suspense>
      <div className="card">
        <div className="card-header">Recent Activity</div>
        <div className="card-content">
          <Suspense fallback={<div className="text-gray-500">Loading recent activity…</div>}>
            <RecentActivity from={from} to={to} days={days} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function toSingle(v?: string | string[]) { return Array.isArray(v) ? v[0] : v; }
function parseYear(v?: string) {
  const n = Number(v);
  if (!v || !Number.isFinite(n) || n < 2000 || n > 9999) return undefined;
  return Math.floor(n);
}
