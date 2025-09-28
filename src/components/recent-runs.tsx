import { getRecentRuns } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";

export async function RecentRuns() {
  const runs = await getRecentRuns({ limit: 10 });
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <Th>Run ID</Th>
            <Th>Use Case</Th>
            <Th>Status</Th>
            <Th>Duration</Th>
            <Th>Started</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {runs.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="font-mono text-sm">{r.id}</Td>
              <Td>{r.useCaseName}</Td>
              <Td>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === "PASS"
                    ? "bg-emerald-50 text-emerald-700"
                    : r.status === "FAIL"
                    ? "bg-tescoRed-50 text-tescoRed-700"
                    : "bg-amber-50 text-amber-700"
                }`}>{r.status}</span>
              </Td>
              <Td>{r.durationSeconds}s</Td>
              <Td title={new Date(r.startedAt).toISOString()}>
                {formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { className?: string }) {
  return (
    <td {...props} className={`whitespace-nowrap px-4 py-2 text-sm text-gray-700 ${className}`}>
      {children}
    </td>
  );
}
