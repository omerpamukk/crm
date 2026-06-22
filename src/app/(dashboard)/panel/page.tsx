import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/shared/logout-button";

export default async function PanelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware zaten koruyor; yine de güvenlik için kontrol edelim.
  if (!user) {
    redirect("/giris");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_id, businesses(name)")
    .eq("id", user.id)
    .single();

  // İşletmesi yoksa onboarding'e gönder.
  if (!profile?.business_id) {
    redirect("/isletme-kur");
  }

  const name = profile.full_name ?? user.email;
  // businesses ilişkisi (many-to-one) çalışma zamanında tekil obje döner;
  // tip çıkarımı dizi olarak görebildiği için her iki duruma da hazırlıklı olalım.
  const businesses = profile.businesses as unknown as
    | { name: string }
    | { name: string }[]
    | null;
  const business = Array.isArray(businesses) ? businesses[0] : businesses;
  const businessName = business?.name ?? "İşletmen";

  return (
    <div className="min-h-svh p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Hoş geldin {name}, {businessName}
        </h1>
        <LogoutButton />
      </header>
    </div>
  );
}
