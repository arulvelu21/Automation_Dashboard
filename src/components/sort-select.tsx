"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value = "hours" }: { value?: "hours" | "volumes" | string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(sp.toString());
    if (next) params.set('sort', next); else params.delete('sort');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Sort by</label>
      <select
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        <option value="hours">Hours Saved</option>
        <option value="volumes">Total Volumes</option>
      </select>
    </div>
  );
}
