import { BUSINESS_TZ, zonedParts, zonedWallToUtcMs } from "@/lib/zaman";
import type { Customer } from "@/types/database";

export type NextAppt = {
  id: string;
  startsAt: string;
  status: string;
  arrivedAt: string | null;
  serviceName: string | null;
  staffName: string | null;
};

export type EnrichedCustomer = Customer & {
  service: string | null;
  remaining: number | null;
  total: number | null;
  totalValue: number;
  openDebt: number;
  /** Açık borcun en eski paketi 30 günü geçtiyse true. */
  overdue: boolean;
  lastContactAt: string | null;
  lastContactType: string | null;
  nextAppt: NextAppt | null;
};

export type ServiceOption = { id: string; name: string; price: number | null };
export type StaffOption = { id: string; full_name: string };
export type PackageOption = {
  id: string;
  customer_id: string | null;
  service_name: string | null;
  remaining_sessions: number | null;
};

/** Rolün bu sayfada yapabilecekleri (yalnızca arayüz; asıl koruma sunucuda). */
export type CustomerAbilities = {
  /** Yeni müşteri ekleyebilir (tüm roller). */
  add: boolean;
  /** Düzenler, siler, durum değiştirir. */
  manage: boolean;
  book: boolean;
  pay: boolean;
};

export const DAY = 86_400_000;

export const INTERACTION_LABEL: Record<string, string> = {
  mesaj: "Mesaj",
  arama: "Arama",
  randevu_olusturuldu: "Randevu oluşturuldu",
  randevu_tamamlandi: "Seans tamamlandı",
  not: "Not",
  asama_degisikligi: "Aşama değişikliği",
};

export function relTime(iso: string | null, nowMs: number): string {
  if (!iso) return "Hiç";
  const days = Math.floor((nowMs - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  return `${Math.floor(days / 30)} ay önce`;
}

export type Scope = "aktif" | "pasif" | "arsiv";

export function groupOf(c: Pick<Customer, "status">): Scope {
  if (c.status === "archived") return "arsiv";
  if (c.status === "passive") return "pasif";
  return "aktif";
}

export function waLink(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const n = d.startsWith("90") ? d : d.startsWith("0") ? `90${d.slice(1)}` : `90${d}`;
  return `https://wa.me/${n}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const SHORT_DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: BUSINESS_TZ });
const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ });

/** İstanbul gününün başlangıcı (gerçek an, ms). */
function dayStart(ms: number): number {
  const p = zonedParts(ms);
  return zonedWallToUtcMs(p.y, p.m, p.d, 0, 0);
}

/** "Bugün 14:30", "Yarın 10:00", "12 Kas 10:00". */
export function apptWhen(iso: string, nowMs: number): { day: string; time: string; today: boolean } {
  const t = new Date(iso);
  const diff = Math.round((dayStart(t.getTime()) - dayStart(nowMs)) / DAY);
  const day = diff === 0 ? "Bugün" : diff === 1 ? "Yarın" : SHORT_DATE.format(t);
  return { day, time: TIME.format(t), today: diff === 0 };
}
