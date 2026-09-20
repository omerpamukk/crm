import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Otomasyon kurallarını tarayıp `reminders` satırı üretir.
 *
 * Cron her sabah önce bunu çağırır, sonra kuyruğu gönderir. Yalnızca
 * "zamana bağlı" tetikleyiciler burada planlanabilir — olay anında
 * çalışması gereken tetikleyiciler (yeni lead, ödeme alındı gibi)
 * ilgili server action içinden tetiklenmeli.
 *
 * ⚠️ YALNIZCA SUNUCU TARAFI — service_role istemcisi bekler.
 *
 * Mükerrer gönderim koruması: reminders üzerindeki
 * uq_reminders_automation_once indeksi (0025) aynı kural + müşteri +
 * zaman için ikinci satırı reddeder, bu yüzden cron tekrar çalışsa
 * bile aynı hatırlatma iki kez gitmez.
 */

/** Bu modülün planlayabildiği tetikleyiciler. */
const PLANNABLE = [
  "randevu_oncesi",
  "odeme_gecikti",
  "paket_bitiyor",
  "pasif_musteri",
  "dogum_gunu",
] as const;

/** Aksiyon kimliği → gönderim kanalı. Kanalsız aksiyonlar planlanmaz. */
const CHANNEL_OF: Record<string, "sms" | "email" | "whatsapp"> = {
  wa: "whatsapp",
  indirim: "whatsapp",
  sms: "sms",
  eposta: "email",
};

/** reminders.kind — tetikleyiciye göre. */
const KIND_OF: Record<string, string> = {
  randevu_oncesi: "appointment",
  odeme_gecikti: "debt",
  paket_bitiyor: "package_done",
  pasif_musteri: "custom",
  dogum_gunu: "birthday",
};

type Rule = {
  id: string;
  business_id: string;
  trigger_id: string;
  trigger_param: number | null;
  action_id: string;
  message: string | null;
};

