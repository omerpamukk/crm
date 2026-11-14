import { BUSINESS_TZ, zonedParts } from "@/lib/zaman";

/**
 * Doluluk oranı: dolu personel-dakikası / açık personel-dakikası.
 *
 * Kapasite = çalışma saatleri (Ayarlar → Çalışma saatleri) × aktif personel.
 * Dolu = iptal edilmemiş randevuların süresi (hizmet süresi; yoksa 30 dk).
 * "Gelmedi" de dolu sayılır: o saat başkasına verilemedi.
 *
 * Isı haritası gün × saat: o saat diliminin, dönemdeki aynı günlerin
 * toplam kapasitesine göre doluluğu.
 */

export type WorkingDay = { day: number; open: boolean; start: string; end: string };

export type OccAppointment = { starts_at: string; status: string | null; duration_min: number | null };

export type OccCell = { day: number; hour: number; booked: number; capacity: number; pct: number | null };

export type Occupancy = {
  /** Dönemin genel doluluğu (%). Kapasite yoksa null. */
  pct: number | null;
  bookedMin: number;
  capacityMin: number;
  /** Gösterilecek saatler (en erken açılış – en geç kapanış). */
  hours: number[];
  /** 1 = Pazartesi … 7 = Pazar; kapalı günler dahil (kapasite 0). */
  cells: OccCell[];
  /** En boş açık dilimler (kampanya için), en fazla 3. */
  quietest: OccCell[];
};

export const DEFAULT_DURATION = 30;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** YYYY-MM-DD → haftanın günü (1 = Pazartesi). */
function weekdayOfKey(key: string): number {
  const d = new Date(`${key}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

function* dayKeys(startKey: string, endKey: string) {
  const d = new Date(`${startKey}T12:00:00Z`);
  const end = new Date(`${endKey}T12:00:00Z`);
  while (d < end) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

/** Bir [başlangıç, bitiş) dakika aralığının saat dilimine düşen kısmı. */
function overlap(a0: number, a1: number, b0: number, b1: number) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

export function computeOccupancy(input: {
  workingDays: WorkingDay[];
  staffCount: number;
  appointments: OccAppointment[];
  /** Dönem: ilk gün (dahil) – bitiş günü (hariç), YYYY-MM-DD. */
  startKey: string;
  endKey: string;
  tz?: string;
}): Occupancy {
  const tz = input.tz ?? BUSINESS_TZ;
  const staff = Math.max(1, input.staffCount);
  const byDay = new Map(input.workingDays.map((d) => [d.day, d]));

  const openDays = input.workingDays.filter((d) => d.open && d.start < d.end);
  const firstHour = openDays.length ? Math.floor(Math.min(...openDays.map((d) => toMin(d.start))) / 60) : 9;
  const lastHour = openDays.length ? Math.ceil(Math.max(...openDays.map((d) => toMin(d.end))) / 60) : 18;
  const hours = Array.from({ length: Math.max(0, lastHour - firstHour) }, (_, i) => firstHour + i);

  const key = (day: number, hour: number) => day * 100 + hour;
  const cells = new Map<number, OccCell>();
  for (let day = 1; day <= 7; day++) {
    for (const hour of hours) cells.set(key(day, hour), { day, hour, booked: 0, capacity: 0, pct: null });
  }

  // Kapasite: dönemdeki her açık günün her saat dilimi.
  let capacityMin = 0;
  for (const k of dayKeys(input.startKey, input.endKey)) {
    const day = weekdayOfKey(k);
    const wd = byDay.get(day);
    if (!wd?.open || wd.start >= wd.end) continue;
    const s = toMin(wd.start);
    const e = toMin(wd.end);
    capacityMin += (e - s) * staff;
    for (const hour of hours) {
      const c = cells.get(key(day, hour));
      if (c) c.capacity += overlap(s, e, hour * 60, hour * 60 + 60) * staff;
    }
  }

  // Dolu: randevu süresi, başladığı yerel saatten itibaren dilimlere dağıtılır.
  let bookedMin = 0;
  for (const a of input.appointments) {
    if (a.status === "cancelled") continue;
    const dur = a.duration_min && a.duration_min > 0 ? a.duration_min : DEFAULT_DURATION;
    const p = zonedParts(new Date(a.starts_at).getTime(), tz);
    const day = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() || 7;
    const s = p.h * 60 + p.min;
    bookedMin += dur;
    for (const hour of hours) {
      const c = cells.get(key(day, hour));
      if (c) c.booked += overlap(s, s + dur, hour * 60, hour * 60 + 60);
    }
  }

  const list = [...cells.values()].map((c) => ({
    ...c,
    pct: c.capacity > 0 ? Math.min(100, Math.round((c.booked / c.capacity) * 100)) : null,
  }));

  const quietest = list
    .filter((c) => c.capacity > 0)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0) || a.day - b.day || a.hour - b.hour)
    .slice(0, 3);

  return {
    pct: capacityMin > 0 ? Math.min(100, Math.round((bookedMin / capacityMin) * 100)) : null,
    bookedMin,
    capacityMin,
    hours,
    cells: list,
    quietest,
  };
}

export const WEEKDAY_SHORT = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
export const WEEKDAY_LONG = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;
