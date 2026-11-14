import { isModuleEnabled } from "@/lib/modules";
import { cookies } from "next/headers";

import { getAccountContext } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { AppShell } from "@/components/layout/app-shell";
import type { AppNotification } from "@/components/layout/notifications";
import { SIDEBAR_GROUPS_COOKIE, SIDEBAR_HIDDEN_COOKIE } from "@/components/layout/shell-cookies";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fullName, email, businessName, roleLabel, role, impersonating, manageMode } =
    await getAccountContext();
  const displayName = fullName ?? email ?? "Kullanıcı";

  // Kenar çubuğu tercihleri çerezde: sunucu doğru durumla çizer, sıçrama olmaz.
  const cookieStore = await cookies();
  const sidebarHidden = cookieStore.get(SIDEBAR_HIDDEN_COOKIE)?.value === "1";
  const collapsedGroups = (cookieStore.get(SIDEBAR_GROUPS_COOKIE)?.value ?? "")
    .split(",")
    .filter(Boolean);

  // Menü rozetleri tek RPC ile gelir (0022_search_perf.sql).
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  const [{ data: badgeData, error: badgeError }, notifRes, bizRes] = await Promise.all([
    supabase.rpc("sidebar_badges"),
    // Kalıcı bildirimler (0023). Okunmamışlar; tablo yoksa sessizce boş.
    supabase
      .from("notifications")
      .select("id, kind, title, detail, href")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    // Açık modüller (0036). Sütun yoksa ya da okunamazsa hepsi açık sayılır.
    businessId
      ? supabase.from("businesses").select("enabled_modules").eq("id", businessId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const modules = (bizRes.data as { enabled_modules: string[] | null } | null)?.enabled_modules ?? null;

  if (badgeError) console.error("sidebar_badges:", badgeError);

  const b = (badgeData ?? {}) as {
    overdueCari?: number; todayAppts?: number; upcomingAppts?: number;
    customers?: number; leads?: number;
  };

  const overdueCari = b.overdueCari ?? 0;
  const todayAppts = b.todayAppts ?? 0;

  // Gerçek sistem-içi bildirimler (dış servis değil, kendi verinden)
  const notifications: AppNotification[] = [];
  if (todayAppts > 0) {
    notifications.push({ id: "n-appt", icon: "appointment", title: `Bugün ${todayAppts} randevu`, detail: "Günün programını kontrol et", href: "/randevular" });
  }
  if (overdueCari > 0 && isModuleEnabled(modules, "cari")) {
    notifications.push({ id: "n-debt", icon: "debt", title: `${overdueCari} müşteride gecikmiş ödeme`, detail: "Cari hesabı incele ve hatırlat", href: "/cari" });
  }

  // Kalıcı bildirimler (okundu işaretlenebilir; id'leri "db-" ile başlar)
  const KIND_ICON: Record<string, AppNotification["icon"]> = {
    appointment: "appointment", debt: "debt", birthday: "birthday",
    opportunity: "opportunity", stock: "opportunity", task: "appointment",
    review: "opportunity", system: "opportunity",
  };
  for (const n of (notifRes.data ?? []) as {
    id: string; kind: string; title: string; detail: string | null; href: string | null;
  }[]) {
    notifications.push({
      id: `db-${n.id}`,
      icon: KIND_ICON[n.kind] ?? "opportunity",
      title: n.title,
      detail: n.detail ?? "",
      href: n.href ?? "/panel",
    });
  }

  const badges = { overdueCari };

  // Menüde gösterilen kayıt sayıları
  const counts: Record<string, number> = {
    "/musteriler": b.customers ?? 0,
    "/leadler": b.leads ?? 0,
    "/takvim": b.upcomingAppts ?? 0,
  };

  return (
    <AppShell
      businessName={businessName}
      displayName={displayName}
      roleLabel={roleLabel}
      role={role}
      modules={modules}
      badges={badges}
      counts={counts}
      notifications={notifications}
      impersonating={impersonating}
      manageMode={manageMode}
      initialSidebarHidden={sidebarHidden}
      initialCollapsedGroups={collapsedGroups}
    >
      {children}
    </AppShell>
  );
}
