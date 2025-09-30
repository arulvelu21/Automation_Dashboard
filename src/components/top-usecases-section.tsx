import { getReportingAggregates } from "@/lib/data";
import { RefreshButton } from "./refresh-button";
import { unstable_noStore as noStore } from "next/cache";
import { MonthSelect } from "./month-select";
import { SortSelect } from "./sort-select";

function fmtHours(minutes: number) {
  const hours = Number(minutes) / 60;
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;
}

export async function TopUseCasesSection({ month, sort = "hours" }: { month?: string; sort?: "hours" | "volumes" | string }) {
  // Ensure this section is not statically cached; manual Refresh will re-run the query
  noStore();
  const renderedAt = new Date();
  console.log(`[TopUseCasesSection] Refreshed at ${renderedAt.toISOString()}`);
  // Determine window from month (yyyy-mm) or use last 30 days
  let from: Date;
  let to: Date;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    from = new Date(Date.UTC(y, (m || 1) - 1, 1));
    to = new Date(Date.UTC(y, (m || 1), 0, 23, 59, 59));
  } else {
    const today = new Date();
    from = new Date(today.getTime() - 30*24*60*60*1000);
    to = today;
  }
  const rows = await getReportingAggregates({ from, to });

  // Rank by total hours saved, fall back to executions if all zeros
  const ranked = [...rows]
    .sort((a, b) => {
      if (sort === 'volumes') return (b.executions - a.executions) || (b.minutes.total - a.minutes.total);
      return (b.minutes.total - a.minutes.total) || (b.executions - a.executions);
    })
    .slice(0, 8);

  return (
    <div className="card" data-section="top-usecases">
      <div className="card-header flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <div>Top Use Cases {month ? `(${month})` : `(Last 30 days)`}</div>
          <div className="mt-0.5 text-xs text-gray-500" data-last-updated>
            Last updated: {renderedAt.toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelect value={month} />
          <SortSelect value={typeof sort === 'string' ? sort : 'hours'} />
          <RefreshButton label="Refresh" />
        </div>
      </div>
      <div className="card-content">
        {ranked.length === 0 ? (
          <div className="text-sm text-gray-500">No data available for this period.</div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ranked.map((r) => {
              const exec = r.executions || 0;
              const successRate = exec > 0 ? (r.success / exec) : 0;
              const successPct = exec > 0 ? (successRate * 100) : 0;
              return (
                <div key={r.useCaseName} className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex min-h-[44px] items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">{r.useCaseName}</h3>
                    <span className="rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600">{exec.toLocaleString()} exec</span>
                  </div>
                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100" aria-label="Success vs Other bar">
                    <div className="h-full bg-brand-600" style={{ width: `${successPct}%` }} />
                  </div>
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                    <span>Success rate</span>
                    <span className="font-semibold text-gray-900">{(successPct).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Total hours saved</span>
                    <span className="font-semibold text-gray-900">{fmtHours(r.minutes.total)}</span>
                  </div>
                  <div className="mt-auto pt-3 flex flex-col gap-2 text-xs">
                    <Metric label="Success" value={r.success} color="text-brand-600" />
                    <Metric label="Failure" value={r.failure} color="text-tescoRed-600" />
                    <Metric label="Partial" value={r.partial} color="text-amber-600" />
                    <Metric label="Invalid" value={r.invalid} color="text-gray-600" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex w-full items-center justify-between rounded-md bg-gray-50 px-2 py-1">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${color} tabular-nums`}>{Math.round(value).toLocaleString('en-GB')}</span>
    </div>
  );
}
