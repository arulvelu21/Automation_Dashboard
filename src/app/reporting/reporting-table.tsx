import { getReportingAggregates } from "@/lib/data";
import { ReportingFilters } from "./filters";

export async function ReportingTable({ search, from, to }: { search?: string; from?: string; to?: string }) {
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 30*24*60*60*1000).toISOString().slice(0,10);
  const defaultTo = new Date().toISOString().slice(0,10);
  const fromISO = (from ? new Date(from) : new Date(defaultFrom)).toISOString();
  const toISO = (to ? new Date(to) : new Date(defaultTo)).toISOString();
  const rows = await getReportingAggregates({ from: fromISO, to: toISO, search });

  const totals = rows.reduce((acc, r) => {
    acc.executions += r.executions;
    acc.success += r.success;
    acc.failure += r.failure;
    acc.invalid += r.invalid;
    acc.partial += r.partial;
    acc.fixed += r.minutes.fixedTotal;
    acc.varSucc += r.minutes.variableSuccessTotal;
    acc.varPart += r.minutes.variablePartialTotal;
    acc.total += r.minutes.total;
    return acc;
  }, { executions: 0, success: 0, failure: 0, invalid: 0, partial: 0, fixed: 0, varSucc: 0, varPart: 0, total: 0 });

  return (
    <div className="card">
      <div className="card-content space-y-4">
        <ReportingFilters />
        {/* Filters moved to client component to avoid event handlers in Server Component */}
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8.5%' }} />
              <col style={{ width: '8.5%' }} />
              <col style={{ width: '8.5%' }} />
              <col style={{ width: '8.5%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50">
                <Th>Use Case</Th>
                <Th className="text-right whitespace-nowrap">Executions</Th>
                <Th className="text-right whitespace-nowrap">Success</Th>
                <Th className="text-right whitespace-nowrap">Failure</Th>
                <Th className="text-right whitespace-nowrap">Invalid</Th>
                <Th className="text-right whitespace-nowrap">Partial</Th>
                <Th className="text-right">
                  <div className="whitespace-nowrap">Fixed</div>
                  <div className="text-xs text-gray-500">(hours)</div>
                </Th>
                <Th className="text-right">
                  <div className="whitespace-nowrap">Variable Success</div>
                  <div className="text-xs text-gray-500">(hours)</div>
                </Th>
                <Th className="text-right">
                  <div className="whitespace-nowrap">Variable Partial</div>
                  <div className="text-xs text-gray-500">(hours)</div>
                </Th>
                <Th className="text-right">
                  <div className="whitespace-nowrap">Total</div>
                  <div className="text-xs text-gray-500">(hours)</div>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => (
                <tr key={r.useCaseName} className="hover:bg-gray-50">
                  <Td className="font-semibold">{r.useCaseName}</Td>
                  <Td align="right">{r.executions.toLocaleString()}</Td>
                  <Td align="right">{r.success.toLocaleString()}</Td>
                  <Td align="right">{r.failure.toLocaleString()}</Td>
                  <Td align="right">{r.invalid.toLocaleString()}</Td>
                  <Td align="right">{r.partial.toLocaleString()}</Td>
          <Td align="right">{fmtHours(r.minutes.fixedTotal)}</Td>
          <Td align="right">{fmtHours(r.minutes.variableSuccessTotal)}</Td>
          <Td align="right">{fmtHours(r.minutes.variablePartialTotal)}</Td>
          <Td align="right" className="font-medium">{fmtHours(r.minutes.total)}</Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={10} className="text-center text-gray-500 py-6">No data for the selected range.</Td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <Td className="font-medium">Totals</Td>
                <Td align="right" className="font-medium">{totals.executions.toLocaleString()}</Td>
                <Td align="right">{totals.success.toLocaleString()}</Td>
                <Td align="right">{totals.failure.toLocaleString()}</Td>
                <Td align="right">{totals.invalid.toLocaleString()}</Td>
                <Td align="right">{totals.partial.toLocaleString()}</Td>
                <Td align="right">{fmtHours(totals.fixed)}</Td>
                <Td align="right">{fmtHours(totals.varSucc)}</Td>
                <Td align="right">{fmtHours(totals.varPart)}</Td>
                <Td align="right" className="font-semibold">{fmtHours(totals.total)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-1 text-xs text-gray-500">Savings are computed in hours (minutes/60) using values from usecase_savings_ref as: fixed*executions + variable*success + partial*partial.</div>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  // If a header is passed with text-right, also apply tabular-nums for better digit alignment
  const isRight = className?.includes('text-right');
  return <th className={`px-4 py-2 text-left font-medium text-gray-700 ${isRight ? 'tabular-nums' : ''} ${className ?? ''}`}>{children}</th>;
}
function Td({ children, className, align, colSpan }: { children: React.ReactNode; className?: string; align?: 'left' | 'right' | 'center'; colSpan?: number }) {
  const isRight = align === 'right';
  const alignClass = isRight ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return <td className={`px-4 py-2 ${alignClass} ${isRight ? 'tabular-nums' : ''} ${className ?? ''}`} colSpan={colSpan}>{children}</td>;
}
function fmtHours(minutes: number) {
  if (!isFinite(minutes)) return '-';
  const hours = Number(minutes) / 60;
  // Standardize to two decimals for consistent visual alignment across rows
  return `${hours.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
}
