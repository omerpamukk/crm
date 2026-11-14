import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext, getActingSession } from "@/lib/supabase/admin-context";
import { getAdminNotifications } from "@/lib/supabase/notifications";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/layout/account-menu";

import { exitViewAs } from "./view-as-actions";
import { AdminUserMenu } from "./admin-logout";
import { AdminNotifications } from "./admin-notifications";
import { AdminNav } from "./admin-nav";

/**
 * Süper-admin (ajans) paneli kabuğu.
 * GÜVENLİK: yalnızca platform_admins içindeki kullanıcılar erişebilir.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) redirect("/panel");
  const ctx = await getAdminContext();
  const actingError = (await cookies()).get("acting_error")?.value === "1";
  const acting = await getActingSession(supabase);
  let actingName: string | null = null;
  if (acting) {
    const { data: b } = await supabase.from("businesses").select("name").eq("id", acting.businessId).maybeSingle();
    actingName = (b as { name: string } | null)?.name ?? "Firma";
  }
  const notifications = await getAdminNotifications(!!ctx?.isOwner);

  return (
    <div className="min-h-svh">
      <div aria-hidden className="app-wall" />
      <header className="glass sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:h-16">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/admin" className="focus-ring flex min-w-0 items-center gap-2.5 rounded-lg">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-fill text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-semibold text-label">Yönetim</span>
                <span className="hidden truncate text-footnote text-label-2 sm:block">Ajans paneli</span>
              </span>
            </Link>
            <AdminNav isOwner={!!ctx?.isOwner} variant="bar" />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {(ctx?.isOwner || ctx?.perms.includes("firma_olustur")) && (
              <Link href="/admin/firma-olustur" aria-label="Yeni firma" className={cn(buttonVariants({ size: "sm" }), "size-9 px-0 sm:w-auto sm:px-3.5")}>
                <Plus />
                <span className="hidden sm:inline">Yeni firma</span>
              </Link>
            )}
            <ThemeToggle className="focus-ring hover-tint grid size-9 place-items-center rounded-full text-label-2" />
            <AdminNotifications items={notifications.items} count={notifications.count} />
            <AdminUserMenu email={user.email ?? ""} />
          </div>
        </div>
      </header>

      {actingError && (
        <div className="bg-danger-soft px-4 py-2 text-center text-subhead text-danger-text">
          Firmaya giriş açılamadı, tekrar deneyin.
        </div>
      )}
      {acting && (
        <div className="bg-fill">
          <form action={exitViewAs} className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>
              <span className="font-medium">{actingName}</span> firmasındasınız
            </span>
            <button type="submit" className="focus-ring rounded font-semibold text-primary-text">Firmadan çık</button>
          </form>
        </div>
      )}
      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <AdminNav isOwner={!!ctx?.isOwner} variant="mobile" />
        {children}
      </main>
      <Toaster />
    </div>
  );
}
