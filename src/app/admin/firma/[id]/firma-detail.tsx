"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, CalendarCheck, Banknote, Save, UserPlus, KeyRound, Trash2, Copy, CheckCircle2, ShieldAlert,
  Play, Pause, Eye, Pencil, Phone, Mail, MapPin, Globe, Clock, Image as ImageIcon, Ban, RotateCcw, CreditCard,
  Wallet, Package as PackageIcon, Briefcase, Building2,
} from "lucide-react";
import { toast } from "sonner";

import { SECTORS } from "@/lib/constants";
import { formatPrice, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Business, Subscription, SubscriptionStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import {
  updateBusinessInfo, updateSubscription, setSubscriptionStatus, addUserToBusiness,
  changeUserRole, resetUserPassword, setUserActive, removeUser, deleteBusiness,
} from "./actions";
import { enterViewAs } from "../../view-as-actions";

export type FirmaUser = { id: string; full_name: string | null; role: "owner" | "staff"; email: string; phone: string | null; banned: boolean };

const STATUS_META: Record<SubscriptionStatus, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-positive/12 text-positive" },
  trial: { label: "Deneme", cls: "bg-primary/10 text-primary" },
  suspended: { label: "Askıda", cls: "bg-warning/15 text-amber-700" },
  cancelled: { label: "İptal", cls: "bg-danger/12 text-danger" },
};
const PLAN_LABEL: Record<string, string> = { trial: "Deneme", temel: "Temel", pro: "Pro" };
const CURRENCIES = ["TRY", "USD", "EUR"];

function daysLeft(expires: string | null): number | null {
  if (!expires) return null;
  return Math.ceil((new Date(expires).getTime() - Date.now()) / 86_400_000);
}

type Perms = { goruntule: boolean; yonet: boolean; firma_duzenle: boolean; abonelik: boolean; kullanici_yonet: boolean };

const USER_TONES = ["bg-primary/10 text-primary", "bg-emerald-100 text-emerald-600", "bg-amber-100 text-amber-600", "bg-sky-100 text-sky-600", "bg-violet-100 text-violet-600", "bg-rose-100 text-rose-600"];
function userTone(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % USER_TONES.length;
  return USER_TONES[h];
}

export type FirmStats = {
  customers: number; leads: number; appointments: number; completed: number;
  revenue: number; monthRevenue: number; openDebt: number; packages: number; staff: number;
};

