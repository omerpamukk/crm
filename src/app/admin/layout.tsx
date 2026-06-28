import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
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
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">Süper-Admin</p>
              <p className="text-xs text-muted-foreground">Ajans Yönetim Paneli</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/admin" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Building2 className="size-4" />
              Firmalar
            </Link>
            <span className="ml-2 hidden text-xs text-muted-foreground sm:block">{user.email}</span>
            <AdminLogout />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      <Toaster />
    </div>
  );
}
