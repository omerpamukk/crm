"use client";

import { useState } from "react";
import {
  Users,
  Eye,
  MousePointerClick,
  Clock,
  Globe,
  Pencil,
  ExternalLink,
  Plus,
  EyeOff,
  Trash2,
  LayoutGrid,
  FileText,
  Mail,
  CheckCircle2,
  Upload,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KPIS = [
  { label: "Ziyaretçi (Bu Ay)", value: "8.420", icon: Users, tone: "bg-primary/10 text-primary", bar: "border-l-primary", trend: "+14%", up: true },
  { label: "Sayfa Görüntüleme", value: "24.810", icon: Eye, tone: "bg-positive/10 text-positive", bar: "border-l-positive", trend: "+9%", up: true },
  { label: "Dönüşüm Oranı", value: "%3.8", icon: MousePointerClick, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", trend: "+0.4%", up: true },
  { label: "Ort. Oturum Süresi", value: "2:34", icon: Clock, tone: "bg-sky-100 text-sky-600", bar: "border-l-sky-400", trend: "-12sn", up: false },
];

type Page = { id: string; name: string; url: string; icon: typeof LayoutGrid; views: number | null; status: "Yayında" | "Taslak" };

const INITIAL_GROUPS: { group: string; pages: Page[] }[] = [
  { group: "Ana Sayfa Grubu", pages: [
    { id: "p1", name: "Ana Sayfa", url: "www.atahandursun.com/", icon: LayoutGrid, views: 12400, status: "Yayında" },
    { id: "p2", name: "Hakkımızda", url: "www.atahandursun.com/hakkimizda", icon: FileText, views: 2100, status: "Yayında" },
  ]},
  { group: "Landing Sayfaları", pages: [
    { id: "p3", name: "Hizmetler", url: "www.atahandursun.com/hizmetler", icon: LayoutGrid, views: 5200, status: "Yayında" },
    { id: "p4", name: "Özel Teklif — Yaz Kampanyası", url: "www.atahandursun.com/yaz-kampanyasi", icon: LayoutGrid, views: null, status: "Taslak" },
  ]},
  { group: "Diğer Sayfalar", pages: [
    { id: "p5", name: "İletişim", url: "www.atahandursun.com/iletisim", icon: Mail, views: 3110, status: "Yayında" },
  ]},
];

const MEDIA = [
  "from-violet-400 to-indigo-500",
  "from-pink-400 to-rose-400",
  "from-sky-400 to-cyan-400",
  "from-emerald-400 to-green-500",
  "from-amber-400 to-orange-500",
];

export default function SayfalarPage() {
  const [groups, setGroups] = useState(INITIAL_GROUPS);

  function removePage(id: string) {
    setGroups((prev) => prev.map((g) => ({ ...g, pages: g.pages.filter((p) => p.id !== id) })));
    toast.success("Sayfa silindi");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Web Yönetimi — Sayfalar" description="Web sitenin sayfalarını, alan adını ve medyasını buradan yönet.">
        <Button onClick={() => toast.info("Yeni sayfa oluşturma yakında.")}>
          <Plus className="size-4" />
          Yeni Sayfa
        </Button>
      </PageHeader>

      {/* KPI'lar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={cn("border-l-4", k.bar)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
                <span className={cn("flex size-9 items-center justify-center rounded-lg", k.tone)}>
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
                <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", k.up ? "text-positive" : "text-danger")}>
                  {k.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {k.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alan adı */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Globe className="size-4 text-primary" />
              Alan Adı
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-positive/12 px-2 py-1 text-xs font-medium text-positive">
                <CheckCircle2 className="size-3.5" />
                Doğrulandı
              </span>
              <Button variant="outline" size="sm" onClick={() => toast.info("Alan adı değiştirme yakında.")}>
                <Pencil className="size-3.5" />
                Değiştir
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3 text-sm">
              <Globe className="size-4 text-muted-foreground" />
              www.atahandursun.com
            </div>
            <Button variant="outline" asChild>
              <a href="https://www.atahandursun.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Görüntüle
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sayfalar listesi */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="size-4 text-primary" />
            Sayfalar
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {groups.reduce((s, g) => s + g.pages.length, 0)}
            </span>
          </CardTitle>
          <Button size="sm" onClick={() => toast.info("Yeni sayfa oluşturma yakında.")}>
            <Plus className="size-4" />
            Yeni Sayfa Oluştur
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</span>
                <span className="text-xs text-muted-foreground">{g.pages.length}</span>
              </div>
              <ul className="space-y-1.5">
                {g.pages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.url}</p>
                      </div>
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {p.views != null ? `${p.views.toLocaleString("tr-TR")} görüntülenme` : "Taslak"}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", p.status === "Yayında" ? "bg-positive/12 text-positive" : "bg-warning/12 text-amber-600")}>
                        {p.status}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="sm" onClick={() => toast.info(`“${p.name}” düzenleme yakında.`)}>
                          <Pencil className="size-3.5" />
                          Düzenle
                        </Button>
                        <Button variant="outline" size="icon-sm" title={p.status === "Yayında" ? "Gizle" : "Yayınla"} onClick={() => toast.info("Görünürlük değişimi (demo).")}>
                          <EyeOff className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="icon-sm" className="text-danger" title="Sil" onClick={() => removePage(p.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Medya kütüphanesi */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4 text-primary" />
            Medya Kütüphanesi
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => toast.info("Medya yükleme yakında.")}>
            <Upload className="size-4" />
            Yükle
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {MEDIA.map((g, i) => (
              <div key={i} className={cn("aspect-square rounded-xl bg-gradient-to-br", g)} />
            ))}
            <button
              type="button"
              onClick={() => toast.info("Medya yükleme yakında.")}
              className="flex aspect-square items-center justify-center rounded-xl border border-dashed text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <Plus className="size-6" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
