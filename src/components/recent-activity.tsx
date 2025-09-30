import { getReportingDailyAggregates } from "@/lib/data";
import { DaysMultiSelect } from "./days-multiselect";
import Link from "next/link";

export async function RecentActivity({ from, to, days: daysQuery }: { from?: string; to?: string; days?: string }) {
  // Default to last 7 days; we'll show the most recent day's activity
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 7*24*60*60*1000).toISOString();
  const defaultTo = new Date().toISOString();
  const fromISO = from ? new Date(from).toISOString() : defaultFrom;
  const toISO = to ? new Date(to).toISOString() : defaultTo;
  const rows = await getReportingDailyAggregates({ from: fromISO, to: toISO, limitDays: 14 });

  if (!rows.length) {
    return <div className="text-sm text-gray-500">No recent activity for the selected period.</div>;
  }
  const allDays = Array.from(new Set(rows.map(r => r.day))).sort((a,b) => a < b ? 1 : -1);
  const selectedDays = parseDays(daysQuery, allDays);

  // Aggregate across selected days by use case
  const aggMap = new Map<string, { useCaseName: string; success: number; failure: number; partial: number; invalid: number; total: number }>();
  for (const r of rows) {
     if (!selectedDays.includes(r.day)) continue;
     const key = r.useCaseName;
     const cur = aggMap.get(key) || { useCaseName: key, success: 0, failure: 0, partial: 0, invalid: 0, total: 0 };
     cur.success += r.success;
     cur.failure += r.failure;
     cur.partial += r.partial;
     cur.invalid += r.invalid;
     cur.total += r.total;
     aggMap.set(key, cur);
  }
  const latest = Array.from(aggMap.values()).sort((a,b) => b.total - a.total).slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-xs font-medium text-gray-500">Days:</div>
        {/* Client multi-select updates ?days= comma-separated yyyy-mm-dd */}
        <DaysMultiSelect days={allDays} selected={selectedDays} label="Days" />
        <div className="text-xs text-gray-500">Top 10 use cases across selected days.</div>
      </div>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <Th>Use Case</Th>
            <Th className="text-right">Success</Th>
            <Th className="text-right">Failure</Th>
            <Th className="text-right">Partial</Th>
            <Th className="text-right">Invalid</Th>
            <Th className="text-right">Total</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {latest.map((r) => (
            <tr key={r.useCaseName} className="hover:bg-gray-50">
              <Td className="font-medium">{r.useCaseName}</Td>
              <Td align="right">{r.success.toLocaleString()}</Td>
              <Td align="right">{r.failure.toLocaleString()}</Td>
              <Td align="right">{r.partial.toLocaleString()}</Td>
              <Td align="right">{r.invalid.toLocaleString()}</Td>
              <Td align="right" className="font-semibold">{r.total.toLocaleString()}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseDays(daysQuery: string | undefined, available: string[]): string[] {
  const sorted = [...available].sort((a,b) => a < b ? 1 : -1);
  if (!daysQuery) return sorted.slice(0, 1); // default: latest day
  const want = daysQuery.split(',').map(s => s.trim()).filter(Boolean);
  const set = new Set(available);
  const picked: string[] = [];
  for (const d of want) if (set.has(d)) picked.push(d);
  if (!picked.length) return sorted.slice(0, 1);
  return picked;
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-left font-medium text-gray-700 ${className ?? ''}`}>{children}</th>;
}
function Td({ children, className, align, colSpan }: { children: React.ReactNode; className?: string; align?: 'left' | 'right' | 'center'; colSpan?: number }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return <td className={`px-4 py-2 ${alignClass} ${className ?? ''}`} colSpan={colSpan}>{children}</td>;
}
