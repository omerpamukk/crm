import { createAdminClient } from "@/lib/supabase/admin";
import { netgsmProvider } from "./sms";
import { resendProvider } from "./email";
import { whatsappProvider } from "./whatsapp";
import type { Channel, Provider, SendResult } from "./types";

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
    { to: params.to, body: params.body, subject: params.subject },
    row.credentials ?? {}
  );

  await log(result.ok ? "sent" : "failed", result.providerId, result.error);
  return result;
}
