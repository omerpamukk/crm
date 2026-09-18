"use client";

import { useState } from "react";
import {
  Zap,
  BarChart3,
  Accessibility,
  Star,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Tag,
  Code2,
  Network,
  Bot,
  Braces,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SCORES = [
  { label: "Sayfa Hızı", value: 92, icon: Zap, tone: "bg-positive/10 text-positive", color: "text-positive", sub: "/ 100" },
  { label: "SEO Skoru", value: 74, icon: BarChart3, tone: "bg-warning/12 text-amber-600", color: "text-amber-600", sub: "Orta Seviye" },
  { label: "Erişilebilirlik", value: 88, icon: Accessibility, tone: "bg-sky-100 text-sky-600", color: "text-sky-600", sub: "/ 100" },
  { label: "En İyi Uygulamalar", value: 96, icon: Star, tone: "bg-positive/10 text-positive", color: "text-positive", sub: "/ 100" },
];

const BARS = [
  { label: "Sayfa Hızı", value: 92 },
  { label: "SEO Skoru", value: 74 },
  { label: "Erişilebilirlik", value: 88 },
  { label: "En İyi Uygulamalar", value: 96 },
  { label: "Mobil Uyumluluk", value: 100 },
];

const SUGGESTIONS = [
  { kind: "warn", title: "Meta açıklamaları eksik", desc: "3 sayfada meta description tanımlanmamış." },
  { kind: "warn", title: "Alt text eksik görseller", desc: "8 görselde alt metin tanımlanmamış." },
  { kind: "ok", title: "Sitemap güncel", desc: "Tüm sayfalar sitemap.xml'de listeleniyor." },
  { kind: "ok", title: "SSL Sertifikası aktif", desc: "Siteniz HTTPS ile güvenli çalışıyor." },
];

const TECH = [
  { name: "Sitemap.xml", desc: "Son güncelleme: bugün", icon: Network, tone: "bg-green-50 text-green-600", action: "Görüntüle" },
  { name: "Robots.txt", desc: "Tüm botlar için açık", icon: Bot, tone: "bg-muted text-muted-foreground", action: "Düzenle" },
  { name: "Schema.org", desc: "Yapısal veri tanımlı", icon: Braces, tone: "bg-violet-50 text-violet-600", badge: "Aktif" },
  { name: "Google Search Console", desc: "Bağlı değil", icon: Search, tone: "bg-amber-50 text-amber-600", action: "Bağla" },
  { name: "Google Analytics", desc: "Bağlı değil", icon: BarChart3, tone: "bg-orange-50 text-orange-600", action: "Bağla" },
];

const CHECKS = [
  { kind: "ok", title: "SSL Sertifikası", desc: "HTTPS aktif, sertifika geçerli", right: "Geçti" },
  { kind: "ok", title: "Mobil Uyumluluk", desc: "Tüm sayfalar responsive görüntüleniyor", right: "Geçti" },
  { kind: "ok", title: "Sayfa Hızı", desc: "Ortalama yüklenme süresi 1.3 saniye", right: "92/100" },
  { kind: "warn", title: "Eksik Meta Açıklamaları", desc: "3 sayfada meta description tanımlanmamış (Hizmetler, Hakkımızda, İletişim)", right: "Uyarı" },
  { kind: "warn", title: "Görsel Alt Metinleri Eksik", desc: "8 görselde alt text tanımlanmamış", right: "Uyarı" },
  { kind: "err", title: "Kırık Bağlantılar", desc: "2 adet 404 bağlantı tespit edildi", right: "Hata" },
  { kind: "ok", title: "Sitemap.xml", desc: "Geçerli ve Google tarafından dizinlendi", right: "Geçti" },
];

const barColor = (v: number) => (v >= 90 ? "bg-positive" : v >= 75 ? "bg-amber-500" : "bg-danger");

export default function SeoPage() {
  const [robots, setRobots] = useState("index, follow");

  return (
    <div className="space-y-6">
      <PageHeader title="SEO" description="Sitenin arama motoru performansını izle, meta etiketlerini ve teknik SEO'yu yönet." />

      {/* Skor KPI'ları */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SCORES.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <span className={cn("flex size-9 items-center justify-center rounded-lg", s.tone)}>
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <div className={cn("text-3xl font-bold tracking-tight", s.color)}>{s.value}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Detaylı analiz */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4 text-primary" />Detaylı Analiz</CardTitle>
            <span className="rounded-full bg-warning/12 px-2 py-1 text-xs font-medium text-amber-600">İyileştirme Önerileri</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {BARS.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-semibold tabular-nums">{b.value}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", barColor(b.value))} style={{ width: `${b.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Öneriler */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="size-4 text-primary" />Öneriler</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <div key={s.title} className={cn("flex items-start gap-2.5 rounded-lg border p-3", s.kind === "warn" ? "border-warning/30 bg-warning/[0.06]" : "border-positive/30 bg-positive/[0.05]")}>
                {s.kind === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" />}
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Meta etiketleri */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Tag className="size-4 text-primary" />Meta Etiketleri</CardTitle>
            <Button size="sm" onClick={() => toast.success("Meta etiketleri kaydedildi (demo).")}>Kaydet</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Site Başlığı" defaultValue="Defne Beauty Center — Güzellik & Bakım Merkezi" />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meta Açıklaması</label>
              <textarea rows={3} defaultValue="Güzellik ve bakım hizmetleri için online randevu, fiyat listesi ve müşteri yorumları." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <Field label="Anahtar Kelimeler" defaultValue="güzellik merkezi, saç bakımı, cilt bakımı, randevu" />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Robots</label>
              <select value={robots} onChange={(e) => setRobots(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option>index, follow</option>
                <option>noindex, follow</option>
                <option>index, nofollow</option>
                <option>noindex, nofollow</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Teknik SEO */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Code2 className="size-4 text-primary" />Teknik SEO</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {TECH.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.name} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", t.tone)}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                  {t.badge ? (
                    <span className="rounded-full bg-positive/12 px-2 py-0.5 text-xs font-medium text-positive">{t.badge}</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => toast.info(`${t.name}: ${t.action} (demo).`)}>{t.action}</Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Site checker */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><Search className="size-4 text-primary" />Site Checker</CardTitle>
          <Button size="sm" onClick={() => toast.success("Tarama tamamlandı (demo).")}>
            <RefreshCw className="size-4" />
            Şimdi Tara
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {CHECKS.map((c) => (
            <div key={c.title} className={cn("flex items-center gap-3 rounded-lg border p-3",
              c.kind === "ok" && "border-positive/30 bg-positive/[0.05]",
              c.kind === "warn" && "border-warning/30 bg-warning/[0.06]",
              c.kind === "err" && "border-danger/30 bg-danger/[0.05]")}>
              {c.kind === "ok" ? <CheckCircle2 className="size-4 shrink-0 text-positive" /> : c.kind === "warn" ? <AlertTriangle className="size-4 shrink-0 text-amber-600" /> : <XCircle className="size-4 shrink-0 text-danger" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
              <span className={cn("shrink-0 text-xs font-semibold",
                c.kind === "ok" ? "text-positive" : c.kind === "warn" ? "text-amber-600" : "text-danger")}>
                {c.right}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>Son tarama: Bugün 09:42</span>
            <span>4 geçti · 2 uyarı · 1 hata</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}
