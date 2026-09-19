import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/messaging/send";

/**
 * Zamanlanmış hatırlatma gönderimi.
 *
 * Vercel Cron tarafından çağrılır (vercel.json). Vadesi gelmiş
 * `reminders` kayıtlarını alır, gönderir ve sonucu işler.
 *
 * ⚠️ Hobby planı günde YALNIZCA BİR cron çalıştırmaya izin veriyor;
 * bu yüzden günlük tek tur (05:00 UTC = 08:00 TR). Daha sık gönderim
 * gerekirse Pro plana geçilmeli — o zaman vercel.json'daki ifade
 * 15 dakikalık aralığa çekilebilir.
 *
 * Günde tek tur çalıştığı için bu uç nokta elle de tetiklenebilir:
 *   curl -H "Authorization: Bearer $CRON_SECRET" <alan-adı>/api/cron/reminders
 *
 * Güvenlik: CRON_SECRET tanımlıysa Authorization başlığı doğrulanır.
 * Vercel Cron bu başlığı otomatik ekler.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tek turda işlenecek en fazla kayıt. Günde tek tur çalıştığımız için
 * günün tamamını kapsayacak kadar geniş; maxDuration 60sn'ye sığması
 * gözetilerek sınırlı tutuldu.
 */
const BATCH = 200;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("reminders")
    .select("id, business_id, customer_id, channel, body, kind")
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
  };

  const rows = (data ?? []) as Row[];
  let sent = 0;
  let failed = 0;

  for (const r of rows) {
    // Alıcı adresini müşteriden al
    let to: string | null = null;
    if (r.customer_id) {
      const { data: c } = await admin
        .from("customers")
        .select("phone, email")
        .eq("id", r.customer_id)
        .maybeSingle();
      const cust = c as { phone: string | null; email: string | null } | null;
      to = r.channel === "email" ? cust?.email ?? null : cust?.phone ?? null;
    }

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

  return NextResponse.json({ processed: rows.length, sent, failed });
}
