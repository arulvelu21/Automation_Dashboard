"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function MonthSelect({ value }: { value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const months = buildLastNMonths(18);

  function onChange(next: string) {
    const params = new URLSearchParams(sp.toString());
    if (next) params.set('month', next); else params.delete('month');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Month</label>
      <select
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
        value={value || ''}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        <option value="">Last 30 days</option>
        {months.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}

function buildLastNMonths(n: number) {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const value = `${y}-${m}`;
    const label = d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
    out.push({ value, label });
  }
  return out;
}
