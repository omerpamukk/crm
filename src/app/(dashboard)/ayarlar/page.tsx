import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import type { Business, Subscription } from "@/types/database";

import { zonedParts } from "@/lib/zaman";

import { SettingsView, type SettingsData } from "./settings-view";
import { NOTIF_KEYS, type WorkingDay, type NotificationSettingInput } from "./schema";

export const metadata = { title: "Ayarlar" };

/** Varsayılan hafta: Pzt–Cum 09:00–18:00, Cmt 10:00–16:00, Paz kapalı. */
const DEFAULT_DAYS: WorkingDay[] = [
  { day: 1, open: true, start: "09:00", end: "18:00" },
  { day: 2, open: true, start: "09:00", end: "18:00" },
  { day: 3, open: true, start: "09:00", end: "18:00" },
  { day: 4, open: true, start: "09:00", end: "18:00" },
  { day: 5, open: true, start: "09:00", end: "18:00" },
  { day: 6, open: true, start: "10:00", end: "16:00" },
  { day: 7, open: false, start: "10:00", end: "16:00" },
];

/**
 * Bildirim tercihlerinin varsayılanı. Kullanıcı hiç kaydetmediyse tablo boş
 * gelir; UI'ın her anahtar için bir satır göstermesi gerektiğinden burada
 * DB'den geleni varsayılanın üzerine bindiriyoruz.
 */
const DEFAULT_NOTIFS: Record<string, Omit<NotificationSettingInput, "key">> = {
  yeni_lead: { enabled: true, channels: ["panel"], recipient_roles: ["owner", "reception"], send_at: null },
  gecikmis_odeme: { enabled: true, channels: ["panel"], recipient_roles: ["owner"], send_at: null },
  randevu_hatirlatma: { enabled: true, channels: ["panel"], recipient_roles: ["owner", "reception"], send_at: null },
  gorev_deadline: { enabled: true, channels: ["panel"], recipient_roles: ["owner", "reception"], send_at: null },
  yeni_yorum: { enabled: false, channels: ["panel"], recipient_roles: ["owner"], send_at: null },
  kritik_stok: { enabled: true, channels: ["panel"], recipient_roles: ["owner"], send_at: null },
  sabah_ozeti: { enabled: false, channels: [], recipient_roles: ["owner"], send_at: "09:00" },
  gun_sonu_ozeti: { enabled: false, channels: [], recipient_roles: ["owner"], send_at: "20:00" },
};

function readNotifs(rows: unknown): NotificationSettingInput[] {
  const saved = new Map<string, Partial<NotificationSettingInput>>();
  for (const r of (rows ?? []) as NotificationSettingInput[]) saved.set(r.key, r);

  return NOTIF_KEYS.map((key) => {
    const row = saved.get(key);
    const base = DEFAULT_NOTIFS[key];
    return {
      key,
      enabled: row?.enabled ?? base.enabled,
      channels: row?.channels ?? base.channels,
      recipient_roles: row?.recipient_roles ?? base.recipient_roles,
      send_at: row?.send_at ?? base.send_at,
    };
  });
}

function readDays(raw: unknown): WorkingDay[] {
  const days = (raw as { days?: unknown } | null)?.days;
  if (!Array.isArray(days) || days.length !== 7) return DEFAULT_DAYS;
  return days as WorkingDay[];
}

/** Aboneliğin bitmesine kaç gün var? İstanbul gününe göre; süresizse null. */
function daysUntil(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime();
  if (Number.isNaN(ms)) return null;
  const a = zonedParts(ms);
  const b = zonedParts(Date.now());
  return Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86_400_000);
}

export default async function AyarlarPage() {
  const { fullName, email, roleLabel } = await requireCapability("ayarlar");

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  const [bizRes, subRes, profileRes, logRes, notifRes, integRes, modRes, extraRes] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, sector, phone, email, address, logo_url, working_hours")
      .eq("id", businessId ?? "")
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan, status, price, started_at, expires_at")
      .eq("business_id", businessId ?? "")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle(),
    // İşletme içi denetim kaydı (0017). Tablo yoksa sessizce boş döner.
    supabase
      .from("business_audit_log")
      .select("id, created_at, actor_label, action, entity, summary")
      .order("created_at", { ascending: false })
      .limit(50),
    // Bildirim tercihleri (0023).
    supabase
      .from("notification_settings")
      .select("key, enabled, channels, recipient_roles, send_at")
      .eq("business_id", businessId ?? ""),
    // Entegrasyonlar (0023).
    // ⚠️ credentials ASLA seçilmez — client bileşenine gidiyor.
    supabase
      .from("integrations")
      .select("provider, status, account_label, last_error, connected_at")
      .eq("business_id", businessId ?? ""),
    // Açık modüller (0036). Ayrı sorgu: sütun yoksa yalnızca bu bölüm etkilenir.
    supabase.from("businesses").select("enabled_modules").eq("id", businessId ?? "").maybeSingle(),
    // Sadakat kartı + herkese açık sayfa (0040). Ayrı sorgu: sütunlar yoksa bölümler gizlenir.
    supabase
      .from("businesses")
      .select("slug, profile_public, profile_about, loyalty_target, loyalty_reward, loyalty_notify_before")
      .eq("id", businessId ?? "")
      .maybeSingle(),
  ]);

  if (bizRes.error) console.error("ayarlar:", bizRes.error);
  const biz = bizRes.data as Partial<Business> | null;
  const profile = profileRes.data as { full_name: string | null; phone: string | null } | null;

  const data: SettingsData = {
    business: {
      name: biz?.name ?? "",
      sector: biz?.sector ?? "",
      phone: biz?.phone ?? "",
      email: biz?.email ?? "",
      address: biz?.address ?? "",
      logo_url: biz?.logo_url ?? null,
    },
    businessId: businessId ?? "",
    owner: {
      full_name: profile?.full_name ?? fullName ?? "",
      phone: profile?.phone ?? "",
      email: email ?? "",
      roleLabel,
    },
    workingDays: readDays(biz?.working_hours),
    subscription: (subRes.data as Pick<
      Subscription,
      "plan" | "status" | "price" | "started_at" | "expires_at"
    > | null) ?? null,
    daysLeft: daysUntil((subRes.data as { expires_at: string | null } | null)?.expires_at),
    auditLog: (logRes.data ?? []) as SettingsData["auditLog"],
    notifications: readNotifs(notifRes.data),
    integrations: (integRes.data ?? []) as SettingsData["integrations"],
    modules: modRes.error
      ? null
      : ((modRes.data as { enabled_modules: string[] | null } | null)?.enabled_modules ?? null),
    modulesReady: !modRes.error,
    extras: extraRes.error
      ? null
      : (() => {
          const x = (extraRes.data ?? {}) as {
            slug?: string | null; profile_public?: boolean; profile_about?: string | null;
            loyalty_target?: number | null; loyalty_reward?: string | null; loyalty_notify_before?: number | null;
          };
          return {
            profile: { enabled: Boolean(x.profile_public), slug: x.slug ?? "", about: x.profile_about ?? "" },
            loyalty: { target: x.loyalty_target ?? null, reward: x.loyalty_reward ?? "", notifyBefore: x.loyalty_notify_before ?? null },
          };
        })(),
  };

  return <SettingsView data={data} loadFailed={Boolean(bizRes.error) || !biz} />;
}
