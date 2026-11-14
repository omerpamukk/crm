import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/messaging/send";
import { firstName, isQuietHour, planAutomations } from "@/lib/automations/plan";

/**
 * Zamanlanmış hatırlatma gönderimi.
 *
 * Saatte bir çağrılır: Supabase pg_cron (0034_saatlik_cron.sql) ya da Vercel
 * Pro'da vercel.json. Vercel Hobby günde yalnızca bir cron'a izin verdiği
 * için vercel.json'daki günlük tur yedek olarak kalır.
 *
 * Önce kurallardan hatırlatma planlanır, sonra vadesi gelen kuyruk
 * gönderilir. İşletme saatiyle 09:00–21:00 dışında hiçbir şey gönderilmez;
 * bekleyen kayıtlar sabah ilk turda gider.
 *
 * Elle tetiklemek için:
 *   curl -H "Authorization: Bearer $CRON_SECRET" <alan-adı>/api/cron/reminders
 *
 * Güvenlik: CRON_SECRET tanımlıysa Authorization başlığı doğrulanır.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tek turda işlenecek en fazla kayıt; maxDuration 60 sn'ye sığacak kadar. */
const BATCH = 200;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
  }

  const now = new Date();
  if (isQuietHour(now)) {
    return NextResponse.json({ quiet: true, planned: 0, processed: 0, sent: 0, failed: 0 });
  }

  const admin = createAdminClient();
  const { planned } = await planAutomations(admin, now, { baseUrl: request.nextUrl.origin });

  const { data, error } = await admin
    .from("reminders")
    .select("id, business_id, customer_id, channel, body, kind, automation_id, automations(wa_template, wa_template_lang)")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(BATCH);

  if (error) {
    console.error("cron/reminders select:", error);
    return NextResponse.json({ error: "Kuyruk okunamadı" }, { status: 500 });
  }

  type Row = {
    id: string;
    business_id: string;
    customer_id: string | null;
    channel: "sms" | "email" | "whatsapp";
    body: string | null;
    kind: string;
    automation_id: string | null;
    automations:
      | { wa_template: string | null; wa_template_lang: string | null }
      | { wa_template: string | null; wa_template_lang: string | null }[]
      | null;
  };

  const rows = (data ?? []) as Row[];
  let sent = 0;
  let failed = 0;

  for (const r of rows) {
    // Alıcı adresini müşteriden al
    let to: string | null = null;
    let name = "";
    if (r.customer_id) {
      const { data: c } = await admin
        .from("customers")
        .select("phone, email, full_name")
        .eq("id", r.customer_id)
        .maybeSingle();
      const cust = c as { phone: string | null; email: string | null; full_name: string | null } | null;
      to = r.channel === "email" ? cust?.email ?? null : cust?.phone ?? null;
      name = cust?.full_name ?? "";
    }

    const rule = Array.isArray(r.automations) ? r.automations[0] : r.automations;
    const template =
      r.channel === "whatsapp" && rule?.wa_template
        ? { name: rule.wa_template, language: rule.wa_template_lang || "tr", params: name ? [firstName(name)] : [] }
        : undefined;

    if (!to || !r.body) {
      await admin
        .from("reminders")
        .update({ status: "failed", error: "Alıcı veya mesaj eksik." })
        .eq("id", r.id);
      failed++;
      continue;
    }

    const result = await sendMessage({
      businessId: r.business_id,
      channel: r.channel,
      to,
      body: r.body,
      subject: "Hatırlatma",
      customerId: r.customer_id,
      template,
    });

    await admin
      .from("reminders")
      .update(
        result.ok
          ? { status: "sent", sent_at: new Date().toISOString(), error: null }
          : { status: "failed", error: result.error ?? "Gönderilemedi" }
      )
      .eq("id", r.id);

    if (result.ok) sent++;
    else failed++;
  }

  return NextResponse.json({ planned, processed: rows.length, sent, failed });
}
