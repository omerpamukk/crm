/**
 * Müşteri puanı ve ritim segmenti (0035 customer_rhythm görünümü).
 *
 * Her müşteri kendi geliş düzenine göre değerlendirilir: 3 haftada bir gelen
 * biri 6 haftadır yoksa risktedir; 3 ayda bir gelen biri 6 haftadır yoksa
 * değildir. Sabit "90 gündür gelmeyen" eşiği bu farkı görmez.
 *
 * Puan (0–100) = Düzen 40 + Sıklık 25 + Güvenilirlik 20 + Sadakat 15.
 * Saf fonksiyonlar: sunucu ve istemcide aynı sonuç, testli.
 */

import { zonedParts } from "@/lib/zaman";

export interface RhythmRow {
  customer_id: string;
  visits: number;
  first_visit: string | null;
  last_visit: string | null;
  avg_interval_days: number | string | null;
  past_total: number;
  no_shows: number;
  cancels: number;
  next_appointment: string | null;
}

export type Segment =
  | "guclu"
  | "yeni"
  | "ilgisi_azaliyor"
  | "kaybetme_riski"
  | "kaybedildi"
  | "henuz_gelmedi";

export const SEGMENTS: Record<Segment, { label: string; tone: "positive" | "info" | "warning" | "danger" | "neutral"; hint: string }> = {
  guclu: { label: "Güçlü", tone: "positive", hint: "Kendi düzeninde geliyor." },
  yeni: { label: "Yeni", tone: "info", hint: "Bir kez geldi; ikinci ziyareti bekleniyor." },
  ilgisi_azaliyor: { label: "İlgisi azalıyor", tone: "warning", hint: "Beklenen ziyaretini biraz geçti." },
  kaybetme_riski: { label: "Kaybetme riski", tone: "danger", hint: "Kendi düzenine göre uzun süredir gelmedi." },
  kaybedildi: { label: "Kaybedildi", tone: "neutral", hint: "Kendi düzenine göre çok uzun süredir gelmedi." },
  henuz_gelmedi: { label: "Henüz gelmedi", tone: "neutral", hint: "Kayıtlı ama hiç ziyareti yok." },
};

/** Sıralama: geri kazanılabilir olanlar önce. */
export const SEGMENT_ORDER: Segment[] = [
  "kaybetme_riski",
  "ilgisi_azaliyor",
  "yeni",
  "guclu",
  "kaybedildi",
  "henuz_gelmedi",
];

export interface Rhythm {
  segment: Segment;
  score: number;
  parts: { duzen: number; siklik: number; guvenilirlik: number; sadakat: number };
  intervalDays: number;
  intervalIsOwn: boolean;
  daysSinceLast: number | null;
  expectedNext: string | null;
  overdueDays: number;
  sentence: string;
}

const DEFAULT_INTERVAL = 42;
const MIN_INTERVAL = 7;
const DAY = 86_400_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function todayKey(now: Date): string {
  const p = zonedParts(now.getTime());
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function dayDiff(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY);
}

function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + Math.round(days) * DAY).toISOString().slice(0, 10);
}

/**
 * İşletmenin tipik ziyaret aralığı: en az iki kez gelmiş müşterilerin
 * ortalama aralıklarının medyanı. Tek ziyaretli müşterinin "beklenen
 * ziyareti" bununla tahmin edilir.
 */
export function businessInterval(rows: Pick<RhythmRow, "visits" | "avg_interval_days">[]): number {
  const xs = rows
    .filter((r) => r.visits >= 2 && r.avg_interval_days != null)
    .map((r) => Number(r.avg_interval_days))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (xs.length === 0) return DEFAULT_INTERVAL;
  const mid = Math.floor(xs.length / 2);
  const median = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  return Math.max(MIN_INTERVAL, Math.round(median));
}

export function rhythmOf(row: RhythmRow, now: Date, fallbackInterval = DEFAULT_INTERVAL): Rhythm {
  const own = row.visits >= 2 && row.avg_interval_days != null && Number(row.avg_interval_days) > 0;
  const intervalDays = Math.max(MIN_INTERVAL, Math.round(own ? Number(row.avg_interval_days) : fallbackInterval));

  const guvenilirlik =
    row.past_total > 0
      ? Math.round(20 * clamp(1 - (row.no_shows + row.cancels * 0.5) / row.past_total, 0, 1))
      : 20;

  if (row.visits === 0 || !row.last_visit) {
    return {
      segment: "henuz_gelmedi",
      score: 0,
      parts: { duzen: 0, siklik: 0, guvenilirlik: 0, sadakat: 0 },
      intervalDays,
      intervalIsOwn: false,
      daysSinceLast: null,
      expectedNext: null,
      overdueDays: 0,
      sentence: row.next_appointment ? "Henüz gelmedi; ilk randevusu planlı." : "Kayıtlı ama hiç ziyareti yok.",
    };
  }

  const today = todayKey(now);
  const daysSinceLast = Math.max(0, dayDiff(row.last_visit, today));
  const expectedNext = addDays(row.last_visit, intervalDays);
  const overdueDays = Math.max(0, dayDiff(expectedNext, today));
  const ratio = daysSinceLast / intervalDays;
  const booked = Boolean(row.next_appointment);

  const duzen = booked || ratio <= 1 ? 40 : Math.round(40 * clamp((3 - ratio) / 2, 0, 1));
  const siklik = own ? Math.round(25 * clamp((120 - intervalDays) / 106, 0.2, 1)) : 5;
  const sadakat = Math.min(15, Math.round(row.visits * 1.5));
  const score = duzen + siklik + guvenilirlik + sadakat;

  let segment: Segment;
  if (booked || ratio <= 1) segment = row.visits === 1 ? "yeni" : "guclu";
  else if (ratio <= 1.5) segment = "ilgisi_azaliyor";
  else if (ratio <= 3) segment = "kaybetme_riski";
  else segment = "kaybedildi";

  const times = row.visits === 1 ? "1 kez" : `${row.visits} kez`;
  const rhythmText = own ? ` Genelde ${intervalDays} günde bir geliyor.` : "";
  let tail: string;
  if (booked) tail = " Sıradaki randevusu planlı.";
  else if (overdueDays > 0) tail = ` Beklenen ziyaretinin üzerinden ${overdueDays} gün geçti.`;
  else tail = ` Bir sonraki ziyareti ${dayDiff(today, expectedNext)} gün içinde bekleniyor.`;

  return {
    segment,
    score,
    parts: { duzen, siklik, guvenilirlik, sadakat },
    intervalDays,
    intervalIsOwn: own,
    daysSinceLast,
    expectedNext,
    overdueDays,
    sentence: `Şimdiye kadar ${times} geldi. Son ziyareti ${daysSinceLast === 0 ? "bugündü" : `${daysSinceLast} gün önceydi`}.${rhythmText}${tail}`,
  };
}

/** Görünüm satırlarından müşteri → ritim haritası. */
export function rhythmMap(rows: RhythmRow[], now = new Date()): Map<string, Rhythm> {
  const fallback = businessInterval(rows);
  return new Map(rows.map((r) => [r.customer_id, rhythmOf(r, now, fallback)]));
}
