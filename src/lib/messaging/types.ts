/** Mesajlaşma katmanı ortak tipleri (0023_integrations.sql). */

export type Channel = "sms" | "email" | "whatsapp";

export interface SendRequest {
  to: string;
  body: string;
  /** Yalnızca e-posta için. */
  subject?: string;
  /**
   * Yalnızca WhatsApp için: Meta onaylı şablon. Verilirse `body` yerine
   * şablon gönderilir; `params` şablon gövdesindeki {{1}}, {{2}}… değerleridir.
   */
  template?: WhatsAppTemplate;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  params: string[];
}

export interface SendResult {
  ok: boolean;
  /** Sağlayıcının verdiği mesaj kimliği (teslim takibi için). */
  providerId?: string;
  error?: string;
}

/**
 * Bir sağlayıcının kimlik bilgileri.
 * integrations.credentials (jsonb) içinden gelir; asla client'a gönderilmez.
 */
export type Credentials = Record<string, string>;

export interface Provider {
  channel: Channel;
  send(req: SendRequest, creds: Credentials): Promise<SendResult>;
}
