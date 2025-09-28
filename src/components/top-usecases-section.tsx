import { getReportingAggregates } from "@/lib/data";

function fmtHours(minutes: number) {
  const hours = Number(minutes) / 60;
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;
}

export async function TopUseCasesSection() {
  // Default: last 30 days
  const today = new Date();
  const from = new Date(today.getTime() - 30*24*60*60*1000);
  const to = today;
  const rows = await getReportingAggregates({ from, to });

  // Rank by total hours saved, fall back to executions if all zeros
  const ranked = [...rows]
    .sort((a, b) => (b.minutes.total - a.minutes.total) || (b.executions - a.executions))
    .slice(0, 8);

  return (
    <div className="card">
      <div className="card-header">Top Use Cases (Last 30 days)</div>
      <div className="card-content">
        {ranked.length === 0 ? (
          <div className="text-sm text-gray-500">No data available for this period.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ranked.map((r) => {
              const exec = r.executions || 0;
              const successRate = exec > 0 ? (r.success / exec) : 0;
              const successPct = exec > 0 ? (successRate * 100) : 0;
              return (
                <div key={r.useCaseName} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-3">
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
                  <div className="mt-3 flex flex-col gap-2 text-xs">
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
