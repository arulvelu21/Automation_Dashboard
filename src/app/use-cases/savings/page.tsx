import { Suspense } from "react";
import { SavingsTable } from "../../../components/savings-table";

export const metadata = {
  title: "Savings Use Cases • Automation Dashboard",
};

export default function SavingsUseCasesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const q = toSingle(searchParams.q);
  const type = toSingle(searchParams.type);
  return (
    <main className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Use Cases (Savings Reference)</h2>
          <p className="text-sm text-gray-500">Browse use cases and their configured minutes saved per run (fixed, variable, and partial).</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-gray-500">Loading use cases…</div>}>
        <SavingsTable search={q} type={type} />
      </Suspense>
    </main>
  );
}

function toSingle(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}
