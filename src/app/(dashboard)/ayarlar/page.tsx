"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InstagramLogo, WhatsappLogo, TiktokLogo, EmailLogo } from "../mesajlar/channel-icons";

const DAYS = [
  { key: "Pzt", start: "09:00", end: "20:00", on: true },
  { key: "Sal", start: "09:00", end: "20:00", on: true },
  { key: "Çar", start: "09:00", end: "20:00", on: true },
  { key: "Per", start: "09:00", end: "20:00", on: true },
  { key: "Cum", start: "09:00", end: "20:00", on: true },
  { key: "Cmt", start: "10:00", end: "18:00", on: true },
  { key: "Paz", start: "", end: "", on: false },
];

const CRM_NOTIFS = [
  "Yeni lead geldiğinde bildir",
  "Gecikmiş ödeme uyarısı",
  "Randevu hatırlatması",
  "Görev deadline yaklaşınca",
  "Google yorum geldiğinde",
  "Kritik stok uyarısı",
];

const LOGS = [
  { t: "31 May 11:42", tone: "bg-primary", text: <><b>@Ayşe</b> Aktif Müşteri <b>@Zeynep Arslan</b>&apos;a 2.000₺ cilt bakımı seansı ekledi.</> },
  { t: "31 May 10:15", tone: "bg-positive", text: <><b>@Atahan</b> yeni müşteri <b>Büşra Kaya</b>&apos;yı sisteme ekledi.</> },
  { t: "30 May 16:30", tone: "bg-amber-500", text: <><b>@Zeynep</b> <b>@Ahmet Çelik</b>&apos;in 7.000₺ ödemesini &quot;Gecikmiş&quot; olarak işaretledi.</> },
  { t: "30 May 14:00", tone: "bg-danger", text: <><b>@Ayşe</b> <b>Seda Yılmaz</b> adlı potansiyel müşteriyi sildi.</> },
  { t: "29 May 09:45", tone: "bg-primary", text: <><b>@Atahan</b> Personel <b>Ayşe Yılmaz</b>&apos;ın maaşını ₺18.000&apos;dan ₺18.500&apos;a güncelledi.</> },
  { t: "29 May 08:02", tone: "bg-muted-foreground", text: <><b>@Mehmet</b> sisteme giriş yaptı. <span className="text-muted-foreground">IP: 192.168.x.x</span></> },
  { t: "28 May 17:20", tone: "bg-positive", text: <><b>@Zeynep</b> Google yorum <b>&quot;Fatma D.&quot;</b>&apos;ye yanıt gönderdi.</> },
  { t: "27 May 12:10", tone: "bg-primary", text: <><b>@Atahan</b> Lazer Epilasyon paket fiyatını ₺34.000&apos;dan ₺36.000&apos;a güncelledi.</> },
];

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function Field({ label, hint, defaultValue, placeholder, disabled }: { label: string; hint?: string; defaultValue?: string; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{hint && <span className="ml-1 normal-case text-muted-foreground/70">({hint})</span>}
      </label>
      <input defaultValue={defaultValue} placeholder={placeholder} disabled={disabled} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:bg-muted/40 disabled:text-muted-foreground" />
    </div>
  );
}

