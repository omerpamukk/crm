"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, CalendarCheck, Banknote, Save, UserPlus, KeyRound, Trash2, Copy, CheckCircle2, ShieldAlert, Play, Pause,
} from "lucide-react";
import { toast } from "sonner";

import { SECTORS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Business, Subscription, SubscriptionStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { updateBusiness, updateSubscription, setSubscriptionStatus, addUserToBusiness, changeUserRole, resetUserPassword, removeUser } from "./actions";

export type FirmaUser = { id: string; full_name: string | null; role: "owner" | "staff"; email: string };

const STATUS_META: Record<SubscriptionStatus, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-positive/12 text-positive" },
  trial: { label: "Deneme", cls: "bg-primary/10 text-primary" },
  suspended: { label: "Askıda", cls: "bg-warning/15 text-amber-700" },
  cancelled: { label: "İptal", cls: "bg-danger/12 text-danger" },
};

export function FirmaDetail({
  business, subscription, users, stats,
}: {
  business: Business;
  subscription: Subscription | null;
  users: FirmaUser[];
  stats: { customers: number; appointments: number; revenue: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const status = (subscription?.status ?? "active") as SubscriptionStatus;
  const suspended = status === "suspended" || status === "cancelled";

  // Genel
  const [name, setName] = useState(business.name);
  const [sector, setSector] = useState(business.sector ?? SECTORS[0].value);
  // Abonelik
  const [plan, setPlan] = useState(subscription?.plan ?? "trial");
  const [subStatus, setSubStatus] = useState<string>(status);
  const [price, setPrice] = useState(String(subscription?.price ?? 0));
  const [expires, setExpires] = useState(subscription?.expires_at?.slice(0, 10) ?? "");
  // Kullanıcı ekle
  const [addOpen, setAddOpen] = useState(false);
  const [nu, setNu] = useState({ fullName: "", email: "", password: "", role: "staff" });
  // Üretilen kimlik bilgisi gösterimi
  const [creds, setCreds] = useState<{ email?: string; password: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<FirmaUser | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; credentials?: { email: string; password: string }; password?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error ?? "Hata oluştu."); return; }
      if (res.credentials) setCreds(res.credentials);
      else if (res.password) setCreds({ password: res.password });
      else toast.success(okMsg);
      router.refresh();
    });

  function copy(t: string, l: string) { navigator.clipboard.writeText(t); toast.success(`${l} kopyalandı`); }

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Firmalar</Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">{business.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
          <div>
            <h1 className="text-xl font-bold">{business.name}</h1>
            <p className="text-sm text-muted-foreground">{business.sector ?? "—"}</p>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_META[status].cls)}>{STATUS_META[status].label}</span>
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Müşteri", value: stats.customers, icon: Users, tone: "bg-primary/10 text-primary" },
          { label: "Randevu", value: stats.appointments, icon: CalendarCheck, tone: "bg-warning/12 text-amber-600" },
          { label: "Tahsilat", value: formatPrice(stats.revenue), icon: Banknote, tone: "bg-positive/10 text-positive" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}><CardContent className="flex items-center justify-between p-4">
              <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="mt-1 text-xl font-bold tabular-nums">{s.value}</p></div>
              <span className={cn("flex size-9 items-center justify-center rounded-lg", s.tone)}><Icon className="size-4" /></span>
            </CardContent></Card>
          );
        })}
      </div>

      <Tabs defaultValue="kullanici">
        <TabsList>
          <TabsTrigger value="kullanici"><Users className="size-4" />Kullanıcılar ({users.length})</TabsTrigger>
          <TabsTrigger value="abonelik"><Banknote className="size-4" />Abonelik</TabsTrigger>
          <TabsTrigger value="genel"><Save className="size-4" />Firma Bilgileri</TabsTrigger>
        </TabsList>

        {/* Kullanıcılar */}
        <TabsContent value="kullanici" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Kullanıcılar</CardTitle>
              <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="size-4" />Kullanıcı Ekle</Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{(u.full_name ?? "?").slice(0, 2).toLocaleUpperCase("tr")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.full_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <select value={u.role} onChange={(e) => run(() => changeUserRole(business.id, u.id, e.target.value as "owner" | "staff"), "Rol güncellendi")} disabled={pending} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                      <option value="owner">Yönetici</option>
                      <option value="staff">Personel</option>
                    </select>
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => resetUserPassword(business.id, u.id), "Şifre sıfırlandı")}><KeyRound className="size-3.5" />Şifre</Button>
                    <Button variant="outline" size="icon-sm" className="text-danger" disabled={pending} onClick={() => setConfirmDel(u)}><Trash2 className="size-3.5" /></Button>
                  </li>
                ))}
                {users.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Bu firmada kullanıcı yok.</li>}
              </ul>
            </CardContent>
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">E-postalar yalnızca SUPABASE_SERVICE_ROLE_KEY ayarlıysa görünür. Yeni kullanıcı/şifre bilgisi ekranda gösterilir, siz iletirsiniz.</p>
        </TabsContent>

        {/* Abonelik */}
        <TabsContent value="abonelik" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Abonelik</CardTitle>
              {suspended ? (
                <Button size="sm" className="bg-positive text-white hover:bg-positive/90" disabled={pending} onClick={() => run(() => setSubscriptionStatus(business.id, "active"), "Abonelik aktive edildi")}><Play className="size-4" />Yeniden Aktive Et</Button>
              ) : (
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => setSubscriptionStatus(business.id, "suspended"), "Abonelik askıya alındı")}><Pause className="size-4" />Askıya Al</Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</label>
                  <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="trial">Deneme</option><option value="temel">Temel</option><option value="pro">Pro</option>
                  </select>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durum</label>
                  <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="active">Aktif</option><option value="trial">Deneme</option><option value="suspended">Askıda</option><option value="cancelled">İptal</option>
                  </select>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aylık Ücret (₺)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bitiş Tarihi</label>
                  <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              </div>
              <Button disabled={pending} onClick={() => run(() => updateSubscription(business.id, { plan, status: subStatus, price: Number(price) || 0, expires_at: expires || null }), "Abonelik güncellendi")}><Save className="size-4" />Aboneliği Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Firma bilgileri */}
        <TabsContent value="genel" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Firma Bilgileri</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Firma Adı</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektör</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <Button disabled={pending} onClick={() => run(() => updateBusiness(business.id, name, sector), "Firma güncellendi")}><Save className="size-4" />Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Kullanıcı ekle modalı */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Kullanıcı Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input value={nu.fullName} onChange={(e) => setNu((p) => ({ ...p, fullName: e.target.value }))} placeholder="Ad Soyad" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="email" value={nu.email} onChange={(e) => setNu((p) => ({ ...p, email: e.target.value }))} placeholder="E-posta" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            <input value={nu.password} onChange={(e) => setNu((p) => ({ ...p, password: e.target.value }))} placeholder="Şifre (boş = otomatik üret)" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            <select value={nu.role} onChange={(e) => setNu((p) => ({ ...p, role: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="staff">Personel</option><option value="owner">Yönetici</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>İptal</Button>
            <Button disabled={pending} onClick={() => { setAddOpen(false); run(() => addUserToBusiness(business.id, nu), "Kullanıcı eklendi"); setNu({ fullName: "", email: "", password: "", role: "staff" }); }}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Üretilen kimlik bilgisi */}
      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-positive" />Giriş Bilgisi</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Bu bilgiyi kullanıcıya iletin. Şifre yalnızca şimdi gösteriliyor.</p>
          <div className="space-y-2">
            {creds?.email && (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">E-posta</p><p className="truncate font-mono text-sm">{creds.email}</p></div><Button variant="outline" size="icon-sm" onClick={() => copy(creds.email!, "E-posta")}><Copy className="size-3.5" /></Button></div>
            )}
            {creds && (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">Şifre</p><p className="truncate font-mono text-sm">{creds.password}</p></div><Button variant="outline" size="icon-sm" onClick={() => copy(creds.password, "Şifre")}><Copy className="size-3.5" /></Button></div>
            )}
          </div>
          <DialogFooter><Button onClick={() => setCreds(null)}>Tamam</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kullanıcı sil onayı */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-danger" />Kullanıcıyı sil</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground"><b>{confirmDel?.full_name ?? confirmDel?.email}</b> kalıcı olarak silinecek (giriş yapamaz). Bu işlem geri alınamaz.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>İptal</Button>
            <Button variant="destructive" disabled={pending} onClick={() => { const u = confirmDel; setConfirmDel(null); if (u) run(() => removeUser(business.id, u.id), "Kullanıcı silindi"); }}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
