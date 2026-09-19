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
  const [{ data: badgeData, error: badgeError }, notifRes] = await Promise.all([
    supabase.rpc("sidebar_badges"),
    // Kalıcı bildirimler (0023). Okunmamışlar; tablo yoksa sessizce boş.
    supabase
      .from("notifications")
      .select("id, kind, title, detail, href")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

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

  // Menüde gösterilen kayıt sayıları (referans arayüzdeki gibi)
  const counts: Record<string, number> = {
    "/musteriler": b.customers ?? 0,
    "/leadler": b.leads ?? 0,
    "/randevular": b.upcomingAppts ?? 0,
  };

  return (
    <div className="flex min-h-svh bg-background">
      {/* Klavye kullanıcısı 8 bölümlü menüyü her sayfada geçmek zorunda kalmasın */}
      <a
        href="#icerik"
        className="focus-ring sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-soft-lg"
      >
        İçeriğe geç
      </a>

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

        <main id="icerik" tabIndex={-1} className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="page-shell">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
