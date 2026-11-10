"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Randevular sayfasının URL durumu. Yazma, sunucuya gitmeden adresi günceller
 * (history.replaceState; Next.js useSearchParams ile eşitler): her filtre
 * değişiminde veri yeniden çekilmez, adres yine paylaşılabilir.
 * Değeri null/boş olan anahtar adresten kalkar.
 */
export function useRandevuParams() {
  const params = useSearchParams();
  const pathname = usePathname();

  const set = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname]
  );

  return { params, set };
}
