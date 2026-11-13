import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ShieldCheck, Plus, Users, History } from "lucide-react";

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
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-card/85 shadow-soft backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm">
                <ShieldCheck className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="font-semibold">Süper-Admin</p>
                <p className="text-xs text-muted-foreground">Ajans Yönetim Paneli</p>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <Link href="/admin" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                <Building2 className="size-4 text-primary" />
                Firmalar
              </Link>
              {ctx?.isOwner && (
                <>
                  <Link href="/admin/ekip" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Users className="size-4" />
                    Ekip
                  </Link>
                  <Link href="/admin/gunluk" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <History className="size-4" />
                    Günlük
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {(ctx?.isOwner || ctx?.perms.includes("firma_olustur")) && (
              <Link href="/admin/firma-olustur" className={cn(buttonVariants({ size: "sm" }))}>
                <Plus className="size-4" />
                Yeni Firma
              </Link>
            )}
            <ThemeToggle className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" />
            <AdminNotifications items={notifications.items} count={notifications.count} />
            <AdminUserMenu email={user.email ?? ""} />
          </div>
        </div>
      </header>

      {actingError && (
        <div className="border-b bg-muted/60 px-4 py-2 text-center text-sm text-destructive">
          Firmaya giriş açılamadı, tekrar deneyin.
        </div>
      )}
      {acting && (
        <div className="border-b bg-muted/60">
          <form action={exitViewAs} className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>
              <span className="font-medium">{actingName}</span> firmasındasınız
            </span>
            <button type="submit" className="font-medium text-primary hover:underline">Firmadan çık</button>
          </form>
        </div>
      )}
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      <Toaster />
    </div>
  );
}
