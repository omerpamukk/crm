"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Send,
  Eye,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InstagramLogo, WhatsappLogo, EmailLogo } from "../mesajlar/channel-icons";

type PlanChannel = "instagram" | "whatsapp" | "email" | "sms";

const CHANNEL: Record<
  PlanChannel,
  { label: string; chip: string; logo?: React.ComponentType<{ className?: string }>; icon?: LucideIcon }
> = {
  instagram: { label: "Instagram", chip: "bg-pink-100 text-pink-700", logo: InstagramLogo },
  whatsapp: { label: "WhatsApp", chip: "bg-green-100 text-green-700", logo: WhatsappLogo },
  email: { label: "E-posta", chip: "bg-blue-100 text-blue-700", logo: EmailLogo },
  sms: { label: "SMS", chip: "bg-amber-100 text-amber-700", icon: MessageSquareText },
};

function ChannelTag({ channel }: { channel: PlanChannel }) {
  const c = CHANNEL[channel];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium", c.chip)}>
      {c.logo ? <c.logo className="size-3.5" /> : c.icon ? <c.icon className="size-3" /> : null}
      {c.label}
    </span>
  );
}

const WEEK: { day: string; date: number; items: { label: string; channel: PlanChannel }[] }[] = [
  { day: "PZT", date: 26, items: [{ label: "Story", channel: "instagram" }, { label: "Bülten", channel: "email" }] },
  { day: "SAL", date: 27, items: [{ label: "Kampanya", channel: "whatsapp" }] },
  { day: "ÇAR", date: 28, items: [{ label: "Reels", channel: "instagram" }, { label: "SMS", channel: "sms" }] },
  { day: "PER", date: 29, items: [] },
  { day: "CUM", date: 30, items: [{ label: "Post", channel: "instagram" }, { label: "Haftalık", channel: "email" }] },
  { day: "CMT", date: 31, items: [{ label: "Story", channel: "instagram" }] },
  { day: "PAZ", date: 1, items: [] },
];

const PENDING: { id: string; title: string; channel: PlanChannel; when: string; audience: string; status: "Taslak" | "Planlandı" }[] = [
  { id: "p1", title: "Yaz Kampanyası Duyurusu", channel: "instagram", when: "26 May, 10:00", audience: "Tüm takipçiler", status: "Taslak" },
  { id: "p2", title: "Aylık Bülten — Haziran", channel: "email", when: "26 May, 09:00", audience: "1.284 abone", status: "Planlandı" },
  { id: "p3", title: "Hafta Sonu İndirimi", channel: "sms", when: "28 May, 12:00", audience: "Aktif müşteriler", status: "Taslak" },
];

export function PlannerView() {
  const [filter, setFilter] = useState<"all" | PlanChannel>("all");
  const channels: PlanChannel[] = ["instagram", "whatsapp", "email", "sms"];
  const pending = PENDING.filter((p) => filter === "all" || p.channel === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors",
              filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            Tümü
          </button>
          {channels.map((ch) => {
            const c = CHANNEL[ch];
            const active = filter === ch;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setFilter(ch)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors",
                  active ? "ring-2 ring-primary/40" : "hover:opacity-80",
                  c.chip
                )}
              >
                {c.logo ? <c.logo className="size-3.5" /> : c.icon ? <c.icon className="size-3" /> : null}
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Önceki ay" onClick={() => toast.info("Önceki ay (demo).")}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-28 text-center text-sm font-semibold">Mayıs 2026</span>
            <Button variant="outline" size="icon" aria-label="Sonraki ay" onClick={() => toast.info("Sonraki ay (demo).")}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button onClick={() => toast.info("İçerik ekleme yakında.")}>
            <Plus className="size-4" />
            İçerik Ekle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEK.map((d) => (
          <div key={d.day} className="min-h-28 rounded-lg border bg-card p-2 shadow-soft">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">{d.day}</span>
              <span className="text-sm font-semibold">{d.date}</span>
            </div>
            <div className="space-y-1">
              {d.items
                .filter((it) => filter === "all" || it.channel === filter)
                .map((it, i) => {
                  const c = CHANNEL[it.channel];
                  return (
                    <div key={i} className={cn("flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] font-medium", c.chip)}>
                      {c.logo ? <c.logo className="size-3" /> : c.icon ? <c.icon className="size-2.5" /> : null}
                      <span className="truncate">{it.label}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Bekleyen İçerikler</h3>
        <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
          <div className="hidden grid-cols-[1.4fr_0.9fr_0.9fr_1fr_0.7fr_auto] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>İçerik</span>
            <span>Kanal</span>
            <span>Tarih / Saat</span>
            <span>Hedef Kitle</span>
            <span>Durum</span>
            <span className="text-right">İşlem</span>
          </div>
          {pending.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Bu kanalda bekleyen içerik yok.</p>
          ) : (
            <ul className="divide-y">
              {pending.map((p) => (
                <li key={p.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1.4fr_0.9fr_0.9fr_1fr_0.7fr_auto] sm:items-center sm:gap-3">
                  <span className="font-medium">{p.title}</span>
                  <span><ChannelTag channel={p.channel} /></span>
                  <span className="text-sm text-muted-foreground">{p.when}</span>
                  <span className="text-sm text-muted-foreground">{p.audience}</span>
                  <span>
                    <span
                      className={cn(
                        "inline-flex rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium",
                        p.status === "Planlandı" ? "bg-positive/12 text-positive" : "bg-warning/12 text-amber-600"
                      )}
                    >
                      {p.status}
                    </span>
                  </span>
                  <span className="flex items-center justify-end gap-1">
                    <Button variant="outline" size="icon-sm" onClick={() => toast.info("Düzenleme yakında.")}>
                      <Pencil className="size-3.5" />
                    </Button>
                    {p.status === "Planlandı" ? (
                      <Button variant="outline" size="icon-sm" onClick={() => toast.info("Önizleme (demo).")}>
                        <Eye className="size-3.5" />
                      </Button>
                    ) : (
                      <Button size="icon-sm" className="bg-positive text-white hover:bg-positive/90" onClick={() => toast.success("İçerik gönderildi (demo).")}>
                        <Send className="size-3.5" />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
