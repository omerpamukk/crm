"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  Bell,
  Plug,
  CreditCard,
  History,
  Save,
  Upload,
  Store,
  RefreshCw,
  MapPin,
  CalendarPlus,
  Sun,
  Moon,
  Copy,
  Crown,
  CheckCircle2,
  FileSpreadsheet,
  Code2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InstagramLogo, WhatsappLogo, TiktokLogo, EmailLogo } from "../mesajlar/channel-icons";
import { SECTORS } from "@/lib/constants";
import { formatPrice, formatDate } from "@/lib/format";
import type { Subscription } from "@/types/database";

import { updateBusinessInfo, updateOwnerProfile, updateWorkingHours } from "./actions";
import type { WorkingDay } from "./schema";

const CRM_NOTIFS = [
  "Yeni lead geldiğinde bildir",
  "Gecikmiş ödeme uyarısı",
  "Randevu hatırlatması",
  "Görev deadline yaklaşınca",
  "Google yorum geldiğinde",
  "Kritik stok uyarısı",
];

/** Denetim kaydı etiketleri (0017_business_audit.sql). */
const ACTION_LABEL: Record<string, string> = {
  ekle: "ekledi",
  guncelle: "güncelledi",
  sil: "sildi",
};
const ENTITY_LABEL: Record<string, string> = {
  musteri: "müşteri",
  odeme: "ödeme",
  gider: "gider",
  paket: "paket",
  randevu: "randevu",
  personel: "personel",
  ayarlar: "ayarları",
};
const ACTION_TONE: Record<string, string> = {
  ekle: "bg-positive",
  guncelle: "bg-primary",
  sil: "bg-danger",
};

