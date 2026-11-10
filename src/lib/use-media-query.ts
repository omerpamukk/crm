"use client";

import { useSyncExternalStore } from "react";

/**
 * CSS medya sorgusunu izler. Sunucuda ve ilk boyamada `serverValue` döner
 * (varsayılan false), istemcide gerçek değere geçer.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

/** Telefon genişliği (<768px). Kabuk ve alt sayfa bu eşiği kullanır. */
export const PHONE_QUERY = "(max-width: 767px)";
