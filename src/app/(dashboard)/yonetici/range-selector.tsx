"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RANGES = [
  { k: "5y", l: "5 Yıl" },
  { k: "1y", l: "1 Yıl" },
  { k: "6m", l: "6 Ay" },
  { k: "3m", l: "3 Ay" },
  { k: "1m", l: "1 Ay" },
  { k: "buay", l: "Bu Ay" },
] as const;

export function RangeSelector() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("range") ?? "1y";
  const [customOpen, setCustomOpen] = useState(current === "ozel");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function select(k: string) {
    setCustomOpen(false);
    router.push(`/yonetici?range=${k}`);
  }

  function applyCustom() {
    if (!from || !to) return;
    router.push(`/yonetici?range=ozel&from=${from}&to=${to}`);
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-0.5 rounded-lg border bg-card p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.k}
            type="button"
            onClick={() => select(r.k)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              current === r.k
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {r.l}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
            current === "ozel"
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Özel
        </button>
      </div>

      {customOpen && (
        <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-lg border bg-popover p-3 shadow-soft-lg">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Başlangıç</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bitiş</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={applyCustom}
            disabled={!from || !to}
          >
            Uygula
          </Button>
        </div>
      )}
    </div>
  );
}
