import { Suspense } from "react";
import { ReportingTable } from "./reporting-table";

export const metadata = {
  title: "Reporting • Automation Dashboard",
};

export default function ReportingPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const q = one(searchParams.q);
  const from = one(searchParams.from);
  const to = one(searchParams.to);
  return (
    <main className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Use Case Reporting</h2>
          <p className="text-sm text-gray-500">View executions and minutes saved over a time range, joined with savings per run.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-gray-500">Loading reporting…</div>}>
        <ReportingTable search={q} from={from} to={to} />
      </Suspense>
    </main>
  );
}

function one(v?: string | string[]) { return Array.isArray(v) ? v[0] : v; }
