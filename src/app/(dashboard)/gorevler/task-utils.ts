import { BUSINESS_TZ, zonedParts } from "@/lib/zaman";
import { formatTime } from "@/lib/format";

export type Priority = "high" | "normal" | "low";
export type CustStatus = "aktif" | "lead" | "pasif";

/** Sunucudan gelen liste (task_columns). */
export interface BoardColumn {
  id: string;
  label: string;
  color: string;
  isDone: boolean;
}

/** Sunucudan gelen görev (tasks + ilişkili müşteri/personel). */
export interface BoardTask {
  id: string;
  columnId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  assigneeName: string;
  dueAt: string | null;
  priority: Priority;
  customerId: string | null;
  customerName: string | null;
  customerStatus: CustStatus | null;
  isAuto: boolean;
  hasAlert: boolean;
  completedAt: string | null;
  createdByLabel: string;
  createdAt: string;
}

/** Seçim kutuları için (personel / müşteri). */
export interface BoardOption {
  id: string;
  label: string;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Acil",
  normal: "Normal",
  low: "Düşük",
};

export const TEAM_LABEL = "Tüm ekip";

const pad = (n: number) => String(n).padStart(2, "0");

/** Bugünün İstanbul günü ("2026-11-06"). Sunucuda hesaplanıp istemciye geçer. */
export function todayKey(): string {
  const p = zonedParts(Date.now());
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Bir anın İstanbul günü ("YYYY-MM-DD"). */
export function dayKeyOf(iso: string): string {
  const p = zonedParts(new Date(iso).getTime());
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Son tarihi geçmiş mi? İstanbul gününe göre; bugün bitenler gecikmiş sayılmaz. */
export function isOverdue(task: BoardTask, today: string, done: boolean): boolean {
  if (done || !task.dueAt) return false;
  return dayKeyOf(task.dueAt) < today;
}

/** "Bugün 17:00", "Yarın", "19 Eyl 17:00" — saat 00:00 ise yalnızca gün. */
export function formatDue(iso: string | null, today: string): string {
  if (!iso) return "";
  const key = dayKeyOf(iso);
  const ms = new Date(iso).getTime();
  const p = zonedParts(ms);
  const time = p.h === 0 && p.min === 0 ? "" : ` ${formatTime(iso)}`;
  if (key === today) return `Bugün${time}`;
  if (key === addDays(today, 1)) return `Yarın${time}`;
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  const day = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: BUSINESS_TZ,
  }).format(ms);
  return `${day}${time}`;
}

/** Liste noktasının rengi: eski Tailwind renk adlarını da tokena çevirir. */
export function columnDot(col: Pick<BoardColumn, "color" | "isDone">): string {
  if (col.isDone) return "bg-positive-dot";
  const c = col.color;
  if (/positive|emerald|green|lime/.test(c)) return "bg-positive-dot";
  if (/warning|amber|orange|yellow/.test(c)) return "bg-warning-dot";
  if (/danger|rose|red|pink/.test(c)) return "bg-danger-dot";
  if (/info|sky|blue|cyan|teal/.test(c)) return "bg-info-dot";
  return "bg-primary";
}

/** Yeni listelerin sırayla alacağı token renkleri. */
export const LIST_COLORS = ["bg-info-dot", "bg-warning-dot", "bg-primary", "bg-danger-dot"];

