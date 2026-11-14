import type { SupabaseClient } from "@supabase/supabase-js";

import { REMINDABLE_STATUSES } from "@/lib/appointment-status";
import { BUSINESS_TZ, zonedParts, zonedWallToUtcMs } from "@/lib/zaman";

import { isMarketingRule, isRuleRunnable, SUPPORTED_TRIGGERS } from "./supported";

/**
 * Otomasyon kurallarını tarayıp `reminders` satırı üretir.
 *
 * Cron saatte bir çağırır (bkz. 0034_saatlik_cron.sql), sonra kuyruğu
 * gönderir. Günde tek tur çalışan kurulumda da doğru davranır; yalnızca
 * "randevudan 2 saat önce" gibi kısa süreler o turun saatine kayar.
 *
 * ⚠️ YALNIZCA SUNUCU TARAFI — service_role istemcisi bekler.
 *
 * Mükerrer koruması: her hatırlatmanın `scheduled_at`'i olaydan
 * türetilir (randevu saati, son ziyaret, paket satın alma, doğum günü).
 * Aynı olay her turda aynı anahtarı üretir; reminders üzerindeki
 * uq_reminders_automation_once (automation_id, customer_id, scheduled_at)
 * ikinci satırı reddeder. Böylece cron saatte bir çalışsa da aynı kişiye
 * aynı olay için tek mesaj gider.
 *
 * Sessiz saatler: işletme saatiyle SEND_FROM_HOUR–SEND_UNTIL_HOUR dışında
 * hiçbir şey planlanmaz ve gönderilmez (isQuietHour). Gece yarısı
 * "randevunuzu hatırlatırız" mesajı gitmez.
 */

export const SEND_FROM_HOUR = 9;
export const SEND_UNTIL_HOUR = 21;

/** Günlük tetikleyicilerin (doğum günü, geri kazanım…) gönderildiği saat. */
const DAILY_SEND_HOUR = 10;

/** Yorum isteme: ziyaret günü bu saatte (akşam) gider. */
export const REVIEW_SEND_HOUR = 19;

/** Yorum isteme yalnızca son N gündeki ziyaretler için (eski geçmişe toplu mesaj gitmez). */
const REVIEW_LOOKBACK_DAYS = 3;

/**
 * Geri kazanım penceresi: müşteri eşiği son N gün içinde geçtiyse mesaj
 * gider. Kural ilk açıldığında yıllardır gelmeyen yüzlerce kişiye birden
 * mesaj atılmasın diye; toplu geri kazanım ayrı bir kampanya işidir.
 */
const WINBACK_LOOKBACK_DAYS = 14;

/**
 * Borç hatırlatma penceresi: borcun vadesi son N gün içinde geldiyse mesaj
 * gider. Kural ilk açıldığında aylardır borçlu olanlara toplu mesaj
 * gitmesin diye (pasif_musteri ile aynı desen).
 */
const DEBT_LOOKBACK_DAYS = 14;

/** Randevu hatırlatmasının gideceği son tur: cron :05'te çalışır (0034), 21:00'den önceki son tur 20:05. */
const LAST_SLOT_MIN = (SEND_UNTIL_HOUR - 1) * 60 + 5;
const FIRST_SLOT_MIN = SEND_FROM_HOUR * 60;

/** PostgREST tek yanıtta en fazla 1000 satır döndürür; sayfa boyutu. */
const PAGE = 1000;
/** `.in(...)` listelerinde adres satırı uzamasın diye parça boyutu. */
const CHUNK = 100;

const CHANNEL_OF: Record<string, "sms" | "email" | "whatsapp"> = {
  wa: "whatsapp",
  indirim: "whatsapp",
  sms: "sms",
  eposta: "email",
};

const KIND_OF: Record<string, string> = {
  randevu_oncesi: "appointment",
  odeme_gecikti: "debt",
  paket_bitiyor: "package_done",
  pasif_musteri: "custom",
  dogum_gunu: "birthday",
};

const HOUR = 3_600_000;
const DAY = 86_400_000;

export type Rule = {
  id: string;
  business_id: string;
  trigger_id: string;
  trigger_param: number | null;
  action_id: string;
  message: string | null;
  wa_template?: string | null;
};

