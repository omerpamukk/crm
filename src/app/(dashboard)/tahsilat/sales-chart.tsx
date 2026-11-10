"use client";

import { useMemo } from "react";

import { TrendChart, type TrendPoint } from "@/components/shared/trend-chart";

import { AY_KISA, AY_UZUN, GUN_KISA, GUN_UZUN, addMonths, daysInRange, weekdayOf } from "../takvim/zaman";
import { toDateKey, type RangeKind } from "../randevular/date-range";

type Item = { at: string; amount: number };

/** Bu aralıktan uzun özel aralıklar ay ay çizilir. */
const DAILY_MAX = 62;

const dayShort = (k: string) => `${Number(k.slice(8, 10))} ${AY_KISA[Number(k.slice(5, 7)) - 1]}`;
const dayLong = (k: string) => `${Number(k.slice(8, 10))} ${AY_UZUN[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;

/**
 * Dönem grafiği: listedeki seçime göre satış ya da tahsilat toplamları.
 * Gruplama İstanbul gününe göre; noktaların toplamı üstteki metrikle aynıdır.
 */
export function SalesChart({
  items,
  start,
  end,
  kind,
  today,
  seriesName,
}: {
  /** Dönemdeki kayıtlar (metrikle aynı küme: arama ve filtreden etkilenmez). */
  items: Item[];
  start: Date;
  /** Aralığın bitişi (hariç). */
  end: Date;
  kind: RangeKind;
  today: Date;
  seriesName: "Satış" | "Tahsilat";
}) {
  const chart = useMemo(() => {
    if (kind === "gun") return null;
    const startK = toDateKey(start);
    const lastK = toDateKey(new Date(end.getTime() - 1));
    const todayK = toDateKey(today);
    const spanDays = daysInRange(startK, lastK);
    const monthly = kind === "ozel" && spanDays.length > DAILY_MAX;

    const byDay = new Map<string, number>();
    for (const it of items) {
      const k = toDateKey(new Date(it.at));
      byDay.set(k, (byDay.get(k) ?? 0) + it.amount);
    }

    let data: TrendPoint[] = [];
    if (monthly) {
      const byMonth = new Map<string, number>();
      for (const [k, v] of byDay) byMonth.set(k.slice(0, 7), (byMonth.get(k.slice(0, 7)) ?? 0) + v);
      for (let m = `${startK.slice(0, 7)}-01`; m <= lastK; m = addMonths(m, 1)) {
        const ym = m.slice(0, 7);
        const mi = Number(ym.slice(5, 7)) - 1;
        data.push({
          label: `${AY_KISA[mi]} ${ym.slice(2, 4)}`,
          hint: `${AY_UZUN[mi]} ${ym.slice(0, 4)}`,
          value: byMonth.get(ym) ?? 0,
          partial: todayK.slice(0, 7) === ym && todayK >= startK && todayK <= lastK,
        });
      }
    } else {
      const bar = kind === "hafta";
      // Çizgide henüz yaşanmamış günler çizilmez (sıfıra düşüş gibi görünmesin).
      const days = bar ? spanDays : spanDays.filter((k) => k <= todayK);
      data = days.map((k) => ({
        label: bar ? GUN_KISA[weekdayOf(k) - 1] : kind === "ay" ? String(Number(k.slice(8, 10))) : dayShort(k),
        hint: bar ? `${GUN_UZUN[weekdayOf(k) - 1]}, ${dayLong(k)}` : dayLong(k),
        value: byDay.get(k) ?? 0,
        partial: k === todayK,
      }));
    }
    const total = data.reduce((a, d) => a + d.value, 0);
    return { data, bar: monthly || kind === "hafta", total };
  }, [items, start, end, kind, today]);

  if (!chart || chart.data.length < (chart.bar ? 1 : 2)) return null;
  if (chart.total <= 0) return null;

  return (
    <section aria-label={`${seriesName} grafiği`} className="surface space-y-2 p-4 md:p-5">
      <h2 className="section-title">{seriesName} grafiği</h2>
      <TrendChart
        data={chart.data}
        kind={chart.bar ? "bar" : "line"}
        unit="money"
        label={`Dönem ${seriesName.toLocaleLowerCase("tr-TR")}`}
        seriesName={seriesName}
        height={200}
      />
    </section>
  );
}
