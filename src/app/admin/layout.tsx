import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ShieldCheck, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

import { AdminLogout } from "./admin-logout";

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
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/firma-olustur" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="size-4" />
              Yeni Firma
            </Link>
            <div className="ml-1 hidden items-center gap-2 rounded-full border bg-muted/40 py-1 pl-1 pr-3 sm:flex">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {(user.email ?? "AD").slice(0, 2).toLocaleUpperCase("tr")}
              </span>
              <span className="max-w-40 truncate text-xs font-medium text-muted-foreground">{user.email}</span>
            </div>
            <AdminLogout />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      <Toaster />
    </div>
  );
}