export type PlannedReminder = {
  business_id: string;
  automation_id: string;
  customer_id: string;
  kind: string;
  channel: string;
  body: string;
  scheduled_at: string;
  related_type?: string;
  related_id?: string;
};

type CustomerRef = {
  full_name: string;
  marketing_sms_at?: string | null;
  marketing_email_at?: string | null;
};

type Joined = CustomerRef | CustomerRef[] | null;

const one = (c: Joined): CustomerRef | null => (Array.isArray(c) ? c[0] ?? null : c);

export function fillTemplate(template: string, name: string): string {
  return template.replace(/\{ad\}/g, firstName(name));
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** İşletme saatiyle gönderim yapılmayan saat mi? */
export function isQuietHour(now: Date, tz: string = BUSINESS_TZ): boolean {
  const h = zonedParts(now.getTime(), tz).h;
  return h < SEND_FROM_HOUR || h >= SEND_UNTIL_HOUR;
}

/** Bir anın işletme saatiyle günü, verilen saatte (ISO). */
function dayAt(ms: number, hour: number, tz: string = BUSINESS_TZ): string {
  const p = zonedParts(ms, tz);
  return new Date(zonedWallToUtcMs(p.y, p.m, p.d, hour, 0, tz)).toISOString();
}


function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

type PageResult = { data: unknown[] | null; error: unknown };

/** 1000 satır sınırını aşan okumalar için sayfalı okuma. Hata olursa fırlatır (sessizce eksik veri yok). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<PageResult>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

/**
 * Randevu hatırlatmasının gerçek gönderim anı. Hesaplanan an sessiz saate
 * (ya da cron'un son turu olan 20:05'ten sonrasına) düşerse bir önceki
 * pencerenin son turuna (20:05) çekilir; böylece sabah 09:00 randevusuna
 * "2 saat önce" hatırlatması önceki akşam gider, hiç gitmemez.
 */
export function appointmentSendAt(startsAtMs: number, hours: number, tz: string = BUSINESS_TZ): number {
  const at = startsAtMs - hours * HOUR;
  const p = zonedParts(at, tz);
  const minutes = p.h * 60 + p.min;
  if (minutes >= FIRST_SLOT_MIN && minutes <= LAST_SLOT_MIN) return at;
  const day = minutes < FIRST_SLOT_MIN ? zonedParts(at - DAY, tz) : p;
  return zonedWallToUtcMs(day.y, day.m, day.d, Math.floor(LAST_SLOT_MIN / 60), LAST_SLOT_MIN % 60, tz);
}

export type DebtCharge = { at: number; amount: number };

/**
 * Borcun gecikmeye girdiği an (ms) ya da null. customer_balances (0031) ile
 * aynı mantık: ödemeler en eski satıştan başlayarak düşülür; karşılanmayan
 * ilk satışın tarihine `days` eklenir. Henüz vadesi gelmediyse null.
 */
export function debtOverdueSince(charges: DebtCharge[], paid: number, days: number, now: number): number | null {
  let left = paid;
  for (const c of [...charges].sort((a, b) => a.at - b.at)) {
    if (left >= c.amount - 0.005) {
      left -= c.amount;
      continue;
    }
    const due = c.at + days * DAY;
    return due <= now ? due : null;
  }
  return null;
}

/** Hatırlatma kuyruğu anahtarı (uq_reminders_automation_once ile aynı üçlü). */
const keyOf = (customerId: string, scheduledAt: string) => `${customerId}|${new Date(scheduledAt).getTime()}`;

/**
 * Pazarlama kuralında müşterinin o kanaldan izni var mı? Bilgilendirme
 * kurallarında (randevu, borç) izin aranmaz.
 */
export function hasConsent(rule: Rule, channel: string, c: CustomerRef | null): boolean {
  if (!isMarketingRule(rule)) return true;
  if (!c) return false;
  return channel === "email" ? Boolean(c.marketing_email_at) : Boolean(c.marketing_sms_at);
}

const CUSTOMER_COLS = "full_name, marketing_sms_at, marketing_email_at";

export type PlanOptions = {
  /** Mesajdaki {link} için site adresi (ör. https://ornek.app). Yoksa yorum isteme planlanmaz. */
  baseUrl?: string;
};

/** Ziyaret günleri listesinden: bu randevu müşterinin ilk ziyareti mi? */
export function isFirstVisit(visitDays: readonly string[], day: string): boolean {
  return visitDays.length > 0 && [...new Set(visitDays)].sort()[0] === day && new Set(visitDays).size === 1;
}

export async function planRule(
  admin: SupabaseClient,
  rule: Rule,
  now: Date,
  opts: PlanOptions = {}
): Promise<PlannedReminder[]> {
  const channel = CHANNEL_OF[rule.action_id];
  if (!channel || !rule.message) return [];
  if (!isRuleRunnable(rule)) return [];

  const base = {
    business_id: rule.business_id,
    automation_id: rule.id,
    kind: KIND_OF[rule.trigger_id] ?? "custom",
    channel,
  };

  const make = (
    customerId: string,
    c: CustomerRef | null,
    scheduledAt: string,
    related?: { type: string; id: string }
  ): PlannedReminder[] => {
    if (!hasConsent(rule, channel, c)) return [];
    return [
      {
        ...base,
        customer_id: customerId,
        body: fillTemplate(rule.message!, c?.full_name ?? ""),
        scheduled_at: scheduledAt,
        ...(related ? { related_type: related.type, related_id: related.id } : {}),
      },
    ];
  };

  const todayAt = dayAt(now.getTime(), DAILY_SEND_HOUR);
  const dailyDue = now.getTime() >= new Date(todayAt).getTime();

  switch (rule.trigger_id) {
    case "randevu_oncesi": {
      const hours = rule.trigger_param ?? 24;
      // Sessiz saate düşen hatırlatmalar önceki akşam 20:05'e çekildiği için
      // pencere en fazla ~13 saat geniş tutulur.
      const windowEnd = new Date(now.getTime() + hours * HOUR + 14 * HOUR);

      const data = await fetchAll<unknown>((from, to) =>
        admin
          .from("appointments")
          .select(`id, starts_at, created_at, customer_id, customers(${CUSTOMER_COLS})`)
          .eq("business_id", rule.business_id)
          .in("status", [...REMINDABLE_STATUSES])
          .gte("starts_at", now.toISOString())
          .lte("starts_at", windowEnd.toISOString())
          .order("starts_at")
          .order("id")
          .range(from, to)
      );

      return data.flatMap((a) => {
        const row = a as {
          id: string;
          starts_at: string;
          created_at: string | null;
          customer_id: string | null;
          customers: Joined;
        };
        if (!row.customer_id) return [];
        const sendAt = appointmentSendAt(new Date(row.starts_at).getTime(), hours);
        if (sendAt > now.getTime()) return [];
        // Gönderim anından sonra alınan randevuya "yaklaşan randevunuz" mesajı gitmez.
        if (row.created_at && new Date(row.created_at).getTime() > sendAt) return [];
        return make(row.customer_id, one(row.customers), new Date(sendAt).toISOString(), { type: "appointment", id: row.id });
      });
    }

    case "randevu_tamamlandi": {
      // Ziyaret sonrası yorum isteme: yalnızca ilk kez gelen, daha önce hiç
      // sorulmamış müşteriye, ziyaret günü akşam. Bilgilendirme sayılır
      // (içinde kampanya yok); yine de {link} şart.
      if (!opts.baseUrl || channel !== "sms" || !rule.message.includes("{link}")) return [];
      const since = new Date(now.getTime() - REVIEW_LOOKBACK_DAYS * DAY);
      const { data } = await admin
        .from("appointments")
        .select(`id, starts_at, status, customer_id, customers(${CUSTOMER_COLS})`)
        .eq("business_id", rule.business_id)
        .gte("starts_at", since.toISOString())
        .lte("starts_at", new Date(now.getTime() - HOUR).toISOString())
        .not("customer_id", "is", null);

      type Row = { id: string; starts_at: string; status: string | null; customer_id: string; customers: Joined };
      const done = ((data ?? []) as Row[]).filter((a) => a.status !== "cancelled" && a.status !== "no_show");
      // Gönderim anı: ziyaret günü akşam (randevu akşamsa bitişinden sonra).
      const due = done
        .map((a) => {
          const start = new Date(a.starts_at).getTime();
          const at = Math.max(new Date(dayAt(start, REVIEW_SEND_HOUR)).getTime(), start + HOUR);
          return { ...a, at };
        })
        .filter((a) => a.at <= now.getTime());
      if (due.length === 0) return [];

      const ids = [...new Set(due.map((a) => a.customer_id))];
      const [visitsRes, askedRes] = await Promise.all([
        admin
          .from("appointments")
          .select("customer_id, starts_at, status")
          .eq("business_id", rule.business_id)
          .in("customer_id", ids)
          .lt("starts_at", now.toISOString()),
        admin.from("feedback_requests").select("customer_id, appointment_id, token").eq("business_id", rule.business_id).in("customer_id", ids),
      ]);
      if (visitsRes.error || askedRes.error) {
        console.error("plan yorum:", visitsRes.error ?? askedRes.error);
        return [];
      }
      const dayKey = (iso: string) => {
        const p = zonedParts(new Date(iso).getTime());
        return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
      };
      const visits = new Map<string, string[]>();
      for (const v of (visitsRes.data ?? []) as { customer_id: string; starts_at: string; status: string | null }[]) {
        if (v.status === "cancelled" || v.status === "no_show") continue;
        visits.set(v.customer_id, [...(visits.get(v.customer_id) ?? []), dayKey(v.starts_at)]);
      }
      const asked = (askedRes.data ?? []) as { customer_id: string; appointment_id: string | null; token: string }[];

      const out: PlannedReminder[] = [];
      for (const a of due) {
        const c = one(a.customers);
        if (!c) continue;
        const prior = asked.find((x) => x.customer_id === a.customer_id);
        if (prior && prior.appointment_id !== a.id) continue; // daha önce sorulmuş
        if (!prior && !isFirstVisit(visits.get(a.customer_id) ?? [], dayKey(a.starts_at))) continue;

        let token = prior?.token;
        if (!token) {
          const { data: created, error } = await admin
            .from("feedback_requests")
            .insert({ business_id: rule.business_id, customer_id: a.customer_id, appointment_id: a.id })
            .select("token")
            .single();
          if (error || !created) {
            if (error) console.error("plan yorum insert:", error);
            continue;
          }
          token = (created as { token: string }).token;
          asked.push({ customer_id: a.customer_id, appointment_id: a.id, token });
        }
        const body = fillTemplate(rule.message, c.full_name).replace(/\{link\}/g, `${opts.baseUrl}/yorum/${token}`);
        out.push({
          ...base,
          customer_id: a.customer_id,
          body,
          scheduled_at: new Date(a.at).toISOString(),
          related_type: "appointment",
          related_id: a.id,
        });
      }
      return out;
    }

    case "dogum_gunu": {
      if (!dailyDue) return [];
      const p = zonedParts(now.getTime());
      const mmdd = `${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;

      const data = await fetchAll<unknown>((from, to) =>
        admin
          .from("customers")
          .select(`id, birthday, ${CUSTOMER_COLS}`)
          .eq("business_id", rule.business_id)
          .not("birthday", "is", null)
          .order("id")
          .range(from, to)
      );

      return data.flatMap((c) => {
        const row = c as CustomerRef & { id: string; birthday: string };
        if (row.birthday.slice(5) !== mmdd) return [];
        return make(row.id, row, todayAt);
      });
    }

    case "pasif_musteri": {
      if (!dailyDue) return [];
      const days = rule.trigger_param ?? 60;
      const newest = new Date(now.getTime() - days * DAY);
      const oldest = new Date(newest.getTime() - WINBACK_LOOKBACK_DAYS * DAY);

      const data = await fetchAll<unknown>((from, to) =>
        admin
          .from("customers")
          .select(`id, last_visit_at, ${CUSTOMER_COLS}`)
          .eq("business_id", rule.business_id)
          .eq("is_lead", false)
          .lte("last_visit_at", newest.toISOString())
          .gte("last_visit_at", oldest.toISOString())
          .order("id")
          .range(from, to)
      );

      return data.flatMap((c) => {
        const row = c as CustomerRef & { id: string; last_visit_at: string };
        const crossedAt = new Date(row.last_visit_at).getTime() + days * DAY;
        return make(row.id, row, dayAt(crossedAt, DAILY_SEND_HOUR));
      });
    }

    case "paket_bitiyor": {
      if (!dailyDue) return [];
      const left = rule.trigger_param ?? 1;

      const data = await fetchAll<unknown>((from, to) =>
        admin
          .from("packages")
          .select(`id, customer_id, purchased_at, created_at, customers(${CUSTOMER_COLS})`)
          .eq("business_id", rule.business_id)
          .gt("remaining_sessions", 0)
          .lte("remaining_sessions", left)
          .order("id")
          .range(from, to)
      );

      return data.flatMap((pk) => {
        const row = pk as {
          id: string;
          customer_id: string | null;
          purchased_at: string | null;
          created_at: string;
          customers: Joined;
        };
        if (!row.customer_id) return [];
        const anchor = new Date(row.purchased_at ?? row.created_at).getTime();
        return make(row.customer_id, one(row.customers), dayAt(anchor, DAILY_SEND_HOUR), { type: "package", id: row.id });
      });
    }

    case "odeme_gecikti": {
      if (!dailyDue) return [];
      const days = rule.trigger_param ?? 7;
      const nowMs = now.getTime();
      const oldestKey = nowMs - DEBT_LOOKBACK_DAYS * DAY;

      // Borç TEK KAYNAKTAN: customer_balances (0031). Paket fiyatından kendi
      // hesabımızı yazmayız; paketsiz ödemeler de düşülmüş bakiye gelir.
      const balances = await fetchAll<{ customer_id: string; payments: number | string }>((from, to) =>
        admin
          .from("customer_balances")
          .select("customer_id, payments")
          .eq("business_id", rule.business_id)
          .gt("balance", 0)
          .order("customer_id")
          .range(from, to)
      );
      if (balances.length === 0) return [];

      const due: { customerId: string; scheduledAt: string }[] = [];
      for (const part of chunks(balances, CHUNK)) {
        const ids = part.map((b) => b.customer_id);
        const [pkgs, appts] = await Promise.all([
          fetchAll<{ customer_id: string; price: number | string; purchased_at: string | null; created_at: string }>((from, to) =>
            admin
              .from("packages")
              .select("customer_id, price, purchased_at, created_at")
              .eq("business_id", rule.business_id)
              .in("customer_id", ids)
              .gt("price", 0)
              .order("id")
              .range(from, to)
          ),
          fetchAll<{ customer_id: string; price: number | string; starts_at: string }>((from, to) =>
            admin
              .from("appointments")
              .select("customer_id, price, starts_at")
              .eq("business_id", rule.business_id)
              .in("customer_id", ids)
              .eq("status", "completed")
              .is("package_id", null)
              .gt("price", 0)
              .order("id")
              .range(from, to)
          ),
        ]);

        const byCustomer = new Map<string, DebtCharge[]>();
        const add = (id: string, at: string, amount: number | string) => {
          const list = byCustomer.get(id) ?? [];
          list.push({ at: new Date(at).getTime(), amount: Number(amount) || 0 });
          byCustomer.set(id, list);
        };
        for (const p of pkgs) add(p.customer_id, p.purchased_at ?? p.created_at, p.price);
        for (const a of appts) add(a.customer_id, a.starts_at, a.price);

        for (const b of part) {
          const since = debtOverdueSince(byCustomer.get(b.customer_id) ?? [], Number(b.payments) || 0, days, nowMs);
          if (since == null) continue;
          // Olay anahtarı müşteri bazlı: borç gecikmeye girdiği gün. Aynı borç için tekrar mesaj gitmez.
          const key = dayAt(since, DAILY_SEND_HOUR);
          if (new Date(key).getTime() < oldestKey) continue;
          due.push({ customerId: b.customer_id, scheduledAt: key });
        }
      }
      if (due.length === 0) return [];

      const customers = new Map<string, CustomerRef>();
      for (const part of chunks(due, CHUNK)) {
        const rows = await fetchAll<CustomerRef & { id: string }>((from, to) =>
          admin
            .from("customers")
            .select(`id, ${CUSTOMER_COLS}`)
            .eq("business_id", rule.business_id)
            .in("id", part.map((d) => d.customerId))
            .order("id")
            .range(from, to)
        );
        for (const r of rows) customers.set(r.id, r);
      }

      return due.flatMap((d) => make(d.customerId, customers.get(d.customerId) ?? null, d.scheduledAt));
    }

    default:
      return [];
  }
}

/**
 * Tüm aktif kuralları tarar ve üretilen hatırlatmaları kuyruğa yazar.
 * Sessiz saatlerde hiçbir şey planlamaz.
 */
export async function planAutomations(
  admin: SupabaseClient,
  now = new Date(),
  opts: PlanOptions = {}
): Promise<{ planned: number; rules: number; quiet: boolean }> {
  if (isQuietHour(now)) return { planned: 0, rules: 0, quiet: true };

  const { data, error } = await admin
    .from("automations")
    .select("id, business_id, trigger_id, trigger_param, action_id, message, wa_template")
    .eq("active", true)
    .in("trigger_id", SUPPORTED_TRIGGERS as unknown as string[]);

  if (error) {
    console.error("planAutomations select:", error);
    return { planned: 0, rules: 0, quiet: false };
  }

  const rules = ((data ?? []) as Rule[]).filter(isRuleRunnable);
  let planned = 0;

  for (const rule of rules) {
    try {
      planned += await enqueueRule(admin, rule, now, opts);
    } catch (e) {
      console.error(`planAutomations rule ${rule.id}:`, e);
    }
  }

  return { planned, rules: rules.length, quiet: false };
}

/** Bir kuralın hatırlatmalarını planlayıp kuyruğa yazar; eklenen satır sayısını döner. */
async function enqueueRule(admin: SupabaseClient, rule: Rule, now: Date, opts: PlanOptions = {}): Promise<number> {
  const items = await planRule(admin, rule, now, opts);
  if (items.length === 0) return 0;

  // Aynı müşteri + aynı an iki kez üretilebilir (aynı saatte iki randevu, aynı gün iki paket).
  // Tekil anahtar ihlali bütün toplu eklemeyi düşürmesin diye önce kendi içinde tekilleştir.
  const unique = new Map<string, PlannedReminder>();
  for (const i of items) if (!unique.has(keyOf(i.customer_id, i.scheduled_at))) unique.set(keyOf(i.customer_id, i.scheduled_at), i);
  const candidates = [...unique.values()];

  const times = candidates.map((i) => new Date(i.scheduled_at).getTime());
  const minAt = new Date(Math.min(...times)).toISOString();
  const maxAt = new Date(Math.max(...times)).toISOString();

  const seen = new Set<string>();
  for (const part of chunks([...new Set(candidates.map((i) => i.customer_id))], CHUNK)) {
    const existing = await fetchAll<{ customer_id: string | null; scheduled_at: string }>((from, to) =>
      admin
        .from("reminders")
        .select("customer_id, scheduled_at")
        .eq("automation_id", rule.id)
        .in("customer_id", part)
        .gte("scheduled_at", minAt)
        .lte("scheduled_at", maxAt)
        .order("id")
        .range(from, to)
    );
    for (const r of existing) if (r.customer_id) seen.add(keyOf(r.customer_id, r.scheduled_at));
  }

  const fresh = candidates.filter((i) => !seen.has(keyOf(i.customer_id, i.scheduled_at)));
  if (fresh.length === 0) return 0;

  let inserted = 0;
  for (const part of chunks(fresh, 200)) {
    const { data, error } = await admin.from("reminders").insert(part).select("id");
    if (!error) {
      inserted += data?.length ?? part.length;
      continue;
    }
    // Toplu ekleme düştü (yarış, tek bir kötü satır…): tek tek dene; çakışanlar zaten kuyrukta.
    console.error(`planAutomations insert ${rule.id}:`, error);
    for (const row of part) {
      const { error: oneErr } = await admin.from("reminders").insert(row);
      if (!oneErr) inserted++;
      else if ((oneErr as { code?: string }).code !== "23505") console.error(`planAutomations insert row ${rule.id}:`, oneErr);
    }
  }

  if (inserted > 0) {
    await admin.from("automations").update({ last_run_at: now.toISOString() }).eq("id", rule.id);
  }
  return inserted;
}
