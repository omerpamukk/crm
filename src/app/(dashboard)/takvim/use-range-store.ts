"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CalAppt, CalTimeOff, RangePayload } from "./queries";
import { daysInRange, dayKeyOf, type DayRange } from "./zaman";

/*
 * Takvimin istemci önbelleği. Tarih değişince sayfa yeniden yüklenmez:
 * eksik günler /takvim/aralik'tan çekilir, komşu aralıklar önceden çekilir,
 * böylece ‹ › ve kaydırma anında olur.
 *
 * - Sunucu sayfayı tazelerse (ör. Geldi'den sonra revalidatePath) gelen
 *   aralık önbelleğe yazılır.
 * - Kayıt değişince `refresh()` görünen aralığı sessizce yeniden çeker;
 *   eski veri yeni gelene kadar ekranda kalır (boş ekran yanıp sönmez).
 * - Sekmeye dönünce (30 sn'den eskiyse) görünen aralık tazelenir.
 */

type Store = {
  days: Map<string, CalAppt[]>;
  timeOff: Map<string, CalTimeOff>;
};

function emptyStore(): Store {
  return { days: new Map(), timeOff: new Map() };
}

function merge(store: Store, payload: RangePayload, tz: string, replace = false): Store {
  const days = replace ? new Map<string, CalAppt[]>() : new Map(store.days);
  const timeOff = new Map(store.timeOff);
  for (const k of daysInRange(payload.start, payload.end)) days.set(k, []);
  for (const a of payload.appts) {
    const k = dayKeyOf(a.starts_at, tz);
    const list = days.get(k);
    if (list) list.push(a);
  }
  for (const t of payload.timeOff) timeOff.set(t.id, t);
  return { days, timeOff };
}

async function fetchPayload(range: DayRange): Promise<RangePayload> {
  const res = await fetch(`/takvim/aralik?bas=${range.start}&son=${range.end}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  const body = (await res.json().catch(() => null)) as (RangePayload & { error?: string }) | null;
  if (!res.ok || !body || body.error || !Array.isArray(body.appts)) {
    throw new Error(body?.error ?? "Randevular yüklenemedi.");
  }
  return body;
}

export function useRangeStore({
  tz,
  initial,
  range,
  prefetch,
}: {
  tz: string;
  /** Sunucunun çektiği ilk aralık (yüklenemediyse null). */
  initial: RangePayload | null;
  /** Ekranda görünen aralık. */
  range: DayRange;
  /** Arka planda önceden çekilecek komşu aralıklar. */
  prefetch: DayRange[];
}) {
  const [store, setStore] = useState<Store>(() => (initial ? merge(emptyStore(), initial, tz) : emptyStore()));
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Sunucu yeni veri gönderdiyse (sayfa tazelendi) önbelleğe yaz — render sırasında, efektsiz
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial) setStore((s) => merge(s, initial, tz));
  }

  const inflight = useRef(new Set<string>());
  const generation = useRef(0);
  const lastRefresh = useRef(0);

  /** Aynı aralık için ikinci isteği açmaz; yanıt eskidiyse (arada tazelendi) null döner. */
  const request = useCallback(async (r: DayRange): Promise<RangePayload | null> => {
    const key = `${r.start}|${r.end}`;
    if (inflight.current.has(key)) return null;
    inflight.current.add(key);
    const gen = generation.current;
    try {
      const payload = await fetchPayload(r);
      return gen === generation.current ? payload : null;
    } finally {
      inflight.current.delete(key);
    }
  }, []);

  const rangeKey = `${range.start}|${range.end}`;
  const dayKeys = useMemo(() => daysInRange(range.start, range.end), [range.start, range.end]);
  const missing = dayKeys.some((k) => !store.days.has(k));
  const failed = errorKey === rangeKey;

  // Görünen aralıkta eksik gün varsa çek
  useEffect(() => {
    if (!missing || failed) return;
    const key = rangeKey;
    request({ start: range.start, end: range.end }).then(
      (payload) => {
        if (payload) setStore((s) => merge(s, payload, tz));
      },
      () => setErrorKey(key)
    );
    // range nesnesi her çizimde yeni; anahtar yeterli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, missing, failed, request, tz]);

  // Görünen hazırsa komşuları önceden çek (hata sessiz: gezinince yeniden denenir)
  const prefetchKey = prefetch.map((r) => `${r.start}|${r.end}`).join(",");
  useEffect(() => {
    if (missing) return;
    for (const r of prefetch) {
      if (!daysInRange(r.start, r.end).some((k) => !store.days.has(k))) continue;
      request(r).then(
        (payload) => {
          if (payload) setStore((s) => merge(s, payload, tz));
        },
        () => {}
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetchKey, missing, request, tz]);

  /** Görünen aralığı sessizce yeniden çeker; diğer günleri unutur. */
  const refresh = useCallback(async () => {
    generation.current += 1;
    const gen = generation.current;
    lastRefresh.current = Date.now();
    try {
      const payload = await fetchPayload(range);
      if (gen !== generation.current) return;
      setStore((s) => merge(s, payload, tz, true));
      setErrorKey(null);
    } catch {
      // Eski veri ekranda kalır; bir sonraki gezinmede yeniden denenir.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, tz]);

  const retry = useCallback(() => {
    setErrorKey(null);
  }, []);

  // Sekmeye dönünce tazele (başka bir cihazdan eklenen randevu görünsün)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < 30_000) return;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  /** İyimser güncelleme (Geldi gibi): randevuyu yerinde değiştirir. */
  const patch = useCallback((id: string, fields: Partial<CalAppt>) => {
    setStore((s) => {
      const days = new Map(s.days);
      for (const [k, list] of days) {
        const i = list.findIndex((a) => a.id === id);
        if (i === -1) continue;
        const next = [...list];
        next[i] = { ...next[i], ...fields };
        days.set(k, next);
      }
      return { ...s, days };
    });
  }, []);

  const appts = useMemo(() => {
    if (missing) return null;
    return dayKeys.flatMap((k) => store.days.get(k) ?? []);
  }, [dayKeys, missing, store.days]);

  const timeOff = useMemo(() => [...store.timeOff.values()], [store.timeOff]);

  return {
    /** Görünen aralığın randevuları; yükleniyorsa null. */
    appts,
    timeOff,
    status: failed ? ("error" as const) : missing ? ("loading" as const) : ("ready" as const),
    refresh,
    retry,
    patch,
    /** Önbellekteki tek randevu (ayrıntı paneli canlı kalsın diye). */
    find: (id: string): CalAppt | null => {
      for (const list of store.days.values()) {
        const a = list.find((x) => x.id === id);
        if (a) return a;
      }
      return null;
    },
  };
}
