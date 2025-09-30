"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function YearSelect({ years, value }: { years: number[]; value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function updateYear(y: number) {
    const params = new URLSearchParams(sp.toString());
    params.set('year', String(y));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Year</label>
      <select
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
        value={value}
        onChange={(e) => updateYear(Number(e.currentTarget.value))}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
