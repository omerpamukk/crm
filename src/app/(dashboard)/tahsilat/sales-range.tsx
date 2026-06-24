"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const RANGES = [
  { k: "bugun", l: "Bugün" },
  { k: "buay", l: "Bu Ay" },
  { k: "3ay", l: "3 Ay" },
  { k: "1yil", l: "1 Yıl" },
] as const;

export function SalesRange() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("range") ?? "buay";

  return (
    <div className="flex items-center rounded-lg border bg-card p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.k}
          type="button"
          onClick={() => router.push(`/tahsilat?range=${r.k}`)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            current === r.k
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {r.l}
        </button>
      ))}
    </div>
  );
}