export function FirmaDetail({
  business, subscription, users, stats, perms, isOwner,
}: {
  business: Business;
  subscription: Subscription | null;
  users: FirmaUser[];
  stats: FirmStats;
  perms: Perms;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const status = (subscription?.status ?? "active") as SubscriptionStatus;
  const suspended = status === "suspended" || status === "cancelled";
  const left = daysLeft(subscription?.expires_at ?? null);

  // Firma bilgileri
  const [biz, setBiz] = useState({
    name: business.name, sector: business.sector ?? SECTORS[0].value,
    phone: business.phone ?? "", email: business.email ?? "", address: business.address ?? "",
    currency: business.currency ?? "TRY", timezone: business.timezone ?? "Europe/Istanbul",
    slug: business.slug ?? "", logo_url: business.logo_url ?? "",
  });
  // Abonelik
  const [sub, setSub] = useState({
    plan: subscription?.plan ?? "trial", status: status as string, price: String(subscription?.price ?? 0),
    started_at: subscription?.started_at?.slice(0, 10) ?? "", expires_at: subscription?.expires_at?.slice(0, 10) ?? "",
    note: subscription?.note ?? "",
  });
  // Kullanıcı ekle
  const [addOpen, setAddOpen] = useState(false);
  const [nu, setNu] = useState({ fullName: "", email: "", phone: "", password: "", pwMode: "auto", role: "staff" });
  // Şifre sıfırla
  const [pwUser, setPwUser] = useState<FirmaUser | null>(null);
  const [pwMode, setPwMode] = useState("auto");
  const [pwValue, setPwValue] = useState("");
  // Sonuç / onay
  const [creds, setCreds] = useState<{ email?: string; password: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<FirmaUser | null>(null);
  // Firma sil
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string; credentials?: { email: string; password: string }; password?: string }>, okMsg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error ?? "Hata oluştu."); return; }
      if (res.credentials) setCreds(res.credentials);
      else if (res.password) setCreds({ password: res.password });
      else toast.success(okMsg);
      router.refresh();
    });

  const copy = (t: string, l: string) => { navigator.clipboard.writeText(t); toast.success(`${l} kopyalandı`); };

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Firmalar</Link>

      {/* Başlık */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">{business.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{business.name}</h1>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_META[status].cls)}>{STATUS_META[status].label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{PLAN_LABEL[sub.plan] ?? sub.plan}</span>
            </div>
            <p className="text-sm text-muted-foreground">{business.sector ?? "—"} · Oluşturma {formatDate(business.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {perms.goruntule && <Button variant="outline" disabled={pending} onClick={() => start(() => enterViewAs(business.id, "view"))}><Eye className="size-4" />Görüntüle</Button>}
          {perms.yonet && <Button disabled={pending} onClick={() => start(() => enterViewAs(business.id, "manage"))}><Pencil className="size-4" />Yönetici Olarak Gir</Button>}
        </div>
      </div>

      {/* Firma istatistikleri */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Müşteri", value: String(stats.customers), sub: `${stats.leads} lead`, icon: Users, tone: "bg-primary/10 text-primary", bar: "border-l-primary", accent: "" },
          { label: "Randevu", value: String(stats.appointments), sub: `${stats.completed} tamamlandı`, icon: CalendarCheck, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", accent: "" },
          { label: "Toplam Ciro", value: formatPrice(stats.revenue), sub: `Bu ay ${formatPrice(stats.monthRevenue)}`, icon: Banknote, tone: "bg-positive/10 text-positive", bar: "border-l-positive", accent: "text-positive" },
          { label: "Açık Borç", value: formatPrice(stats.openDebt), sub: stats.openDebt > 0 ? "tahsil edilecek" : "borç yok", icon: Wallet, tone: stats.openDebt > 0 ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground", bar: stats.openDebt > 0 ? "border-l-danger" : "border-l-border", accent: stats.openDebt > 0 ? "text-danger" : "" },
          { label: "Paket", value: String(stats.packages), sub: "satılan paket", icon: PackageIcon, tone: "bg-violet-100 text-violet-600", bar: "border-l-violet-400", accent: "" },
          { label: "Personel", value: String(stats.staff), sub: "aktif ekip", icon: Briefcase, tone: "bg-sky-100 text-sky-600", bar: "border-l-sky-400", accent: "" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={cn("border-l-4", s.bar)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className={cn("flex size-8 items-center justify-center rounded-lg", s.tone)}><Icon className="size-4" /></span>
                </div>
                <p className={cn("mt-2 text-lg font-bold tabular-nums", s.accent)}>{s.value}</p>
                <p className="truncate text-[11px] text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="kullanici">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1.5 rounded-xl border bg-muted/40 p-1.5">
          <TabsTrigger value="kullanici" className="group flex h-auto items-center justify-center gap-2 rounded-lg px-3 py-2.5 data-active:bg-card data-active:shadow-sm">
            <span className="flex size-7 items-center justify-center rounded-md bg-background/70 text-muted-foreground transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary"><Users className="size-4" /></span>
            <span className="hidden sm:inline">Kullanıcılar</span>
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">{users.length}</span>
          </TabsTrigger>
          <TabsTrigger value="abonelik" className="group flex h-auto items-center justify-center gap-2 rounded-lg px-3 py-2.5 data-active:bg-card data-active:shadow-sm">
            <span className="flex size-7 items-center justify-center rounded-md bg-background/70 text-muted-foreground transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary"><CreditCard className="size-4" /></span>
            <span className="hidden sm:inline">Abonelik</span>
            <span className={cn("size-2 shrink-0 rounded-full ring-2 ring-card", subscription?.status === "active" ? "bg-positive" : subscription?.status === "trial" ? "bg-primary" : subscription?.status === "suspended" ? "bg-amber-500" : "bg-danger")} />
          </TabsTrigger>
          <TabsTrigger value="genel" className="group flex h-auto items-center justify-center gap-2 rounded-lg px-3 py-2.5 data-active:bg-card data-active:shadow-sm">
            <span className="flex size-7 items-center justify-center rounded-md bg-background/70 text-muted-foreground transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary"><Building2 className="size-4" /></span>
            <span className="hidden sm:inline">Firma Bilgileri</span>
          </TabsTrigger>
        </TabsList>

        {/* KULLANICILAR */}
        <TabsContent value="kullanici" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Kullanıcılar</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">{users.filter((u) => u.role === "owner").length} yönetici · {users.filter((u) => u.role === "staff").length} personel{users.some((u) => u.banned) ? ` · ${users.filter((u) => u.banned).length} pasif` : ""}</p>
              </div>
              {perms.kullanici_yonet && <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="size-4" />Kullanıcı Ekle</Button>}
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {users.map((u) => (
                  <li key={u.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30", u.banned && "opacity-60")}>
                    <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold", userTone(u.id))}>
                      {(u.full_name ?? "?").slice(0, 2).toLocaleUpperCase("tr")}
                      <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card", u.banned ? "bg-danger" : "bg-positive")} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {u.full_name ?? "—"}
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", u.role === "owner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{u.role === "owner" ? "Yönetici" : "Personel"}</span>
                        {u.banned && <span className="rounded-full bg-danger/12 px-1.5 py-0.5 text-[10px] font-medium text-danger">Pasif</span>}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Mail className="size-3" />{u.email}</span>
                        {u.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{u.phone}</span>}
                      </p>
                    </div>
                    {perms.kullanici_yonet ? (
                      <>
                        <select value={u.role} onChange={(e) => run(() => changeUserRole(business.id, u.id, e.target.value as "owner" | "staff"), "Rol güncellendi")} disabled={pending} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                          <option value="owner">Yönetici</option>
                          <option value="staff">Personel</option>
                        </select>
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => { setPwUser(u); setPwMode("auto"); setPwValue(""); }}><KeyRound className="size-3.5" />Şifre</Button>
                        {u.banned ? (
                          <Button variant="outline" size="sm" className="text-positive" disabled={pending} onClick={() => run(() => setUserActive(business.id, u.id, true), "Kullanıcı aktifleştirildi")}><RotateCcw className="size-3.5" />Aktive Et</Button>
                        ) : (
                          <Button variant="outline" size="sm" className="text-amber-600" disabled={pending} onClick={() => run(() => setUserActive(business.id, u.id, false), "Kullanıcı pasifleştirildi")}><Ban className="size-3.5" />Pasifleştir</Button>
                        )}
                        <Button variant="outline" size="icon-sm" className="text-danger" disabled={pending} onClick={() => setConfirmDel(u)}><Trash2 className="size-3.5" /></Button>
                      </>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{u.role === "owner" ? "Yönetici" : "Personel"}</span>
                    )}
                  </li>
                ))}
                {users.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Bu firmada kullanıcı yok.</li>}
              </ul>
            </CardContent>
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">E-posta/telefon yalnızca SUPABASE_SERVICE_ROLE_KEY ayarlıysa görünür. Şifreler güvenlik gereği görüntülenemez; sıfırlanabilir.</p>
        </TabsContent>

        {/* ABONELİK */}
        <TabsContent value="abonelik" className="mt-4 space-y-4">
          <Card className={cn("border-l-4", suspended ? "border-l-warning" : "border-l-positive")}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <span className={cn("flex size-12 items-center justify-center rounded-xl", STATUS_META[status].cls)}><CreditCard className="size-6" /></span>
                <div>
                  <p className="text-lg font-bold">{PLAN_LABEL[sub.plan] ?? sub.plan} Plan · <span className={cn(suspended ? "text-amber-600" : "text-positive")}>{STATUS_META[status].label}</span></p>
                  <p className="text-sm text-muted-foreground">
                    {Number(sub.price) > 0 ? `${formatPrice(Number(sub.price))}/ay` : "Ücretsiz"}
                    {subscription?.started_at && ` · Başlangıç ${formatDate(subscription.started_at)}`}
                    {left !== null && ` · ${left >= 0 ? `${left} gün kaldı` : `${-left} gün önce bitti`}`}
                  </p>
                </div>
              </div>
              {perms.abonelik && (suspended ? (
                <Button className="bg-positive text-white hover:bg-positive/90" disabled={pending} onClick={() => run(() => setSubscriptionStatus(business.id, "active"), "Abonelik aktive edildi")}><Play className="size-4" />Yeniden Aktive Et</Button>
              ) : (
                <Button variant="destructive" disabled={pending} onClick={() => run(() => setSubscriptionStatus(business.id, "suspended"), "Abonelik askıya alındı")}><Pause className="size-4" />Askıya Al</Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Abonelik Detayları</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Sel label="Plan" value={sub.plan} onChange={(v) => setSub((p) => ({ ...p, plan: v }))} opts={[["trial", "Deneme"], ["temel", "Temel"], ["pro", "Pro"]]} />
                <Sel label="Durum" value={sub.status} onChange={(v) => setSub((p) => ({ ...p, status: v }))} opts={[["active", "Aktif"], ["trial", "Deneme"], ["suspended", "Askıda"], ["cancelled", "İptal"]]} />
                <Fld label="Aylık Ücret (₺)" type="number" value={sub.price} onChange={(v) => setSub((p) => ({ ...p, price: v }))} />
                <Fld label="Başlangıç Tarihi" type="date" value={sub.started_at} onChange={(v) => setSub((p) => ({ ...p, started_at: v }))} />
                <Fld label="Bitiş Tarihi" type="date" value={sub.expires_at} onChange={(v) => setSub((p) => ({ ...p, expires_at: v }))} />
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Not</label>
                  <input value={sub.note} onChange={(e) => setSub((p) => ({ ...p, note: e.target.value }))} placeholder="İç not (firma görmez)" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              </div>
              {perms.abonelik && <Button disabled={pending} onClick={() => run(() => updateSubscription(business.id, { plan: sub.plan, status: sub.status, price: Number(sub.price) || 0, started_at: sub.started_at || null, expires_at: sub.expires_at || null, note: sub.note }), "Abonelik güncellendi")}><Save className="size-4" />Aboneliği Kaydet</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FİRMA BİLGİLERİ */}
        <TabsContent value="genel" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Firma Bilgileri</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Fld label="Firma Adı" value={biz.name} onChange={(v) => setBiz((p) => ({ ...p, name: v }))} icon={ImageIcon} />
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektör</label>
                  <select value={biz.sector} onChange={(e) => setBiz((p) => ({ ...p, sector: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <Fld label="Telefon" value={biz.phone} onChange={(v) => setBiz((p) => ({ ...p, phone: v }))} icon={Phone} placeholder="+90 5xx xxx xx xx" />
                <Fld label="E-posta" value={biz.email} onChange={(v) => setBiz((p) => ({ ...p, email: v }))} icon={Mail} placeholder="info@firma.com" />
                <div className="sm:col-span-2"><Fld label="Adres" value={biz.address} onChange={(v) => setBiz((p) => ({ ...p, address: v }))} icon={MapPin} placeholder="Açık adres" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Para Birimi</label>
                  <select value={biz.currency} onChange={(e) => setBiz((p) => ({ ...p, currency: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Fld label="Zaman Dilimi" value={biz.timezone} onChange={(v) => setBiz((p) => ({ ...p, timezone: v }))} icon={Clock} />
                <Fld label="Web Adresi (randevu linki slug)" value={biz.slug} onChange={(v) => setBiz((p) => ({ ...p, slug: v }))} icon={Globe} placeholder="defne-beauty" />
                <Fld label="Logo URL" value={biz.logo_url} onChange={(v) => setBiz((p) => ({ ...p, logo_url: v }))} icon={ImageIcon} placeholder="https://…" />
              </div>
              <p className="text-xs text-muted-foreground">Bu alanları firma kendi <strong>Ayarlar</strong> sayfasından da doldurur; burada güncel hâli görünür ve düzenlenebilir.</p>
              {perms.firma_duzenle && <Button disabled={pending} onClick={() => run(() => updateBusinessInfo(business.id, biz), "Firma bilgileri kaydedildi")}><Save className="size-4" />Kaydet</Button>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tehlikeli Bölge — yalnızca kurucu */}
      {isOwner && (
        <Card className="border-danger/30">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-danger"><ShieldAlert className="size-4" />Tehlikeli Bölge</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Firmayı kalıcı olarak sil</p>
              <p className="text-xs text-muted-foreground">Tüm müşteri, randevu, ödeme, kullanıcı ve abonelik verisi silinir. Geri alınamaz.</p>
            </div>
            <Button variant="destructive" onClick={() => { setDelText(""); setDelOpen(true); }}><Trash2 className="size-4" />Firmayı Sil</Button>
          </CardContent>
        </Card>
      )}

      {/* Firma sil onayı — "sil" yazarak */}
      <Dialog open={delOpen} onOpenChange={(o) => { setDelOpen(o); if (!o) setDelText(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-danger"><ShieldAlert className="size-5" />Firmayı sil</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground"><b className="text-foreground">{business.name}</b> firması ve <b>tüm verisi</b> (müşteriler, randevular, ödemeler, {users.length} kullanıcı, abonelik) kalıcı olarak silinecek. <b className="text-danger">Bu işlem geri alınamaz.</b></p>
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
              <label className="text-xs font-medium text-muted-foreground">Onaylamak için <b className="font-mono text-danger">sil</b> yazın</label>
              <input value={delText} onChange={(e) => setDelText(e.target.value)} placeholder="sil" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDelOpen(false); setDelText(""); }}>Vazgeç</Button>
            <Button variant="destructive" disabled={pending || delText.trim().toLocaleLowerCase("tr") !== "sil"} onClick={() => { setDelOpen(false); start(async () => { const res = await deleteBusiness(business.id); if (!res.ok) { toast.error(res.error ?? "Firma silinemedi."); return; } toast.success("Firma silindi."); router.push("/admin"); router.refresh(); }); }}><Trash2 className="size-4" />Kalıcı Olarak Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kullanıcı ekle */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Kullanıcı Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Fld label="Ad Soyad" value={nu.fullName} onChange={(v) => setNu((p) => ({ ...p, fullName: v }))} placeholder="Yetkilinin adı" />
            <Fld label="E-posta" type="email" value={nu.email} onChange={(v) => setNu((p) => ({ ...p, email: v }))} placeholder="ornek@firma.com" />
            <Fld label="Telefon (opsiyonel)" value={nu.phone} onChange={(v) => setNu((p) => ({ ...p, phone: v }))} placeholder="+90 5xx…" />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Şifre</label>
              <div className="flex gap-1 rounded-lg border p-0.5 text-xs">
                <button type="button" onClick={() => setNu((p) => ({ ...p, pwMode: "auto" }))} className={cn("flex-1 rounded-md py-1.5 font-medium", nu.pwMode === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Otomatik üret</button>
                <button type="button" onClick={() => setNu((p) => ({ ...p, pwMode: "custom" }))} className={cn("flex-1 rounded-md py-1.5 font-medium", nu.pwMode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Kendim belirle</button>
              </div>
              {nu.pwMode === "custom" && <input value={nu.password} onChange={(e) => setNu((p) => ({ ...p, password: e.target.value }))} placeholder="En az 8 karakter" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />}
            </div>
            <Sel label="Rol" value={nu.role} onChange={(v) => setNu((p) => ({ ...p, role: v }))} opts={[["staff", "Personel"], ["owner", "Yönetici"]]} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>İptal</Button>
            <Button disabled={pending} onClick={() => { setAddOpen(false); run(() => addUserToBusiness(business.id, { fullName: nu.fullName, email: nu.email, phone: nu.phone, role: nu.role, password: nu.pwMode === "custom" ? nu.password : undefined }), "Kullanıcı eklendi"); setNu({ fullName: "", email: "", phone: "", password: "", pwMode: "auto", role: "staff" }); }}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Şifre sıfırla */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Şifre Sıfırla — {pwUser?.full_name ?? pwUser?.email}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Mevcut şifre güvenlik gereği görüntülenemez (şifrelenmiş saklanır). Yeni bir şifre belirleyebilir veya otomatik üretebilirsin.</p>
          <div className="flex gap-1 rounded-lg border p-0.5 text-xs">
            <button type="button" onClick={() => setPwMode("auto")} className={cn("flex-1 rounded-md py-1.5 font-medium", pwMode === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Otomatik üret</button>
            <button type="button" onClick={() => setPwMode("custom")} className={cn("flex-1 rounded-md py-1.5 font-medium", pwMode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Kendim belirle</button>
          </div>
          {pwMode === "custom" && <input value={pwValue} onChange={(e) => setPwValue(e.target.value)} placeholder="Yeni şifre (en az 8 karakter)" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>İptal</Button>
            <Button disabled={pending} onClick={() => { const id = pwUser?.id; setPwUser(null); if (id) run(() => resetUserPassword(business.id, id, pwMode === "custom" ? pwValue : undefined), "Şifre güncellendi"); }}>Şifreyi Belirle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Üretilen kimlik bilgisi */}
      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-positive" />Giriş Bilgisi</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Bu bilgiyi kullanıcıya iletin. Şifre yalnızca şimdi gösteriliyor.</p>
          <div className="space-y-2">
            {creds?.email && <Reveal label="E-posta" value={creds.email} onCopy={() => copy(creds.email!, "E-posta")} />}
            {creds && <Reveal label="Şifre" value={creds.password} onCopy={() => copy(creds.password, "Şifre")} />}
          </div>
          <DialogFooter><Button onClick={() => setCreds(null)}>Tamam</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sil onayı */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-danger" />Kullanıcıyı sil</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground"><b>{confirmDel?.full_name ?? confirmDel?.email}</b> kalıcı olarak silinecek (giriş yapamaz). Geri alınamaz. <br/>Sadece erişimini kapatmak istersen “Pasifleştir”i kullan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>İptal</Button>
            <Button variant="destructive" disabled={pending} onClick={() => { const u = confirmDel; setConfirmDel(null); if (u) run(() => removeUser(business.id, u.id), "Kullanıcı silindi"); }}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fld({ label, value, onChange, placeholder, type = "text", icon: Icon }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: typeof Phone }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{Icon && <Icon className="size-3" />}{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}
function Sel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
function Reveal({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate font-mono text-sm">{value}</p></div>
      <Button variant="outline" size="icon-sm" onClick={onCopy}><Copy className="size-3.5" /></Button>
    </div>
  );
}
