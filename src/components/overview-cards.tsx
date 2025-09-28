import { getSummaryStats } from "@/lib/data";
import { TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";

export async function OverviewCards() {
  const stats = await getSummaryStats();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Runs" value={stats.totalRuns.toLocaleString()} icon={<Clock className="h-5 w-5 text-brand-600" />} />
      <StatCard title="Pass" value={stats.passed.toLocaleString()} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} />
      <StatCard title="Fail" value={stats.failed.toLocaleString()} icon={<XCircle className="h-5 w-5 text-tescoRed-600" />} />
      <StatCard title="Avg Duration" value={`${stats.avgDuration}s`} icon={<TrendingUp className="h-5 w-5 text-brand-600" />} />
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
