import { Suspense } from "react";
import { UseCasesSection } from "@/components/use-cases-section";

export const metadata = {
  title: "Use Cases • Automation Dashboard",
};

export default function UseCasesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const q = toSingle(searchParams.q);
  const status = toSingle(searchParams.status) as any;
  return (
    <main className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Use Case References</h2>
          <p className="text-sm text-gray-500">Browse, search, and filter your automation use cases.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-gray-500">Loading use cases…</div>}>
        <UseCasesSection search={q} status={status} />
      </Suspense>
    </main>
  );
}

function toSingle(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}
