import { getReportingDailyAggregates } from "@/lib/data";

export async function RecentActivity({ from, to }: { from?: string; to?: string }) {
  // Default to last 7 days; we'll show the most recent day's activity
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 7*24*60*60*1000).toISOString();
  const defaultTo = new Date().toISOString();
  const fromISO = from ? new Date(from).toISOString() : defaultFrom;
  const toISO = to ? new Date(to).toISOString() : defaultTo;
  const rows = await getReportingDailyAggregates({ from: fromISO, to: toISO, limitDays: 7 });

  if (!rows.length) {
    return <div className="text-sm text-gray-500">No recent activity for the selected period.</div>;
  }
  const latestDay = rows.map(r => r.day).sort((a,b) => a < b ? 1 : -1)[0];
  const latest = rows.filter(r => r.day === latestDay).sort((a,b) => b.total - a.total).slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 text-xs text-gray-500">Latest day: <span className="font-medium text-gray-900">{latestDay}</span></div>
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

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-left font-medium text-gray-700 ${className ?? ''}`}>{children}</th>;
}
function Td({ children, className, align, colSpan }: { children: React.ReactNode; className?: string; align?: 'left' | 'right' | 'center'; colSpan?: number }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return <td className={`px-4 py-2 ${alignClass} ${className ?? ''}`} colSpan={colSpan}>{children}</td>;
}