function exportAuditCsv(rows: SettingsData["auditLog"]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = ["Tarih", "Kullanıcı", "İşlem", "Kayıt", "Özet"].join(";");
  const body = rows
    .map((r) =>
      [
        new Date(r.created_at).toLocaleString("tr-TR"),
        r.actor_label,
        ACTION_LABEL[r.action] ?? r.action,
        ENTITY_LABEL[r.entity] ?? r.entity,
        r.summary ?? "",
      ]
        .map(esc)
        .join(";")
    )
    .join("\n");
  const blob = new Blob([`\ufeff${head}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `islem-kayitlari-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  defaultValue,
  placeholder,
  disabled,
  type,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  const id = `f-${label.replace(/\s+/g, "-").toLocaleLowerCase("tr")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{hint && <span className="ml-1 normal-case text-muted-foreground/70">({hint})</span>}
      </label>
      <input
        id={id}
        type={type}
        {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : { defaultValue })}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:bg-muted/40 disabled:text-muted-foreground"
      />
    </div>
  );
}

export interface SettingsData {
  business: { name: string; sector: string; phone: string; email: string; address: string };
  owner: { full_name: string; phone: string; email: string; roleLabel: string };
  workingDays: WorkingDay[];
  subscription: Pick<Subscription, "plan" | "status" | "price" | "started_at" | "expires_at"> | null;
  auditLog: { id: string; created_at: string; actor_label: string; action: string; entity: string; summary: string | null }[];
}

export function SettingsView({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [biz, setBiz] = useState(data.business);
  const [owner, setOwner] = useState({ full_name: data.owner.full_name, phone: data.owner.phone });

  function saveBusiness() {
    start(async () => {
      const res = await updateBusinessInfo(biz);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Firma bilgileri kaydedildi.");
        router.refresh();
      }
    });
  }

  function saveOwner() {
    start(async () => {
      const res = await updateOwnerProfile(owner);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Profil kaydedildi.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description="İşletme bilgilerini, çalışma saatlerini, bildirimleri ve entegrasyonları yönet." />

      <Tabs defaultValue="temel">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="temel"><Building2 className="size-4" />Temel Bilgiler</TabsTrigger>
            <TabsTrigger value="saat"><Clock className="size-4" />Çalışma Saatleri</TabsTrigger>
            <TabsTrigger value="bildirim"><Bell className="size-4" />Bildirimler</TabsTrigger>
            <TabsTrigger value="entegrasyon"><Plug className="size-4" />Entegrasyonlar</TabsTrigger>
            <TabsTrigger value="abonelik"><CreditCard className="size-4" />Abonelik</TabsTrigger>
            <TabsTrigger value="log"><History className="size-4" />Sistem Logları</TabsTrigger>
          </TabsList>
        </div>

        {/* Temel Bilgiler */}
        <TabsContent value="temel" className="mt-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-primary" />Firma Bilgileri</CardTitle>
                <Button size="sm" disabled={pending} onClick={saveBusiness}><Save className="size-4" />{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Firma Adı" value={biz.name} onChange={(v) => setBiz((p) => ({ ...p, name: v }))} />
                <div className="space-y-1.5">
                  <label htmlFor="f-sektor" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektör</label>
                  <select id="f-sektor" value={biz.sector} onChange={(e) => setBiz((p) => ({ ...p, sector: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Seçiniz…</option>
                    {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Firma Telefonu" value={biz.phone} onChange={(v) => setBiz((p) => ({ ...p, phone: v }))} placeholder="+90 5xx xxx xx xx" />
                  <Field label="E-posta" type="email" value={biz.email} onChange={(v) => setBiz((p) => ({ ...p, email: v }))} placeholder="info@ornek.com" />
                </div>
                <Field label="Adres" value={biz.address} onChange={(v) => setBiz((p) => ({ ...p, address: v }))} />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo</label>
                  <div className="flex items-center gap-3">
                    <span className="flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary"><Store className="size-6" /></span>
                    <Button variant="outline" onClick={() => toast.info("Logo yükleme (demo).")}><Upload className="size-4" />Logo Yükle</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">İşletme Sahibi</CardTitle>
                <Button size="sm" variant="outline" disabled={pending} onClick={saveOwner}><Save className="size-4" />{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Ad Soyad" value={owner.full_name} onChange={(v) => setOwner((p) => ({ ...p, full_name: v }))} />
                <Field label="Telefon" hint="opsiyonel" value={owner.phone} onChange={(v) => setOwner((p) => ({ ...p, phone: v }))} placeholder="+90 5xx xxx xx xx" />
                <Field label="E-posta" defaultValue={data.owner.email} disabled />
                <Field label="Rol" defaultValue={data.owner.roleLabel} disabled />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Çalışma Saatleri */}
        <TabsContent value="saat" className="mt-4">
          <WorkingHours initial={data.workingDays} />
        </TabsContent>

        {/* Bildirimler */}
        <TabsContent value="bildirim" className="mt-4 space-y-4">
          <DemoBanner>
            Bildirim tercihleri henüz kaydedilmiyor; gönderim için SMS veya
            e-posta bağlantısı gerekiyor. Aşağıdaki ayarlar örnek amaçlı.
          </DemoBanner>
          <Notifications />
        </TabsContent>

        {/* Entegrasyonlar */}
        <TabsContent value="entegrasyon" className="mt-4 space-y-4">
          <DemoBanner>
            Entegrasyon bağlantıları henüz aktif değil. Hesaplar bağlandığında
            bu ekrandan yönetilecek.
          </DemoBanner>
          <Integrations />
        </TabsContent>

        {/* Abonelik */}
        <TabsContent value="abonelik" className="mt-4">
          <SubscriptionTab sub={data.subscription} />
        </TabsContent>

        {/* Sistem Logları */}
        <TabsContent value="log" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">İşlem kayıtları</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Son 50 kayıt · yalnızca yöneticiler görebilir
                </p>
              </div>
              {data.auditLog.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => exportAuditCsv(data.auditLog)}>
                  <FileSpreadsheet className="size-4" />
                  CSV indir
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {data.auditLog.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Henüz kayıt yok. Silme ve ödeme işlemleri buraya düşecek.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.auditLog.map((l) => (
                    <li key={l.id} className="flex items-start gap-3 py-3 text-sm">
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("tr-TR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", ACTION_TONE[l.action] ?? "bg-muted-foreground")} />
                      <span className="flex-1">
                        <b>{l.actor_label}</b>{" "}
                        {ENTITY_LABEL[l.entity] ?? l.entity}{" "}
                        {ACTION_LABEL[l.action] ?? l.action}
                        {l.summary && <> — <span className="text-muted-foreground">{l.summary}</span></>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const DAY_LABEL = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function WorkingHours({ initial }: { initial: WorkingDay[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [days, setDays] = useState<WorkingDay[]>(initial);
  const [sync, setSync] = useState({ maps: true, booking: true });

  function patch(i: number, next: Partial<WorkingDay>) {
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, ...next } : d)));
  }

  function save() {
    start(async () => {
      const res = await updateWorkingHours({ days });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Çalışma saatleri kaydedildi.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" />Haftalık Çalışma Düzeni</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Bu bilgiler randevu linkine otomatik yansır.</p>
          </div>
          <Button size="sm" disabled={pending} onClick={save}><Save className="size-4" />{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.map((d, i) => (
            <div key={d.day} className="flex items-center gap-3">
              <span className="w-10 text-sm font-medium">{DAY_LABEL[d.day]}</span>
              <Switch on={d.open} onClick={() => patch(i, { open: !d.open })} />
              {d.open ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${DAY_LABEL[d.day]} açılış`}
                    value={d.start}
                    onChange={(e) => patch(i, { start: e.target.value })}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="time"
                    aria-label={`${DAY_LABEL[d.day]} kapanış`}
                    value={d.end}
                    onChange={(e) => patch(i, { end: e.target.value })}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm font-medium text-danger">Kapalı</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="size-4 text-primary" />Otomatik Senkronizasyon</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Aktif plana göre saatler seçilen platformlara otomatik yansır.</p>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-positive/10 text-positive"><MapPin className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Google Maps çalışma saatlerini güncelle</p>
              <p className="text-xs text-muted-foreground">Aktif plana göre Google İşletme Profili saatleri otomatik senkronize olur</p>
            </div>
            <Switch on={sync.maps} onClick={() => setSync((s) => ({ ...s, maps: !s.maps }))} />
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarPlus className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Randevu linki saatlerini güncelle</p>
              <p className="text-xs text-muted-foreground">Aktif plana göre online randevu sayfasının müsait slotları otomatik güncellenir</p>
            </div>
            <Switch on={sync.booking} onClick={() => setSync((s) => ({ ...s, booking: !s.booking }))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Notifications() {
  const [notifs, setNotifs] = useState(CRM_NOTIFS.map(() => true));
  const [digests, setDigests] = useState({ morning: true, evening: true });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4 text-primary" />CRM Bildirimleri</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {CRM_NOTIFS.map((n, i) => (
            <div key={n} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm">{n}</span>
              <Switch on={notifs[i]} onClick={() => setNotifs((p) => p.map((v, j) => (j === i ? !v : v)))} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Copy className="size-4 text-primary" />Özet Mesajları</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "morning" as const, icon: Sun, title: "Sabah Özeti (09:00)", desc: "Günlük randevular, leadler, görevler ve tahsilatlar.", staff: ["Yönetici", "Tüm Personel"], staffChecked: [true, true] },
            { key: "evening" as const, icon: Moon, title: "Gün Sonu Özeti (20:00)", desc: "Günlük satış, seans, mesaj, tamamlanan görevler.", staff: ["Yönetici", "Personel"], staffChecked: [true, false] },
          ].map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.key} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-semibold"><Icon className={cn("size-4", d.key === "morning" ? "text-amber-500" : "text-violet-500")} />{d.title}</p>
                  <Switch on={digests[d.key]} onClick={() => setDigests((s) => ({ ...s, [d.key]: !s[d.key] }))} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{d.desc}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Gönderilecekler:</p>
                    <div className="flex flex-wrap gap-3">
                      {d.staff.map((s, i) => (
                        <label key={s} className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={d.staffChecked[i]} className="size-4 accent-primary" />{s}</label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Kanal:</p>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked className="size-4 accent-primary" />WhatsApp</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" className="size-4 accent-primary" />SMS</label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Integrations() {
  const INTEGR = [
    { name: "Instagram Business", sub: "@defnebeauty_demo", logo: InstagramLogo, connected: true },
    { name: "WhatsApp Business API", sub: "+90 532 000 0000", logo: WhatsappLogo, connected: true },
    { name: "E-posta Servisi (SMTP)", sub: "SendGrid", logo: EmailLogo, connected: true },
    { name: "TikTok Business", sub: "Bağlı değil", logo: TiktokLogo, connected: false },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plug className="size-4 text-primary" />Sosyal &amp; Mesajlaşma</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {INTEGR.map((it) => {
            const Logo = it.logo;
            return (
              <div key={it.name} className="flex items-center gap-3 rounded-lg border p-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border bg-card", !it.connected && "opacity-50")}><Logo className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.sub}</p>
                </div>
                {it.connected ? (
                  <span className="rounded-full bg-positive/12 px-2 py-1 text-xs font-medium text-positive">Bağlı</span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => toast.info(`${it.name} bağlanıyor (demo).`)}><Plug className="size-4" />Bağla</Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Code2 className="size-4 text-primary" />API &amp; Piksel</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Meta Piksel ID" defaultValue="987654321098765" />
          <Field label="Google Analytics (GA4)" defaultValue="G-AB12CD34EF" />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CRM API Anahtarı</label>
            <div className="flex gap-2">
              <input readOnly value="bidi_sk_••••••••••••••••••" className="h-10 flex-1 rounded-lg border border-input bg-muted/40 px-3 font-mono text-sm" />
              <Button variant="outline" size="icon" aria-label="API anahtarını kopyala" onClick={() => toast.success("API anahtarı kopyalandı (demo).")}><Copy className="size-4" /></Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google İşletme Profili</label>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-positive/10 text-positive"><MapPin className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Google İşletme Profili</p>
                <p className="text-xs text-muted-foreground">Defne Beauty Center</p>
              </div>
              <span className="rounded-full bg-positive/12 px-2 py-1 text-xs font-medium text-positive">Bağlı</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const PLAN_LABEL: Record<string, string> = { trial: "Deneme", temel: "Temel Paket", pro: "Pro Paket" };
const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "text-positive" },
  trial: { label: "Deneme", cls: "text-primary" },
  suspended: { label: "Askıda", cls: "text-amber-600" },
  cancelled: { label: "İptal", cls: "text-danger" },
};

function SubscriptionTab({ sub }: { sub: SettingsData["subscription"] }) {
  // Render sırasında Date.now() saf değil; ilk render'da bir kez sabitlenir.
  const [nowMs] = useState(() => Date.now());
  const expires = sub?.expires_at ? new Date(sub.expires_at) : null;
  const left = expires ? Math.ceil((expires.getTime() - nowMs) / 86_400_000) : null;
  const status = SUB_STATUS[sub?.status ?? "active"] ?? SUB_STATUS.active;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Crown className="size-4 text-primary" />Mevcut Paket</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-primary">{PLAN_LABEL[sub?.plan ?? "trial"] ?? sub?.plan ?? "—"}</p>
              <span className={cn("text-sm font-medium", status.cls)}>· {status.label}</span>
            </div>
            {sub?.price ? (
              <p className="text-sm text-muted-foreground">{formatPrice(sub.price)} / dönem</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ücretsiz</p>
            )}
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Abonelik Bitiş</p>
                <p className="font-semibold">{expires ? formatDate(sub!.expires_at!) : "Süresiz"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Kalan Süre</p>
                <p className={cn("font-semibold", left !== null && left < 15 ? "text-danger" : "text-positive")}>
                  {left !== null ? `${Math.max(left, 0)} gün` : "—"}
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Paket değişikliği için yöneticinle iletişime geç.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Abonelik Geçmişi</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Başlangıç</span>
            <span className="font-medium">{sub?.started_at ? formatDate(sub.started_at) : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Durum</span>
            <span className={cn("font-medium", status.cls)}>{status.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Dönem Ücreti</span>
            <span className="font-medium">{sub?.price ? formatPrice(sub.price) : "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
