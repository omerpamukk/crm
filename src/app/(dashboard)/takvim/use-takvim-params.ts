"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { isDayKey, isGorunum, type Gorunum } from "./zaman";

/**
 * Takvimin URL durumu: ?gorunum=gun|hafta|ay · tarih=YYYY-MM-DD · personel=<id>.
 *
 * `useUrlState` ile aynı sözleşme (varsayılan değer adrese yazılmaz) ama
 * yazma sunucuya gitmez: history.replaceState (Next.js useSearchParams ile
 * eşitler). Böylece tarih değiştirmek sayfayı yeniden yüklemez; veriyi
 * use-range-store çeker. Randevular sayfası da aynı yolu kullanır.
 */
export function useTakvimParams(todayKey: string) {
  const params = useSearchParams();
  const pathname = usePathname();

  const rawView = params.get("gorunum");
  const rawDate = params.get("tarih");
  const view: Gorunum = isGorunum(rawView) ? rawView : "gun";
  const dateKey = isDayKey(rawDate) ? rawDate : todayKey;
  const personel = params.get("personel") ?? "";

  const set = useCallback(
    (next: { view?: Gorunum; dateKey?: string; personel?: string }) => {
      const sp = new URLSearchParams(window.location.search);
      const write = (key: string, value: string | undefined, fallback: string) => {
        if (value === undefined) return;
        if (!value || value === fallback) sp.delete(key);
        else sp.set(key, value);
      };
      write("gorunum", next.view, "gun");
      write("tarih", next.dateKey, todayKey);
      write("personel", next.personel, "");
      const qs = sp.toString();
      // Durum null olmalı: Next'in kendi durumu (__NA) verilirse useSearchParams eşitlenmez
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, todayKey]
  );

  return { view, dateKey, personel, set };
}
