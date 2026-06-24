import { getAccountContext } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { DEMO_UNREAD_TOTAL } from "./mesajlar/demo-data";

const DAY = 86_400_000;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fullName, email, businessName, roleLabel } =
    await getAccountContext();
  const displayName = fullName ?? email ?? "Kullanıcı";

  // Menü rozeti: gecikmiş (30 gün+) ödemesi olan müşteri sayısı
  const supabase = await createClient();
  const { data: pkgs } = await supabase
    .from("packages")
    .select("customer_id, price, paid_amount, purchased_at");
  const now = new Date().getTime();
  const overdue = new Set<string>();
  for (const p of (pkgs ?? []) as {
    customer_id: string | null; price: number | null; paid_amount: number | null; purchased_at: string | null;
  }[]) {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (p.customer_id && debt > 0 && p.purchased_at && now - new Date(p.purchased_at).getTime() > 30 * DAY) {
      overdue.add(p.customer_id);
    }
  }
  // msgAll: omnichannel gelen kutusu okunmamış sayısı (şimdilik DEMO)
  const badges = { overdueCari: overdue.size, msgAll: DEMO_UNREAD_TOTAL };

  return (
    <div className="flex min-h-svh">
      {/* Masaüstü yan menü (sticky, tam boy) */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r md:block">
        <SidebarNav
          businessName={businessName}
          displayName={displayName}
          roleLabel={roleLabel}
          badges={badges}
        />
      </aside>

      {/* İçerik */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Üst bar yalnızca mobilde */}
        <header className="flex h-16 items-center gap-2 border-b bg-card px-4 md:hidden">
          <MobileNav
            businessName={businessName}
            displayName={displayName}
            roleLabel={roleLabel}
            badges={badges}
          />
          <span className="font-semibold">{businessName}</span>
        </header>

        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
