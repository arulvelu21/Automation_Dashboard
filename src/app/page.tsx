import { Suspense } from "react";
import { RecentActivity } from "@/components/recent-activity";
import { TopUseCasesSection } from "@/components/top-usecases-section";
import { UseCaseMetricsSection } from "@/components/usecase-metrics-section";
import { DateRangeFilters } from "@/components/date-range-filters";
import { RangeOverview } from "@/components/range-overview";

export default function Home({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const sp = searchParams || {};
  const from = toSingle(sp.from);
  const to = toSingle(sp.to);
  return (
    <main className="space-y-6">
      <div className="card">
        <div className="card-content space-y-4">
          <DateRangeFilters showSearch={false} />
          <Suspense fallback={<div className="text-gray-500">Loading summary…</div>}>
            <RangeOverview from={from} to={to} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<div className="text-gray-500">Loading top use cases…</div>}>
        <TopUseCasesSection />
      </Suspense>
      <Suspense fallback={<div className="text-gray-500">Loading use case charts…</div>}>
        <UseCaseMetricsSection />
      </Suspense>
      <div className="card">
        <div className="card-header">Recent Activity</div>
        <div className="card-content">
          <Suspense fallback={<div className="text-gray-500">Loading recent activity…</div>}>
            <RecentActivity from={from} to={to} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function toSingle(v?: string | string[]) { return Array.isArray(v) ? v[0] : v; }
