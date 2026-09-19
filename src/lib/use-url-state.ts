"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtre/arama durumunu URL'de tutar.
 *
 * Neden: filtre uygulayıp bir kayda girip geri dönünce tüm filtreler
 * sıfırlanıyordu. URL'de tutulunca geri/ileri tuşları ve bağlantı
 * paylaşımı da çalışır.
 *
 * Varsayılan değerler URL'e yazılmaz (adres temiz kalır).
 *
 * Kullanım:
 *   const [q, setQ] = useUrlState("q", "");
 */
export function useUrlState(
  key: string,
  defaultValue: string
): [string, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const value = params.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(params.toString());
      if (!next || next === defaultValue) sp.delete(key);
      else sp.set(key, next);

      const qs = sp.toString();
      // scroll: false → filtre değişince sayfa başa sıçramasın
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, defaultValue, params, pathname, router]
  );

  return [value, setValue];
}
