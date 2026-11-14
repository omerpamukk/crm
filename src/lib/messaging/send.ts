import { createAdminClient } from "@/lib/supabase/admin";
import { netgsmProvider, sendNetgsmBatch } from "./sms";
import { resendProvider } from "./email";
import { whatsappProvider } from "./whatsapp";
import type { Channel, Provider, SendResult, WhatsAppTemplate } from "./types";

const PROVIDERS: Record<Channel, Provider> = {
  sms: netgsmProvider,
  email: resendProvider,
  whatsapp: whatsappProvider,
};

/** integrations.provider değeri ↔ kanal eşlemesi. */
const PROVIDER_KEY: Record<Channel, string> = {
  sms: "sms",
  email: "smtp",
  whatsapp: "whatsapp",
};

/**
 * Tek giriş noktası: kimlik bilgisini okur, gönderir, message_log'a yazar.
 *
 * ⚠️ YALNIZCA SUNUCU TARAFI. Bu modül `createAdminClient()` (service_role)
 * kullanır ve integrations.credentials okur — asla bir istemci bileşeninden
 * import edilmemeli. Cron (oturumsuz) da bu yolu kullandığı için
 * service_role gerekiyor.
 */
export async function sendMessage(params: {
  businessId: string;
  channel: Channel;
  to: string;
  body: string;
  subject?: string;
  customerId?: string | null;
  template?: WhatsAppTemplate;
}): Promise<SendResult> {
  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("credentials, status")
    .eq("business_id", params.businessId)
    .eq("provider", PROVIDER_KEY[params.channel])
    .maybeSingle();

  const row = integration as { credentials: Record<string, string>; status: string } | null;

  async function log(status: string, providerId?: string, error?: string) {
    await admin.from("message_log").insert({
      business_id: params.businessId,
      customer_id: params.customerId ?? null,
      channel: params.channel,
      direction: "out",
      to_addr: params.to,
      subject: params.subject ?? null,
      body: params.body,
      status,
      provider_id: providerId ?? null,
      error: error ?? null,
    });
  }

  if (!row || row.status !== "connected") {
    const error = "Bu kanal henüz bağlanmamış.";
    await log("failed", undefined, error);
    return { ok: false, error };
  }

  const result = await PROVIDERS[params.channel].send(
    { to: params.to, body: params.body, subject: params.subject, template: params.template },
    row.credentials ?? {}
  );

  await log(result.ok ? "sent" : "failed", result.providerId, result.error);
  return result;
}

/** Toplu SMS'te tek istekteki en fazla mesaj. */
const BATCH = 100;

export type BulkItem = { to: string; body: string; customerId: string | null };
export type BulkOutcome = { to: string; ok: boolean; error?: string };

/**
 * Toplu SMS: kimlik bilgisini bir kez okur, 100'erli parçalar halinde
 * gönderir, her alıcıyı message_log'a yazar. `to` normalize edilmiş olmalı.
 *
 * ⚠️ YALNIZCA SUNUCU TARAFI (service_role, credentials).
 */
export async function sendBulkSms(
  businessId: string,
  items: BulkItem[]
): Promise<{ connected: boolean; outcomes: BulkOutcome[] }> {
  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("integrations")
    .select("credentials, status")
    .eq("business_id", businessId)
    .eq("provider", PROVIDER_KEY.sms)
    .maybeSingle();
  const row = integration as { credentials: Record<string, string>; status: string } | null;
  if (!row || row.status !== "connected") return { connected: false, outcomes: [] };

  const outcomes: BulkOutcome[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    const result = await sendNetgsmBatch(
      chunk.map((m) => ({ no: m.to, msg: m.body })),
      row.credentials ?? {}
    );
    for (const m of chunk) outcomes.push({ to: m.to, ok: result.ok, error: result.error });
    const { error: logError } = await admin.from("message_log").insert(
      chunk.map((m) => ({
        business_id: businessId,
        customer_id: m.customerId,
        channel: "sms",
        direction: "out",
        to_addr: m.to,
        body: m.body,
        status: result.ok ? "sent" : "failed",
        provider_id: result.providerId ?? null,
        error: result.error ?? null,
      }))
    );
    if (logError) console.error("sendBulkSms log:", logError);
  }
  return { connected: true, outcomes };
}

/** SMS kanalı bağlı mı (kimlik bilgisi okunmadan). */
export async function isSmsConnected(businessId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("integrations")
      .select("status")
      .eq("business_id", businessId)
      .eq("provider", PROVIDER_KEY.sms)
      .maybeSingle();
    return (data as { status: string } | null)?.status === "connected";
  } catch (error) {
    console.error("isSmsConnected:", error);
    return false;
  }
}
