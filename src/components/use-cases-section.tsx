import Link from "next/link";
import { getUseCases, getSavingsUseCases, type UseCaseRef, type UseCaseStatus } from "@/lib/data";
import { UseCasesGridWithOverlay } from "./use-cases-grid-overlay";

export async function UseCasesSection({ search, status }: { search?: string; status?: UseCaseStatus }) {
  const useCases = await getUseCases({ search, status, limit: 60 });
  // Fetch savings configuration to surface useful info in tiles instead of 'Unassigned'
  let savingsByName: Record<string, { savingsType: string | null; fixed: number; variable: number; partial: number }> = {};
  try {
    const savings = await getSavingsUseCases({ limit: 1000 });
    const norm = (s: string) => s.trim().toLowerCase();
    savingsByName = Object.fromEntries(
      savings.map((r) => [norm(r.useCaseName), { savingsType: r.savingsType ?? null, fixed: r.fixedSavingsPerRun, variable: r.savingsPerRun, partial: r.partialSavingsPerRun }])
    );
  } catch (e) {
    // non-fatal if savings_ref doesn't exist
    console.warn('Savings data not available for tiles:', e);
  }
  return (
    <div className="space-y-4">
      <Filters defaultSearch={search} defaultStatus={status} />
      <UseCasesGridWithOverlay items={useCases} savingsByName={savingsByName} />
    </div>
  );
}

function Filters({ defaultSearch, defaultStatus }: { defaultSearch?: string; defaultStatus?: UseCaseStatus }) {
  return (
    <div className="card">
      <div className="card-content">
        <form method="GET" className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500">Search</label>
            <input
              type="search"
              name="q"
              placeholder="Search by name or description…"
              defaultValue={defaultSearch}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Status</label>
            <select
              name="status"
              defaultValue={defaultStatus}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>
          </div>
        </form>
      </div>
    </div>
  );
}

function colorByStatus(status: UseCaseStatus) {
  switch (status) {
    case "ACTIVE":
      return { bg: "bg-emerald-50", text: "text-emerald-700" };
    case "DRAFT":
      return { bg: "bg-amber-50", text: "text-amber-700" };
    case "DEPRECATED":
    default:
      return { bg: "bg-rose-50", text: "text-rose-700" };
  }
}

// Note: parsing is now handled in the page and passed as props.
