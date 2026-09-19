import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import type { Business, Subscription } from "@/types/database";

import { SettingsView, type SettingsData } from "./settings-view";
import type { WorkingDay } from "./schema";

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

function readDays(raw: unknown): WorkingDay[] {
  const days = (raw as { days?: unknown } | null)?.days;
  if (!Array.isArray(days) || days.length !== 7) return DEFAULT_DAYS;
  return days as WorkingDay[];
}

export default async function AyarlarPage() {
  const { fullName, email, roleLabel } = await requireCapability("ayarlar");

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  const [bizRes, subRes, profileRes, logRes] = await Promise.all([
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
  ]);

  const biz = bizRes.data as Partial<Business> | null;
  const profile = profileRes.data as { full_name: string | null; phone: string | null } | null;

  const data: SettingsData = {
    business: {
      name: biz?.name ?? "",
      sector: biz?.sector ?? "",
      phone: biz?.phone ?? "",
      email: biz?.email ?? "",
      address: biz?.address ?? "",
    },
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
    auditLog: (logRes.data ?? []) as SettingsData["auditLog"],
  };

  return <SettingsView data={data} />;
}
