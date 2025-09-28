import { Suspense } from "react";
import { UseCasesSection } from "@/components/use-cases-section";

export const metadata = {
  title: "Live Use Cases • Automation Dashboard",
};

export default function LiveUseCasesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const q = toSingle(searchParams.q);
  // We default to "ACTIVE" for live in production; the data layer will also additionally try to filter by prod/env columns when using the custom table.
  const status = (toSingle(searchParams.status) as any) ?? 'ACTIVE';
  return (
    <main className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Live Use Cases</h2>
          <p className="text-sm text-gray-500">Listing use cases currently live in production.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-gray-500">Loading live use cases…</div>}>
        <UseCasesSection search={q} status={status} />
      </Suspense>
    </main>
  );
}

function toSingle(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}
