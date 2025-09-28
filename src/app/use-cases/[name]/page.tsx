import { Suspense } from "react";
import { getSavingsUseCases, getReportingAggregates, getUseCaseOverviewByName } from "@/lib/data";

export default async function UseCaseDetailsPage({ params, searchParams }: { params: { name: string }; searchParams: { [k: string]: string | string[] | undefined } }) {
  const name = decodeURIComponent(params.name);
  const from = one(searchParams.from);
  const to = one(searchParams.to);

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500">Use case details, savings configuration, and recent reporting metrics.</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="space-y-4 order-last lg:order-first">
          <section className="card">
            <div className="card-header">Overview</div>
            <div className="card-content">
              <Suspense fallback={<div className="text-gray-500">Loading overview…</div>}>
                <Overview name={name} />
              </Suspense>
            </div>
          </section>
        </aside>
        <div className="lg:col-span-2 space-y-4">
          <section className="card">
            <div className="card-header">Recent Reporting</div>
            <div className="card-content">
              <Suspense fallback={<div className="text-gray-500">Loading metrics…</div>}>
                {/* Server component to fetch aggregates for this use case only */}
                <UseCaseReporting name={name} from={from} to={to} />
              </Suspense>
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="card">
            <div className="card-header">Savings Configuration</div>
            <div className="card-content">
              <Suspense fallback={<div className="text-gray-500">Loading config…</div>}>
                <SavingsConfig name={name} />
              </Suspense>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function one(v?: string | string[]) { return Array.isArray(v) ? v[0] : v; }

async function UseCaseReporting({ name, from, to }: { name: string; from?: string; to?: string }) {
  const rows = await getReportingAggregates({ from, to, names: [name] });
  const r = rows[0];
  if (!r) return <div className="text-sm text-gray-500">No data found for this range.</div>;
  const metrics = [
    { label: 'Executions', value: r.executions.toLocaleString() },
    { label: 'Success', value: r.success.toLocaleString(), className: 'text-emerald-700' },
    { label: 'Failure', value: r.failure.toLocaleString(), className: 'text-tescoRed-700' },
    { label: 'Partial', value: r.partial.toLocaleString(), className: 'text-amber-700' },
    { label: 'Invalid', value: r.invalid.toLocaleString(), className: 'text-gray-600' },
  ];
  const minutes = r.minutes.total;
  const hours = minutes / 60;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-md border border-gray-200 px-3 py-2">
            <div className="text-xs text-gray-500">{m.label}</div>
            <div className={`text-lg font-semibold ${m.className ?? ''}`}>{m.value}</div>
          </div>
        ))}
        <div className="rounded-md border border-gray-200 px-3 py-2">
          <div className="text-xs text-gray-500">Total Hours Saved</div>
          <div className="text-lg font-semibold text-brand-700">{hours.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500">Range: {from ?? 'default'} → {to ?? 'now'} • Savings computed from usecase_savings_ref</div>
    </div>
  );
}

async function Overview({ name }: { name: string }) {
  const overview = await getUseCaseOverviewByName(name);
  if (!overview) {
    return <div className="text-sm text-gray-500">No overview data available.</div>;
  }
  const isUrl = (v?: string | null) => !!v && /^(https?:)?\/\//i.test(v);
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-xs text-gray-500">Stakeholder</div>
        <div className="font-medium text-gray-900">{overview.stakeholder ?? '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Process (short)</div>
        <div className="text-gray-800">{overview.description ?? '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">HLD (Confluence)</div>
        {overview.hldUrl ? (
          isUrl(overview.hldUrl) ? (
            <a href={overview.hldUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">
              {overview.hldUrl}
            </a>
          ) : (
            <span className="text-gray-800 break-all">{overview.hldUrl}</span>
          )
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </div>
    </div>
  );
}

async function SavingsConfig({ name }: { name: string }) {
  // fetch the exact row by name (case-insensitive)
  const all = await getSavingsUseCases({ search: name, limit: 500 });
  const row = all.find(r => r.useCaseName.trim().toLowerCase() === name.trim().toLowerCase());
  if (!row) {
    return <div className="text-sm text-gray-500">No savings configuration found.</div>;
  }
  return (
    <div className="text-sm">
      <dl className="divide-y divide-gray-100">
        <Item label="Use Case" value={<span className="font-semibold">{row.useCaseName}</span>} />
        <Item label="Savings Type" value={row.savingsType ?? '—'} />
        <Item label="Fixed Minutes / Run" value={row.fixedSavingsPerRun} />
        <Item label="Variable Minutes / Success" value={row.savingsPerRun} />
        <Item label="Variable Minutes / Partial" value={row.partialSavingsPerRun} />
      </dl>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
