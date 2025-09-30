"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export function DaysMultiSelect({
  days,
  selected,
  label = "Days",
}: {
  days: string[]; // yyyy-mm-dd
  selected: string[];
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [localSel, setLocalSel] = useState<string[]>(selected);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => setLocalSel(selected), [selected.join(",")]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function updateUrl(nextSel: string[]) {
    const params = new URLSearchParams(sp.toString());
    if (nextSel.length) {
      params.set("days", nextSel.join(","));
    } else {
      params.delete("days");
    }
    // Remove single day param if previously used
    params.delete("day");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggle(d: string) {
    const set = new Set(localSel);
    if (set.has(d)) set.delete(d); else set.add(d);
    const next = Array.from(set);
    setLocalSel(next);
  }

  function apply() { updateUrl(localSel); setOpen(false); }
  function clearAll() { setLocalSel([]); }
  function selectAll() { setLocalSel(days.slice()); }

  const summary = useMemo(() => {
    if (!localSel.length) return "None";
    if (localSel.length === 1) return localSel[0];
    return `${localSel.length} selected`;
  }, [localSel.join(",")]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="text-gray-600">{label}:</span>
        <span className="font-medium text-gray-900">{summary}</span>
        <svg className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-64 origin-top-left rounded-md border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span>Select days</span>
            <div className="space-x-2">
              <button type="button" className="underline hover:text-gray-700" onClick={selectAll}>All</button>
              <button type="button" className="underline hover:text-gray-700" onClick={clearAll}>None</button>
            </div>
          </div>
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {days.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  checked={localSel.includes(d)}
                  onChange={() => toggle(d)}
                />
                <span className="font-mono">{d}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={apply} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}
