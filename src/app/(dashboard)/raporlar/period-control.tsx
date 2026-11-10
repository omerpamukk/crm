"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";

import {
  isRangeKind,
  parseDateKey,
  resolveRange,
  shiftAnchor,
  toDateKey,
  type RangeKind,
} from "../randevular/date-range";

const cap = (s: string) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);

/**
 * Dönem seçici (Randevular ile aynı adres parametreleri: aralik · tarih · bas · bit).
 * Sunucu sayfaları dönemi adresten okur; değişince sayfa yeni dönemle yeniden çizilir.
 * Gün sınırları İstanbul saatindedir (`date-range.ts`).
 */
export function PeriodControl({
  kinds,
  defaultKind,
  todayMs,
}: {
  kinds: readonly RangeKind[];
  defaultKind: RangeKind;
  /** Sunucunun "şimdi" anı: sunucu ve istemci aynı günü görsün. */
  todayMs: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const today = useMemo(() => new Date(todayMs), [todayMs]);

  const raw = params.get("aralik");
  const kind: RangeKind = isRangeKind(raw) && kinds.includes(raw) ? raw : defaultKind;
  const range = useMemo(
    () => resolveRange(kind, params.get("tarih"), params.get("bas"), params.get("bit"), today),
    [kind, params, today]
  );
  const lastDay = new Date(range.end.getTime() - 1);

  function go(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function changeKind(next: RangeKind) {
    go({
      aralik: next === defaultKind ? null : next,
      tarih: null,
      bas: next === "ozel" ? toDateKey(range.start) : null,
      bit: next === "ozel" ? toDateKey(lastDay) : null,
    });
  }

  const here = range.includesToday;
  const labels: Record<RangeKind, string> = {
    gun: kind === "gun" && !here ? "Gün" : "Bugün",
    hafta: kind === "hafta" && !here ? "Hafta" : "Bu hafta",
    ay: kind === "ay" && !here ? "Ay" : "Bu ay",
    ozel: "Özel aralık",
  };
  const items = kinds.map((k) => ({ value: k, label: labels[k] }));

  return (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-3" aria-busy={pending}>
      <SegmentedControl
        aria-label="Dönem"
        items={items}
        value={kind}
        onValueChange={changeKind}
        size="touch"
        fullWidth
        className="md:w-auto"
      />
      {kind === "ozel" ? (
        <div className="flex min-w-0 items-center gap-2">
          <Input
            type="date"
            aria-label="Başlangıç tarihi"
            className="min-w-0 flex-1 md:w-40 md:flex-none"
            value={params.get("bas") ?? toDateKey(range.start)}
            max={params.get("bit") ?? undefined}
            onChange={(e) => parseDateKey(e.target.value) && go({ bas: e.target.value })}
          />
          <span aria-hidden className="text-label-2">
            –
          </span>
          <Input
            type="date"
            aria-label="Bitiş tarihi"
            className="min-w-0 flex-1 md:w-40 md:flex-none"
            value={params.get("bit") ?? toDateKey(lastDay)}
            min={params.get("bas") ?? undefined}
            onChange={(e) => parseDateKey(e.target.value) && go({ bit: e.target.value })}
          />
        </div>
      ) : (
        <div className="flex min-w-0 items-center justify-between gap-1 md:justify-start">
          <Button
            variant="glass"
            size="icon-sm"
            className="max-md:size-11"
            aria-label="Önceki dönem"
            onClick={() => go({ tarih: shiftAnchor(kind, params.get("tarih"), -1, today) })}
          >
            <ChevronLeft />
          </Button>
          <span aria-live="polite" className="min-w-[8.5rem] px-2 text-center text-[0.9375rem] font-semibold whitespace-nowrap">
            {cap(range.label)}
          </span>
          <Button
            variant="glass"
            size="icon-sm"
            className="max-md:size-11"
            aria-label="Sonraki dönem"
            onClick={() => go({ tarih: shiftAnchor(kind, params.get("tarih"), 1, today) })}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