export default function AyarlarPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description="İşletme bilgilerini, çalışma saatlerini, bildirimleri ve entegrasyonları yönet.">
        <Button onClick={() => toast.success("Ayarlar kaydedildi (demo).")}>
          <Save className="size-4" />
          Kaydet
        </Button>
      </PageHeader>

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
                <Button size="sm" onClick={() => toast.success("Firma bilgileri kaydedildi (demo).")}><Save className="size-4" />Kaydet</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Firma Adı" defaultValue="Defne Beauty Center" />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektör</label>
                  <select defaultValue="Güzellik & Bakım" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option>Güzellik &amp; Bakım</option><option>Klinik</option><option>Spor Salonu</option><option>Masaj Salonu</option><option>Diğer</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Firma Telefonu" defaultValue="+90 532 000 0000" />
                  <Field label="E-posta" defaultValue="info@defnebeauty.com" />
                </div>
                <Field label="Adres" defaultValue="Bağcılar, İstanbul, Türkiye" />
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
              <CardHeader><CardTitle className="text-base">İşletme Sahibi</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Ad Soyad" defaultValue="Atahan T." />
                <Field label="Telefon" hint="opsiyonel" placeholder="+90 5xx xxx xx xx" />
                <Field label="E-posta" defaultValue="uatahandursun@icloud.com" />
                <Field label="Rol" defaultValue="Ana Yönetici" disabled />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Çalışma Saatleri */}
        <TabsContent value="saat" className="mt-4">
          <WorkingHours />
        </TabsContent>

        {/* Bildirimler */}
        <TabsContent value="bildirim" className="mt-4">
          <Notifications />
        </TabsContent>

        {/* Entegrasyonlar */}
        <TabsContent value="entegrasyon" className="mt-4">
          <Integrations />
        </TabsContent>

        {/* Abonelik */}
        <TabsContent value="abonelik" className="mt-4">
          <Subscription />
        </TabsContent>

        {/* Sistem Logları */}
        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Son 30 günün tüm işlem kayıtları</CardTitle>
              <div className="flex gap-2">
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm"><option>Tüm İşlemler</option><option>Müşteri</option><option>Ödeme</option><option>Personel</option></select>
                <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm"><option>Tüm Kullanıcılar</option><option>Atahan</option><option>Ayşe</option><option>Zeynep</option></select>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {LOGS.map((l, i) => (
                  <li key={i} className="flex items-start gap-3 py-3 text-sm">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{l.t}</span>
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", l.tone)} />
                    <span className="flex-1">{l.text}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-center pt-3">
                <Button variant="outline" size="sm" onClick={() => toast.success("Loglar Excel'e aktarılıyor (demo).")}><FileSpreadsheet className="size-4" />Tüm Logları Excel&apos;e Aktar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkingHours() {
  const [plan, setPlan] = useState("Ana Çalışma Düzeni");
  const [days, setDays] = useState(DAYS);
  const [sync, setSync] = useState({ maps: true, booking: true });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["Ana Çalışma Düzeni", "Plan 1", "Plan 2"].map((p) => (
          <button key={p} type="button" onClick={() => setPlan(p)} className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", plan === p ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-muted")}>
            {p}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" />{plan}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Bu bilgiler randevu linki, web sitesi ve otomasyonlara otomatik yansır.</p>
          </div>
          <Button size="sm" onClick={() => toast.success("Çalışma saatleri kaydedildi (demo).")}><Save className="size-4" />Kaydet</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.map((d, i) => (
            <div key={d.key} className="flex items-center gap-3">
              <span className="w-10 text-sm font-medium">{d.key}</span>
              <Switch on={d.on} onClick={() => setDays((prev) => prev.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
              {d.on ? (
                <div className="flex items-center gap-2">
                  <input type="time" defaultValue={d.start || "09:00"} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" />
                  <span className="text-muted-foreground">—</span>
                  <input type="time" defaultValue={d.end || "18:00"} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" />
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
              <Button variant="outline" size="icon" onClick={() => toast.success("API anahtarı kopyalandı (demo).")}><Copy className="size-4" /></Button>
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

function Subscription() {
  const QUOTA = [
    { label: "Kullanıcılar", value: "3 / 5", pct: 60, color: "bg-primary" },
    { label: "Müşteri Kayıtları", value: "892 / Sınırsız", pct: 30, color: "bg-positive" },
    { label: "Bu Ay SMS", value: "248 / 500", pct: 50, color: "bg-amber-500" },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Crown className="size-4 text-primary" />Mevcut Paket</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
            <p className="text-lg font-bold text-primary">Pro Plan</p>
            <p className="text-sm text-muted-foreground">Tüm özellikler aktif · 5 kullanıcıya kadar</p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Abonelik Bitiş</p>
                <p className="font-semibold">31 Aralık 2026</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Kalan Süre</p>
                <p className="font-semibold text-positive">214 gün</p>
              </div>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {["Sınırsız müşteri", "Tüm mesajlaşma kanalları", "Gelişmiş raporlar", "AI asistan"].map((f) => (
              <li key={f} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-positive" />{f}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button onClick={() => toast.info("Paket yükseltme (demo).")}>Paketi Yükselt</Button>
            <Button variant="outline" onClick={() => toast.info("Fatura geçmişi (demo).")}>Fatura Geçmişi</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Kullanıcı Kotası</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {QUOTA.map((q) => (
            <div key={q.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{q.label}</span>
                <span className="font-semibold">{q.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", q.color)} style={{ width: `${q.pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
