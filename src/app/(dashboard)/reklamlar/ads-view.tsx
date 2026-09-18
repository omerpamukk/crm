"use client";

import { useState } from "react";
import {
  Bot,
  Eye,
  MousePointerClick,
  Coins,
  Sparkles,
  BarChart3,
  Pause,
  Play,
  Plus,
  Check,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { InstagramLogo, FacebookLogo } from "../mesajlar/channel-icons";

type Platform = "instagram" | "facebook";

export interface AdCampaign {
  id: string;
  name: string;
  platform: Platform;
  status: "active" | "paused";
  impressions: string;
  ctr: string;
  spend: string;
  budgetUsed: number;
  budgetTotal: number;
  daysLeft?: number;
}

const PLATFORM = {
  instagram: { logo: InstagramLogo, label: "Instagram" },
  facebook: { logo: FacebookLogo, label: "Facebook" },
};

const KPIS: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
  bar: string;
  sub: string;
  subTone: string;
}[] = [
  { label: "Aktif AI Reklam", value: "2", icon: Bot, tone: "bg-primary/10 text-primary", bar: "border-l-primary", sub: "⚡ Çalışıyor", subTone: "text-positive" },
  { label: "Toplam Gösterim", value: "12.4K", icon: Eye, tone: "bg-positive/10 text-positive", bar: "border-l-positive", sub: "↗ +24%", subTone: "text-positive" },
  { label: "Tıklanma (CTR)", value: "%4.2", icon: MousePointerClick, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", sub: "↗ +0.8%", subTone: "text-positive" },
  { label: "Reklam Harcaması", value: "₺3.200", icon: Coins, tone: "bg-pink-100 text-pink-600", bar: "border-l-pink-400", sub: "Bu ay", subTone: "text-muted-foreground" },
];

export function AdsView({ initialCampaigns }: { initialCampaigns: AdCampaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [suggestionOpen, setSuggestionOpen] = useState(true);

  function toggleStatus(id: string) {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === "active" ? "paused" : "active" } : c
      )
    );
    const c = campaigns.find((x) => x.id === id);
    toast.success(c?.status === "active" ? "Kampanya duraklatıldı" : "Kampanya devam ediyor");
  }

  return (
    <div className="space-y-6">
      {/* KPI'lar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => {
          return (
            <div key={k.label} className="surface p-5">
                              <p className="section-label">{k.label}</p>
                              <p className="metric-value mt-2">{k.value}</p>
                              <p className={cn("mt-1 text-xs font-medium", k.subTone)}>{k.sub}</p>
                            </div>
          );
        })}
      </div>

      {/* AI bilgi şeridi */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm">
          <span className="font-semibold">AI Destekli Reklam Yönetimi</span>{" "}
          <span className="text-muted-foreground">
            — Yapay zeka hedef kitleyi, reklam metnini ve bütçeyi otomatik optimize eder.
            Meta (Instagram/Facebook) ve Google entegrasyonu yakında aktif olacak.
          </span>
        </p>
      </div>

      {/* Kampanyalar */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="size-5 text-primary" />
          AI Reklam Kampanyaları
        </h2>
        <Button onClick={() => toast.info("Yeni kampanya oluşturma yakında (Meta/Google entegrasyonu).")}>
          <Plus className="size-4" />
          Yeni Kampanya
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {campaigns.map((c) => {
          const p = PLATFORM[c.platform];
          const Logo = p.logo;
          const active = c.status === "active";
          const pct = Math.min(Math.round((c.budgetUsed / c.budgetTotal) * 100), 100);
          return (
            <Card key={c.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border bg-card">
                      <Logo className="size-6" />
                    </span>
                    <div>
                      <p className="font-semibold leading-tight">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{p.label} · AI Optimize</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium",
                      active ? "bg-positive/12 text-positive" : "bg-warning/12 text-amber-600"
                    )}
                  >
                    {active ? "Aktif" : "Duraklatıldı"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{c.impressions}</p>
                    <p className="text-xs text-muted-foreground">Gösterim</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-positive">{c.ctr}</p>
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">{c.spend}</p>
                    <p className="text-xs text-muted-foreground">Harcama</p>
                  </div>
                </div>

                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", active ? "bg-primary" : "bg-muted-foreground/40")} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Bütçe: ₺{c.budgetUsed.toLocaleString("tr-TR")} / ₺{c.budgetTotal.toLocaleString("tr-TR")} kullanıldı
                    {c.daysLeft != null && active ? ` · ${c.daysLeft} gün kaldı` : " · Duraklatıldı"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => toast.info("Detaylı analitik yakında.")}
                  >
                    <BarChart3 className="size-4" />
                    Analitik
                  </Button>
                  <Button
                    variant={active ? "destructive" : "default"}
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleStatus(c.id)}
                  >
                    {active ? <Pause className="size-4" /> : <Play className="size-4" />}
                    {active ? "Duraklat" : "Devam Et"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI optimizasyon önerisi */}
      {suggestionOpen && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="size-4" />
              </span>
              <h3 className="font-semibold text-primary">AI Optimizasyon Önerisi</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Güzellik &amp; Bakım</span> kampanyanızın CTR&apos;ı geçen
              haftaya göre %12 arttı. Hedef kitlenizi <span className="font-semibold text-foreground">30-40 yaş</span> ile
              daraltırsanız dönüşüm oranı tahminen <span className="font-semibold text-foreground">%18 yükselebilir</span>.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Öneri uygulandı: hedef kitle 30-40 yaş ile daraltıldı.");
                  setSuggestionOpen(false);
                }}
              >
                <Check className="size-4" />
                Öneriyi Uygula
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSuggestionOpen(false)}>
                <X className="size-4" />
                Yoksay
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
