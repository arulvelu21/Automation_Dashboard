"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Aggregate = {
  useCaseName: string;
  success: number;
  failure: number;
  invalid: number;
  partial: number;
};

type UseCaseRef = { id: string; name: string };

export default function UseCaseMetricsGrid({ allUseCases }: { allUseCases: UseCaseRef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [from, setFrom] = useState<string>(sp.get('from') ?? new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10));
  const [to, setTo] = useState<string>(sp.get('to') ?? new Date().toISOString().slice(0,10));
  const [selected, setSelected] = useState<string[]>(sp.getAll('uc').filter(Boolean));
  const [axis, setAxis] = useState<'x'|'y'>((sp.get('axis') === 'y' ? 'y' : 'x'));
  const [stacked, setStacked] = useState<boolean>(sp.get('stacked') === '1');
  const [percent, setPercent] = useState<boolean>(sp.get('mode') === 'percent');
  const [loading, setLoading] = useState(false);
  const [aggregates, setAggregates] = useState<Aggregate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedNames = useMemo(() => new Set(selected.map((id) => allUseCases.find((u) => u.id === id)?.name || "")), [selected, allUseCases]);

  const updateURL = useCallback((updates: Record<string, string | null | undefined> = {}) => {
    const params = new URLSearchParams(sp.toString());
    // Preserve only our known keys to avoid runaway growth
    const keepKeys = new Set(['from','to','axis','stacked','mode','uc']);
    for (const [k] of params) {
      if (!keepKeys.has(k)) params.delete(k);
    }
    if (updates) {
      for (const [k,v] of Object.entries(updates)) {
        if (k === 'uc') continue; // handled below for arrays
        if (v === null || v === undefined || v === '') params.delete(k);
        else params.set(k, v);
      }
    }
    // Sync selections
    params.delete('uc');
    for (const id of selected) params.append('uc', id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, sp, selected]);

  async function fetchAgg() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      // Server-side filter by selected names for scalability
      const selectedNamesArr = selected
        .map((id) => allUseCases.find((u) => u.id === id)?.name)
        .filter(Boolean) as string[];
      for (const n of selectedNamesArr) params.append('name', n);
      const res = await fetch(`/api/reporting/aggregates?${params.toString()}`);
      const json = await res.json();
      if (json.ok) { setAggregates(json.data as Aggregate[]); setError(null); }
      else { setAggregates([]); setError(json.error || 'Failed to load data'); }
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelected(allUseCases.map((u) => u.id));
  }
  function clearAll() {
    setSelected([]);
  }

  const toShow = useMemo(() => {
    if (!selected.length) return [] as Aggregate[];
    const names = new Set([...selectedNames]);
    return aggregates.filter((a) => names.has(a.useCaseName));
  }, [aggregates, selected, selectedNames]);

  // Keep URL in sync when controls change
  useEffect(() => {
    updateURL({ from, to, axis, stacked: stacked ? '1' : '0', mode: percent ? 'percent' : 'count' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, axis, stacked, percent, selected]);

  // If page is loaded with pre-selected use cases in the URL, auto-fetch once
  useEffect(() => {
    if (selected.length) {
      fetchAgg();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <div className="card-header">Use Case Metrics</div>
      <div className="card-content space-y-4">
        <form
          onSubmit={(e) => { e.preventDefault(); fetchAgg(); }}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Search</button>
          <div className="flex items-center gap-3 md:ml-auto">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={axis === 'y'} onChange={(e) => setAxis(e.target.checked ? 'y' : 'x')} /> Horizontal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={stacked} onChange={(e) => setStacked(e.target.checked)} /> Stacked
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={percent} onChange={(e) => setPercent(e.target.checked)} /> %
            </label>
          </div>
        </form>

        <div className="max-h-56 overflow-auto rounded border border-gray-200 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={selectAll} className="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50">Select all</button>
            <button type="button" onClick={clearAll} className="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50">Clear</button>
            <span className="text-xs text-gray-500">{selected.length} selected</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {allUseCases.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
                <span className="truncate" title={u.name}>{u.name}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {loading && <div className="text-gray-500">Loading charts…</div>}

        {!selected.length && (
          <div className="text-sm text-gray-500">Select one or more use cases above, choose a date range, and click Search to render charts.</div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {toShow.map((a) => (
            <div key={a.useCaseName} className="card">
              <div className="card-header">{a.useCaseName}</div>
              <div className="card-content">
                <div className="h-56">
                  <Bar data={(function(){
                    const total = a.success + a.failure + a.partial + a.invalid;
                    const values = percent && total > 0
                      ? [a.success, a.failure, a.partial, a.invalid].map((v) => (v/total*100))
                      : [a.success, a.failure, a.partial, a.invalid];
                    const labels = ["Success", "Failure", "Partial", "Invalid"];
                    const colors = ["#2f7fcc", "#EE1C2E", "#f59e0b", "#6b7280"]; // brand blue, tesco red, amber, gray
                    // We use datasets per status to allow stacking or grouping and orientation changes
                    return {
                      labels: [a.useCaseName],
                      datasets: labels.map((label, idx) => ({
                        label,
                        data: [values[idx]],
                        backgroundColor: colors[idx] + 'AA',
                        borderColor: colors[idx],
                        borderWidth: 1,
                        stack: stacked ? 'total' : undefined,
                      }))
                    };
                  })()} options={{
                    plugins: { 
                      legend: { position: 'bottom' as const },
                      tooltip: { callbacks: percent ? { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` } : undefined },
                    },
                    indexAxis: axis,
                    scales: (function(){
                      const valueAxis = axis === 'y' ? 'x' : 'y';
                      return {
                        x: { stacked },
                        y: { stacked, beginAtZero: true },
                        [valueAxis]: { stacked, beginAtZero: true, ticks: percent ? { callback: (v: any) => `${v}%` } : { precision: 0 } }
                      } as any;
                    })(),
                    maintainAspectRatio: false,
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
