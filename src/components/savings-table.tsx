import { getSavingsTypes, getSavingsUseCases } from "@/lib/data";

export async function SavingsTable({ search, type }: { search?: string; type?: string }) {
  const [rows, types] = await Promise.all([
    getSavingsUseCases({ search, type, limit: 200 }),
    getSavingsTypes(),
  ]);

  return (
    <div className="card">
      <div className="card-content space-y-4">
        <form method="GET" className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500">Search</label>
            <input
              type="search"
              name="q"
              placeholder="Search by use case name…"
              defaultValue={search}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Savings Type</label>
            <select
              name="type"
              defaultValue={type}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </form>

        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <Th>Use Case</Th>
                <Th>Type</Th>
                <Th className="text-right">Fixed (min/run)</Th>
                <Th className="text-right">Savings (min/run)</Th>
                <Th className="text-right">Partial (min/run)</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <Td className="font-semibold">{r.useCaseName}</Td>
                  <Td>{r.savingsType ?? '-'}</Td>
                  <Td align="right">{formatMinutes(r.fixedSavingsPerRun)}</Td>
                  <Td align="right">{formatMinutes(r.savingsPerRun)}</Td>
                  <Td align="right">{formatMinutes(r.partialSavingsPerRun)}</Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={5} className="text-center text-gray-500 py-6">No matching use cases found.</Td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-gray-500">Note: All values represent minutes per run.</div>
        </div>
      </div>
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

function formatMinutes(v: number): string {
  if (!isFinite(v)) return '-';
  const formatted = Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${formatted} min`;
}
