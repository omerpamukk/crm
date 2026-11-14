import { rhythmMap, type RhythmRow } from "@/lib/customer-rhythm";
import { isWinnable } from "@/lib/rhythm-query";
import { normalizePhone } from "@/lib/messaging/sms";
import { BUSINESS_TZ, zonedParts } from "@/lib/zaman";

/**
 * Kampanya kitleleri. Saf fonksiyonlar: veri dışarıdan gelir, test edilir.
 *
 * Her kitlede yalnızca kampanya izni olan (0032 marketing_sms_at) ve
 * geçerli cep telefonu olan müşteriler alıcı olur. İzinsiz kişiye ticari
 * SMS gitmez.
 */

export const AUDIENCES = [
  { key: "gelmeyen_30", label: "1 aydır gelmeyenler", hint: "Son ziyareti 30 günden eski, ileri tarihli randevusu yok." },
  { key: "geri_kazan", label: "Geri kazanılabilirler", hint: "Kendi düzenine göre gecikmiş, henüz kaybedilmemiş." },
  { key: "dogum_gunu", label: "Bu ay doğum günü olanlar", hint: "Doğum günü bu ay içinde olan müşteriler." },
  { key: "hepsi", label: "Tüm müşteriler", hint: "Kampanya izni olan herkes." },
] as const;

export type AudienceKey = (typeof AUDIENCES)[number]["key"];

export const AUDIENCE_KEYS = AUDIENCES.map((a) => a.key) as [AudienceKey, ...AudienceKey[]];

export function audienceLabel(key: string): string {
  return AUDIENCES.find((a) => a.key === key)?.label ?? key;
}

export interface AudienceCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  birthday: string | null;
  marketing_sms_at: string | null;
}

export interface Recipient {
  customerId: string;
  name: string;
  phone: string;
}

export interface AudienceResult {
  recipients: Recipient[];
  /** Kitleye girip izni olmadığı için atlananlar. */
  noConsent: number;
  /** Kitleye girip telefonu olmayan ya da geçersiz olanlar. */
  noPhone: number;
}

const DAY = 86_400_000;

function inAudience(
  key: AudienceKey,
  c: AudienceCustomer,
  row: RhythmRow | undefined,
  ctx: { now: Date; month: string; winnable: Set<string> }
): boolean {
  switch (key) {
    case "hepsi":
      return true;
    case "dogum_gunu":
      return !!c.birthday && c.birthday.slice(5, 7) === ctx.month;
    case "geri_kazan":
      return ctx.winnable.has(c.id);
    case "gelmeyen_30": {
      if (!row?.last_visit || row.next_appointment) return false;
      const last = new Date(`${row.last_visit}T12:00:00Z`).getTime();
      return ctx.now.getTime() - last >= 30 * DAY;
    }
  }
}

export function buildAudience(
  key: AudienceKey,
  customers: AudienceCustomer[],
  rhythmRows: RhythmRow[],
  now = new Date()
): AudienceResult {
  const rows = new Map(rhythmRows.map((r) => [r.customer_id, r]));
  const winnable = new Set<string>();
  if (key === "geri_kazan") {
    for (const [id, r] of rhythmMap(rhythmRows, now)) if (isWinnable(r)) winnable.add(id);
  }
  const month = String(zonedParts(now.getTime(), BUSINESS_TZ).m).padStart(2, "0");
  const ctx = { now, month, winnable };

  const seen = new Set<string>();
  const out: AudienceResult = { recipients: [], noConsent: 0, noPhone: 0 };
  for (const c of customers) {
    if (!inAudience(key, c, rows.get(c.id), ctx)) continue;
    if (!c.marketing_sms_at) {
      out.noConsent++;
      continue;
    }
    const phone = c.phone ? normalizePhone(c.phone) : null;
    if (!phone) {
      out.noPhone++;
      continue;
    }
    if (seen.has(phone)) continue;
    seen.add(phone);
    out.recipients.push({ customerId: c.id, name: c.full_name, phone });
  }
  return out;
}

/** "{ad}" → müşterinin adı (ilk kelime). */
export function personalize(body: string, fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return body.replace(/\{ad\}/gi, first);
}

/**
 * Yaklaşık SMS boyu (Türkçe karakterli): 155 karaktere kadar 1 SMS, üstü
 * 150'şer karakterlik parçalar. Sağlayıcıya göre küçük fark olabilir.
 */
export function smsParts(text: string): number {
  const n = [...text].length;
  if (n === 0) return 0;
  return n <= 155 ? 1 : Math.ceil(n / 150);
}
