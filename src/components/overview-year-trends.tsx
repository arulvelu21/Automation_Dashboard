import { getReportingAggregates } from "@/lib/data";
import { YearSelect } from "./year-select";
import { YearTrendChart } from "./year-trend-chart";

export async function OverviewYearTrends({ year }: { year?: number }) {
  const y = year ?? new Date().getUTCFullYear();
  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hours: number[] = [];
  const volumes: number[] = [];

  for (let m = 0; m < 12; m++) {
    const start = new Date(Date.UTC(y, m, 1));
    const endExclusive = new Date(Date.UTC(y, m + 1, 1));
    const fromISO = start.toISOString();
    const toISO = new Date(endExclusive.getTime() - 24*60*60*1000).toISOString(); // inclusive end for helper
    const rows = await getReportingAggregates({ from: fromISO, to: toISO });
    const executions = rows.reduce((acc, r) => acc + r.executions, 0);
    const minutes = rows.reduce((acc, r) => acc + r.minutes.total, 0);
    volumes.push(executions);
    hours.push(minutes / 60);
  }

  // Build a short list of recent years: current year down to current-4
  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>Trends: Hours Saved & Total Volumes</div>
        {/* Client control */}
        <YearSelect years={years} value={y} />
      </div>
      <div className="card-content">
        <div className="h-72">
          <YearTrendChart labels={labels} hours={hours.map(h => Number(h.toFixed(2)))} volumes={volumes} />
        </div>
        <div className="mt-2 text-xs text-gray-500">Monthly totals for the selected year.</div>
      </div>
    </div>
  );
}