type PlannedReminder = {
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

/** {ad} gibi yer tutucuları doldurur. */
function fillTemplate(template: string, name: string): string {
  return template.replace(/\{ad\}/g, name.split(" ")[0] ?? name);
}

const DAY = 86_400_000;

/**
 * Tek bir kural için gönderilecek hatırlatmaları hesaplar.
 * Her tetikleyici kendi sorgusunu yapar; hiçbiri eşleşmezse boş döner.
 */
async function planRule(
  admin: SupabaseClient,
  rule: Rule,
  now: Date
): Promise<PlannedReminder[]> {
  const channel = CHANNEL_OF[rule.action_id];
  if (!channel || !rule.message) return [];

  const kind = KIND_OF[rule.trigger_id] ?? "custom";
  const base = {
    business_id: rule.business_id,
    automation_id: rule.id,
    kind,
    channel,
  };

  switch (rule.trigger_id) {
    /* Randevudan N saat önce ------------------------------------- */
    case "randevu_oncesi": {
      const hours = rule.trigger_param ?? 24;
      // Cron günde bir çalıştığı için, önümüzdeki 24 saatlik pencerede
      // başlayan ve hatırlatma zamanı geçmiş olan randevular alınır.
      const windowEnd = new Date(now.getTime() + DAY);

      const { data } = await admin
        .from("appointments")
        .select("id, starts_at, customer_id, customers(full_name)")
        .eq("business_id", rule.business_id)
        .eq("status", "scheduled")
        .gte("starts_at", now.toISOString())
        .lte("starts_at", windowEnd.toISOString());

      return (data ?? []).flatMap((a) => {
        const row = a as {
          id: string;
          starts_at: string;
          customer_id: string | null;
          customers: { full_name: string } | { full_name: string }[] | null;
        };
        if (!row.customer_id) return [];
        const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        const sendAt = new Date(
          new Date(row.starts_at).getTime() - hours * 3_600_000
        );
        // Hatırlatma zamanı henüz gelmediyse bir sonraki tura bırak.
        if (sendAt.getTime() > now.getTime()) return [];
        return [{
          ...base,
          customer_id: row.customer_id,
          body: fillTemplate(rule.message!, cust?.full_name ?? ""),
          scheduled_at: sendAt.toISOString(),
          related_type: "appointment",
          related_id: row.id,
        }];
      });
    }

    /* Doğum günü -------------------------------------------------- */
    case "dogum_gunu": {
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");

      const { data } = await admin
        .from("customers")
        .select("id, full_name, birthday")
        .eq("business_id", rule.business_id)
        .not("birthday", "is", null);

      return (data ?? []).flatMap((c) => {
        const row = c as { id: string; full_name: string; birthday: string };
        // birthday "YYYY-MM-DD"; yıl önemsiz, ay-gün eşleşmeli.
        if (row.birthday.slice(5) !== `${mm}-${dd}`) return [];
        return [{
          ...base,
          customer_id: row.id,
          body: fillTemplate(rule.message!, row.full_name),
          scheduled_at: now.toISOString(),
        }];
      });
    }

    /* Uzun süredir gelmeyen müşteri -------------------------------- */
    case "pasif_musteri": {
      const days = rule.trigger_param ?? 60;
      const cutoff = new Date(now.getTime() - days * DAY);

      const { data } = await admin
        .from("customers")
        .select("id, full_name, last_visit_at")
        .eq("business_id", rule.business_id)
        .eq("is_lead", false)
        .not("last_visit_at", "is", null)
        .lte("last_visit_at", cutoff.toISOString());

      return (data ?? []).map((c) => {
        const row = c as { id: string; full_name: string };
        return {
          ...base,
          customer_id: row.id,
          body: fillTemplate(rule.message!, row.full_name),
          scheduled_at: now.toISOString(),
        };
      });
    }

    /* Paket bitmek üzere ------------------------------------------- */
    case "paket_bitiyor": {
      const left = rule.trigger_param ?? 1;

      const { data } = await admin
        .from("packages")
        .select("id, customer_id, remaining_sessions, customers(full_name)")
        .eq("business_id", rule.business_id)
        .gt("remaining_sessions", 0)
        .lte("remaining_sessions", left);

      return (data ?? []).flatMap((p) => {
        const row = p as {
          id: string;
          customer_id: string | null;
          customers: { full_name: string } | { full_name: string }[] | null;
        };
        if (!row.customer_id) return [];
        const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        return [{
          ...base,
          customer_id: row.customer_id,
          body: fillTemplate(rule.message!, cust?.full_name ?? ""),
          scheduled_at: now.toISOString(),
          related_type: "package",
          related_id: row.id,
        }];
      });
    }

    /* Ödeme geciktiğinde ------------------------------------------- */
    case "odeme_gecikti": {
      const days = rule.trigger_param ?? 7;
      const cutoff = new Date(now.getTime() - days * DAY);

      // Borcu olan paketler: ödenen tutar toplam tutarın altındaysa.
      const { data } = await admin
        .from("packages")
        .select("id, customer_id, total_amount, paid_amount, created_at, customers(full_name)")
        .eq("business_id", rule.business_id)
        .lte("created_at", cutoff.toISOString());

      return (data ?? []).flatMap((p) => {
        const row = p as {
          id: string;
          customer_id: string | null;
          total_amount: number | null;
          paid_amount: number | null;
          customers: { full_name: string } | { full_name: string }[] | null;
        };
        const debt = (row.total_amount ?? 0) - (row.paid_amount ?? 0);
        if (debt <= 0 || !row.customer_id) return [];
        const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        return [{
          ...base,
          customer_id: row.customer_id,
          body: fillTemplate(rule.message!, cust?.full_name ?? ""),
          scheduled_at: now.toISOString(),
          related_type: "package",
          related_id: row.id,
        }];
      });
    }

    default:
      return [];
  }
}

/**
 * Tüm aktif kuralları tarar ve üretilen hatırlatmaları kuyruğa yazar.
 * Döndürdüğü sayı, gerçekten eklenen (mükerrer olmayan) satır sayısıdır.
 */
export async function planAutomations(
  admin: SupabaseClient,
  now = new Date()
): Promise<{ planned: number; rules: number }> {
  const { data, error } = await admin
    .from("automations")
    .select("id, business_id, trigger_id, trigger_param, action_id, message")
    .eq("active", true)
    .in("trigger_id", PLANNABLE as unknown as string[]);

  if (error) {
    console.error("planAutomations select:", error);
    return { planned: 0, rules: 0 };
  }

  const rules = (data ?? []) as Rule[];
  let planned = 0;

  for (const rule of rules) {
    let items: PlannedReminder[] = [];
    try {
      items = await planRule(admin, rule, now);
    } catch (e) {
      console.error(`planAutomations rule ${rule.id}:`, e);
      continue;
    }
    if (items.length === 0) continue;

    // ignoreDuplicates: mükerrer indeks ihlalleri sessizce atlanır,
    // yeni olanlar eklenir.
    const { data: inserted, error: insErr } = await admin
      .from("reminders")
      .upsert(items, {
        onConflict: "automation_id,customer_id,scheduled_at",
        ignoreDuplicates: true,
      })
      .select("id");

    if (insErr) {
      console.error(`planAutomations insert ${rule.id}:`, insErr);
      continue;
    }

    planned += inserted?.length ?? 0;

    await admin
      .from("automations")
      .update({ last_run_at: now.toISOString() })
      .eq("id", rule.id);
  }

  return { planned, rules: rules.length };
}
