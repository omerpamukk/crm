"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Disclosure } from "@/components/ui/disclosure";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToolbarAction } from "@/components/layout/toolbar-action";

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Kapalı başlayan "Daha fazla filtre" bölümünde durur. */
  advanced?: boolean;
};

/**
 * "Filtrele" açılır paneli: her filtre için seçenek düğmeleri.
 * Seçileni yeniden seçmek filtreyi kaldırır; etkin filtreler FilterBar'da
 * jeton olarak görünür.
 */
export function CustomerFilters({
  defs,
  values,
  onChange,
  activeCount,
}: {
  defs: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  activeCount: number;
}) {
  const [more, setMore] = useState(false);
  const basic = defs.filter((d) => !d.advanced && d.options.length > 0);
  const advanced = defs.filter((d) => d.advanced && d.options.length > 0);
  const moreOpen = more || advanced.some((d) => (values[d.key] ?? "all") !== "all");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarAction icon={SlidersHorizontal} label="Filtrele" mobile="icon" badge={activeCount} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] space-y-4 p-4">
        {basic.map((d) => (
          <Group key={d.key} def={d} value={values[d.key] ?? "all"} onChange={onChange} />
        ))}
        {advanced.length > 0 && (
          <Disclosure title="Daha fazla filtre" open={moreOpen} onOpenChange={setMore} contentClassName="space-y-4">
            {advanced.map((d) => (
              <Group key={d.key} def={d} value={values[d.key] ?? "all"} onChange={onChange} />
            ))}
          </Disclosure>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Group({
  def,
  value,
  onChange,
}: {
  def: FilterDef;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const labelId = `flt-${def.key}`;
  return (
    <div>
      <p id={labelId} className="mb-2 text-[0.8125rem] font-semibold text-label-2">
        {def.label}
      </p>
      <div role="group" aria-labelledby={labelId} className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
        {def.options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(def.key, on ? "all" : o.value)}
              className={cn(
                "pressable inline-flex h-8 max-w-full items-center rounded-full px-3 text-[0.8125rem] font-semibold whitespace-nowrap",
                on ? "bg-primary-soft text-primary-text" : "bg-fill text-label-2 hover:bg-fill-2"
              )}
            >
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
