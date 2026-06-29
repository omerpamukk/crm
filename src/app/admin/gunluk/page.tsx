import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft, History, Building2, Pencil, CreditCard, PauseCircle, PlayCircle,
  UserPlus, UserMinus, KeyRound, ShieldCheck, UserCheck, UserX, Eye, ShieldPlus, ShieldMinus, SlidersHorizontal,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/supabase/admin-context";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Row = { id: string; created_at: string; actor_name: string | null; action: string; business_name: string | null; detail: string | null };

const META: Record<string, { label: string; icon: typeof Building2; tone: string }> = {
  firma_olustur: { label: "Firma oluşturdu", icon: Building2, tone: "bg-positive/12 text-positive" },
  firma_sil: { label: "Firmayı sildi", icon: Building2, tone: "bg-danger/12 text-danger" },
  firma_duzenle: { label: "Firma bilgilerini güncelledi", icon: Pencil, tone: "bg-primary/10 text-primary" },
  abonelik_guncelle: { label: "Aboneliği güncelledi", icon: CreditCard, tone: "bg-primary/10 text-primary" },
  abonelik_askiya: { label: "Aboneliği askıya aldı", icon: PauseCircle, tone: "bg-warning/15 text-amber-700" },
  abonelik_aktive: { label: "Aboneliği aktive etti", icon: PlayCircle, tone: "bg-positive/12 text-positive" },
  kullanici_ekle: { label: "Kullanıcı ekledi", icon: UserPlus, tone: "bg-positive/12 text-positive" },
  kullanici_sil: { label: "Kullanıcı sildi", icon: UserMinus, tone: "bg-danger/12 text-danger" },
  kullanici_sifre: { label: "Kullanıcı şifresi sıfırladı", icon: KeyRound, tone: "bg-primary/10 text-primary" },
  kullanici_rol: { label: "Kullanıcı rolü değiştirdi", icon: ShieldCheck, tone: "bg-primary/10 text-primary" },
  kullanici_aktive: { label: "Kullanıcıyı aktive etti", icon: UserCheck, tone: "bg-positive/12 text-positive" },
  kullanici_pasif: { label: "Kullanıcıyı pasifleştirdi", icon: UserX, tone: "bg-warning/15 text-amber-700" },
  yonetici_giris: { label: "Yönetici olarak girdi", icon: Eye, tone: "bg-danger/12 text-danger" },
  admin_ekle: { label: "Admin ekledi", icon: ShieldPlus, tone: "bg-positive/12 text-positive" },
  admin_sil: { label: "Admin sildi", icon: ShieldMinus, tone: "bg-danger/12 text-danger" },
  admin_yetki: { label: "Admin yetkilerini düzenledi", icon: SlidersHorizontal, tone: "bg-primary/10 text-primary" },
};

const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function GunlukPage() {
  const ctx = await getAdminContext();
  if (!ctx?.isAdmin) redirect("/giris");
  if (!ctx.isOwner) redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_audit_log")
    .select("id, created_at, actor_name, action, business_name, detail")
    .order("created_at", { ascending: false })
    .limit(250);
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Firmalar</Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><History className="size-6 text-primary" />İşlem Geçmişi</h1>
        <p className="text-sm text-muted-foreground">Hangi admin neyi ne zaman yaptı — son {rows.length} işlem. (Yalnızca kurucu görür.)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Henüz kayıt yok. Admin işlemleri burada görünecek.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => {
                const m = META[r.action] ?? { label: r.action, icon: History, tone: "bg-muted text-muted-foreground" };
                const Icon = m.icon;
                return (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${m.tone}`}><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{r.actor_name ?? "Bilinmeyen"}</span>{" "}
                        <span className="text-muted-foreground">{m.label}</span>
                        {r.business_name && <> · <span className="font-medium">{r.business_name}</span></>}
                      </p>
                      {r.detail && <p className="truncate text-xs text-muted-foreground">{r.detail}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fmt.format(new Date(r.created_at))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
