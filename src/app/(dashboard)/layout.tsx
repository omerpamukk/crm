import { getAccountContext } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar, type AppNotification } from "@/components/layout/top-bar";
import { ViewAsBanner } from "@/components/layout/view-as-banner";
import { PageTransition } from "@/components/layout/page-transition";
import { PageTitleBar } from "@/components/layout/page-title-bar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fullName, email, businessName, roleLabel, role, impersonating, manageMode } =
    await getAccountContext();
  const displayName = fullName ?? email ?? "Kullanıcı";

  // Menü rozetleri tek RPC ile gelir (0022_search_perf.sql).
  // Önceden burada HER SAYFA GEZİNTİSİNDE packages tablosunun tamamı
  // çekilip JS'te borç hesaplanıyordu; artık hesap DB'de yapılıyor.
  const supabase = await createClient();
  const { data: badgeData, error: badgeError } = await supabase.rpc("sidebar_badges");

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
  if (overdueCari > 0) {
    notifications.push({ id: "n-debt", icon: "debt", title: `${overdueCari} müşteride gecikmiş ödeme`, detail: "Cari hesabı incele ve hatırlat", href: "/cari" });
  }

  const badges = { overdueCari };

  // Menüde gösterilen kayıt sayıları (referans arayüzdeki gibi)
  const counts: Record<string, number> = {
    "/musteriler": b.customers ?? 0,
    "/leadler": b.leads ?? 0,
    "/randevular": b.upcomingAppts ?? 0,
  };

  return (
    <div className="flex min-h-svh bg-background">
      {/* Masaüstü: ikon şeridi + açılır bölüm paneli (sticky, tam boy) */}
      <aside className="sticky top-0 hidden h-svh shrink-0 md:block">
        <SidebarNav
          businessName={businessName}
          displayName={displayName}
          roleLabel={roleLabel}
          role={role}
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
              role={role}
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
