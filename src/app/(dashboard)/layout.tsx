import { getAccountContext } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar, type AppNotification } from "@/components/layout/top-bar";
import { ViewAsBanner } from "@/components/layout/view-as-banner";
import { PageTransition } from "@/components/layout/page-transition";
import { PageTitleBar } from "@/components/layout/page-title-bar";
import { Toaster } from "@/components/ui/sonner";

const DAY = 86_400_000;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fullName, email, businessName, roleLabel, impersonating, manageMode } =
    await getAccountContext();
  const displayName = fullName ?? email ?? "Kullanıcı";

  // Menü rozeti: gecikmiş (30 gün+) ödemesi olan müşteri sayısı
  const supabase = await createClient();
  const nowDate = new Date();
  const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [pkgsRes, todayApptRes, customersRes, leadsRes, upcomingApptRes] =
    await Promise.all([
      supabase.from("packages").select("customer_id, price, paid_amount, purchased_at"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "planned")
        .gte("starts_at", startOfToday.toISOString())
        .lt("starts_at", endOfToday.toISOString()),
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("is_lead", false),
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("is_lead", true),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "planned")
        .gte("starts_at", nowDate.toISOString()),
    ]);

  const now = nowDate.getTime();
  const overdue = new Set<string>();
  for (const p of (pkgsRes.data ?? []) as {
    customer_id: string | null; price: number | null; paid_amount: number | null; purchased_at: string | null;
  }[]) {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (p.customer_id && debt > 0 && p.purchased_at && now - new Date(p.purchased_at).getTime() > 30 * DAY) {
      overdue.add(p.customer_id);
    }
  }

  // Gerçek sistem-içi bildirimler (dış servis değil, kendi verinden)
  const todayAppts = todayApptRes.count ?? 0;
  const notifications: AppNotification[] = [];
  if (todayAppts > 0) {
    notifications.push({ id: "n-appt", icon: "appointment", title: `Bugün ${todayAppts} randevu`, detail: "Günün programını kontrol et", href: "/randevular" });
  }
  if (overdue.size > 0) {
    notifications.push({ id: "n-debt", icon: "debt", title: `${overdue.size} müşteride gecikmiş ödeme`, detail: "Cari hesabı incele ve hatırlat", href: "/cari" });
  }

  // Yalnızca gerçek veriden gelen rozet: gecikmiş ödemeli müşteri sayısı
  const badges = { overdueCari: overdue.size };

  // Menüde gösterilen kayıt sayıları (referans arayüzdeki gibi)
  const counts: Record<string, number> = {
    "/musteriler": customersRes.count ?? 0,
    "/leadler": leadsRes.count ?? 0,
    "/randevular": upcomingApptRes.count ?? 0,
  };

  return (
    <div className="flex min-h-svh bg-background">
      {/* Masaüstü: ikon şeridi + açılır bölüm paneli (sticky, tam boy) */}
      <aside className="sticky top-0 hidden h-svh shrink-0 md:block">
        <SidebarNav
          businessName={businessName}
          displayName={displayName}
          roleLabel={roleLabel}
          badges={badges}
          counts={counts}
        />
      </aside>

      {/* İçerik */}
      <div className="flex min-w-0 flex-1 flex-col">
        {impersonating && <ViewAsBanner businessName={businessName} manageMode={manageMode} />}
        {/* Üst bar — masaüstünde arama + bildirim, mobilde hamburger + bildirim */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:gap-5 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav
              businessName={businessName}
              displayName={displayName}
              roleLabel={roleLabel}
              badges={badges}
              counts={counts}
            />
            <span className="truncate font-semibold">{businessName}</span>
          </div>
          <PageTitleBar />
          <TopBar notifications={notifications} />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="page-shell">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
