"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DateRangeFilters({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get('q') ?? '';
  const from = sp.get('from') ?? defaultFromStr();
  const to = sp.get('to') ?? defaultToStr();

  function update(param: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(param, value); else params.delete(param);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form method="GET" action={pathname} className="grid gap-3 sm:grid-cols-4">
      {showSearch && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500">Search</label>
          <input
            name="q"
            type="search"
            placeholder="Search by use case name…"
            defaultValue={q}
            onChange={(e) => update('q', e.currentTarget.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-500">From</label>
        <input
          name="from"
          type="date"
          defaultValue={from}
          onChange={(e) => update('from', e.currentTarget.value)}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">To</label>
        <input
          name="to"
          type="date"
          defaultValue={to}
          onChange={(e) => update('to', e.currentTarget.value)}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
    </form>
  );
}

function defaultFromStr() {
  const d = new Date(Date.now() - 30*24*60*60*1000);
  return d.toISOString().slice(0,10);
}
function defaultToStr() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}
