import { getReportingAggregates, getUseCases } from "@/lib/data";
import { TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export async function RangeOverview({ from, to, search }: { from?: string; to?: string; search?: string }) {
  // Convert date-only params to ISO; data layer already handles inclusive end
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 30*24*60*60*1000).toISOString();
  const defaultTo = new Date().toISOString();
  const fromISO = from ? new Date(from).toISOString() : defaultFrom;
  const toISO = to ? new Date(to).toISOString() : defaultTo;
  const [rows, liveUseCases] = await Promise.all([
    getReportingAggregates({ from: fromISO, to: toISO, search }),
    // Count of overall live use cases (data layer adapts when savings ref is present)
    getUseCases({ status: 'ACTIVE', limit: 1000 }),
  ]);

  const totals = rows.reduce((acc, r) => {
    acc.executions += r.executions;
    acc.success += r.success;
    acc.failure += r.failure;
    acc.hours += r.minutes.total / 60;
    return acc;
  }, { executions: 0, success: 0, failure: 0, hours: 0 });
  const liveCount = Array.isArray(liveUseCases) ? liveUseCases.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Live Use Cases" value={liveCount.toLocaleString()} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} />
        <StatCard title="Total Hours Saved" value={`${fmtHours(totals.hours)}`} icon={<TrendingUp className="h-5 w-5 text-brand-600" />} />
        <StatCard title="Total Volumes" value={totals.executions.toLocaleString()} icon={<Clock className="h-5 w-5 text-brand-600" />} />
        {/* spacer card to keep grid balanced on 4 cols; remove if you prefer 3 cols */}
        <div className="hidden lg:block" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-content flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">{icon}</div>
      </div>
    </div>
  );
}

function fmtHours(h: number) {
  return isFinite(h) ? Number(h).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
}
