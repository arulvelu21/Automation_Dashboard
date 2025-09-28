"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { UseCaseRef, UseCaseStatus } from "@/lib/data";

export function UseCasesGridWithOverlay({ items, defaultFrom, defaultTo, savingsByName }: { items: UseCaseRef[]; defaultFrom?: string; defaultTo?: string; savingsByName?: Record<string, { savingsType: string | null; fixed: number; variable: number; partial: number }> }) {
  const [selected, setSelected] = useState<UseCaseRef | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onOpen = useCallback(async (uc: UseCaseRef) => {
    setSelected(uc);
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams({ name: uc.name });
      if (defaultFrom) params.set('from', defaultFrom);
      if (defaultTo) params.set('to', defaultTo);
      const res = await fetch(`/api/use-cases/overview?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [defaultFrom, defaultTo]);

  const onClose = useCallback(() => {
    setSelected(null);
    setData(null);
    setError(null);
  }, []);

  return (
    <>
      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((uc) => (
          <Card key={uc.id} uc={uc} onOpen={onOpen} savingsByName={savingsByName} />
        ))}
      </div>
      {selected && (
        <Overlay onClose={onClose}>
          <DetailsContent uc={selected} data={data} loading={loading} error={error} onClose={onClose} />
        </Overlay>
      )}
    </>
  );
}

function Card({ uc, onOpen, savingsByName }: { uc: UseCaseRef; onOpen: (uc: UseCaseRef) => void; savingsByName?: Record<string, { savingsType: string | null; fixed: number; variable: number; partial: number }> }) {
  const color = colorByStatus(uc.status);
  const s = savingsByName?.[uc.name.trim().toLowerCase()];
  const savingsLabel = s ? `${s.savingsType ?? 'Savings'} · ${Math.round((s.fixed + s.variable + s.partial))} min/run` : null;
  return (
    <div className="card overflow-hidden h-full flex flex-col">
      <div className={`${color.bg} ${color.text} flex items-center justify-between px-4 py-2 text-xs font-medium`}> 
        <span className="uppercase tracking-wide">{uc.status}</span>
        <span className="opacity-80">{new Date(uc.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="card-content flex flex-1 flex-col gap-2">
        <div className="min-h-12">
          <h3 className="text-base font-semibold leading-6 text-gray-900">{uc.name}</h3>
        </div>
        {savingsLabel ? (
          <div>
            <span className="inline-block rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-700">{savingsLabel}</span>
          </div>
        ) : null}
        {uc.description && (
          <p className="line-clamp-3 text-sm text-gray-600">{uc.description}</p>
        )}
        <div className="mt-auto pt-2 flex justify-center">
          <button
            onClick={() => onOpen(uc)}
            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            View details
          </button>
        </div>
      </div>
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6">
        <div className="mt-10 w-full max-w-4xl rounded-lg bg-white shadow-xl ring-1 ring-black/10">
          {children}
        </div>
      </div>
    </div>
  );
}

function DetailsContent({ uc, data, loading, error, onClose }: { uc: UseCaseRef; data: any | null; loading: boolean; error: string | null; onClose: () => void }) {
  const o = data?.overview;
  const r = data?.reporting;
  const s = data?.savings;
  const isUrl = (v?: string | null) => !!v && /^(https?:)?\/\//i.test(v);
  return (
    <div>
      <div className="flex items-start justify-between gap-3 bg-brand-600 px-4 py-3 text-white">
        <div>
          <h2 className="text-lg font-semibold">{uc.name}</h2>
          <p className="text-xs text-white/80">Use case overview, reporting metrics, and savings configuration</p>
        </div>
        <button onClick={onClose} className="rounded-md px-3 py-1 text-sm text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white">Close</button>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-3 border-t-4 border-brand-600">
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-brand-700">Overview</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : error ? (
            <div className="text-sm text-tescoRed-700">{error}</div>
          ) : (
            <div className="text-sm space-y-2">
              <div>
                <div className="text-xs text-gray-500">Stakeholder</div>
                <div className="font-medium text-gray-900">{o?.stakeholder ?? uc.owner ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Process (short)</div>
                <div className="text-gray-800">{o?.description ?? uc.description ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">HLD (Confluence)</div>
                {o?.hldUrl ? (
                  isUrl(o.hldUrl) ? (
                    <a href={o.hldUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">{o.hldUrl}</a>
                  ) : (
                    <span className="text-gray-800 break-all">{o.hldUrl}</span>
                  )
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
          )}
        </section>
        <section className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-medium text-brand-700">Recent Reporting</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : (
            r ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Executions', value: r.executions },
                  { label: 'Success', value: r.success, cls: 'text-emerald-700' },
                  { label: 'Failure', value: r.failure, cls: 'text-tescoRed-700' },
                  { label: 'Partial', value: r.partial, cls: 'text-amber-700' },
                  { label: 'Invalid', value: r.invalid, cls: 'text-gray-600' },
                  { label: 'Total Hours Saved', value: r.hoursSaved, cls: 'text-brand-700', fmt: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
                ].map((m) => (
                  <div key={m.label} className="rounded-md border border-gray-200 px-3 py-2">
                    <div className="text-xs text-gray-500">{m.label}</div>
                    <div className={`text-lg font-semibold ${m.cls ?? ''}`}>{(m.fmt ? m.fmt(m.value) : m.value).toLocaleString?.() ?? m.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No data for selected range.</div>
            )
          )}
        </section>
        <section className="lg:col-span-3 space-y-3">
          <h3 className="text-sm font-medium text-brand-700">Savings Configuration</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : s ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <KV label="Savings Type" value={s.savingsType ?? '—'} />
              <KV label="Fixed Minutes / Run" value={s.fixedSavingsPerRun} />
              <KV label="Variable Minutes / Success" value={s.savingsPerRun} />
              <KV label="Variable Minutes / Partial" value={s.partialSavingsPerRun} />
            </div>
          ) : (
            <div className="text-sm text-gray-500">No savings configuration found.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-gray-200 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-900">{typeof value === 'number' ? value.toLocaleString() : String(value)}</div>
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
