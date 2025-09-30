"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      disabled={pending}
      title={label}
      aria-busy={pending}
    >
      <RotateCcw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
      <span>{pending ? 'Refreshing…' : label}</span>
    </button>
  );
}
