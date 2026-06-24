"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Send,
  Eye,
  RotateCcw,
  MessageSquareText,
  Hash,
  Megaphone,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  InstagramLogo,
  WhatsappLogo,
  EmailLogo,
} from "../mesajlar/channel-icons";
import { generateCopy } from "./copywriter-actions";

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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", c.chip)}>
      {c.logo ? <c.logo className="size-3.5" /> : c.icon ? <c.icon className="size-3" /> : null}
      {c.label}
    </span>
  );
}

// ---- DEMO veri ----
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

export function ContentPlanner() {
  return (
    <Tabs defaultValue="plan">
      <TabsList>
        <TabsTrigger value="plan">
          <CalendarDays className="size-4" />
          Sosyal Medya Planı
        </TabsTrigger>
        <TabsTrigger value="writer">
          <Sparkles className="size-4" />
          Metin Yazıcı (AI)
        </TabsTrigger>
      </TabsList>

      <TabsContent value="plan" className="mt-4">
        <Planner />
      </TabsContent>
      <TabsContent value="writer" className="mt-4">
        <Writer />
      </TabsContent>
    </Tabs>
  );
}

function Planner() {
  const [filter, setFilter] = useState<"all" | PlanChannel>("all");
  const channels: PlanChannel[] = ["instagram", "whatsapp", "email", "sms"];

  const pending = PENDING.filter((p) => filter === "all" || p.channel === filter);

  return (
    <div className="space-y-5">
      {/* Filtre + ay gezinme */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
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
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
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
            <Button variant="outline" size="icon" onClick={() => toast.info("Önceki ay (demo).")}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-28 text-center text-sm font-semibold">Mayıs 2026</span>
            <Button variant="outline" size="icon" onClick={() => toast.info("Sonraki ay (demo).")}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button onClick={() => toast.info("İçerik ekleme yakında.")}>
            <Plus className="size-4" />
            İçerik Ekle
          </Button>
        </div>
      </div>

      {/* Hafta ızgarası */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEK.map((d) => (
          <div key={d.day} className="min-h-28 rounded-xl border bg-card p-2 shadow-xs">
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
                    <div
                      key={i}
                      className={cn("flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] font-medium", c.chip)}
                    >
                      {c.logo ? <c.logo className="size-3" /> : c.icon ? <c.icon className="size-2.5" /> : null}
                      <span className="truncate">{it.label}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Bekleyen içerikler */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Bekleyen İçerikler</h3>
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
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
                <li
                  key={p.id}
                  className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1.4fr_0.9fr_0.9fr_1fr_0.7fr_auto] sm:items-center sm:gap-3"
                >
                  <span className="font-medium">{p.title}</span>
                  <span><ChannelTag channel={p.channel} /></span>
                  <span className="text-sm text-muted-foreground">{p.when}</span>
                  <span className="text-sm text-muted-foreground">{p.audience}</span>
                  <span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
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

type ChatMsg = { id: string; role: "user" | "assistant"; text: string };

const TYPES: { label: string; tone: string }[] = [
  { label: "Caption", tone: "bg-pink-100 text-pink-700" },
  { label: "WhatsApp", tone: "bg-green-100 text-green-700" },
  { label: "E-posta", tone: "bg-blue-100 text-blue-700" },
  { label: "SMS", tone: "bg-amber-100 text-amber-700" },
  { label: "Reklam", tone: "bg-rose-100 text-rose-700" },
  { label: "Hashtag", tone: "bg-muted text-muted-foreground" },
  { label: "Blog", tone: "bg-emerald-100 text-emerald-700" },
];

const SUGGESTIONS: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Instagram caption yaz", icon: InstagramLogo },
  { label: "WhatsApp kampanya mesajı", icon: MessageSquareText },
  { label: "E-posta bülteni yaz", icon: FileText },
  { label: "SMS kampanyası", icon: MessageSquareText },
  { label: "Reklam metni oluştur", icon: Megaphone },
  { label: "Hashtag önerileri ver", icon: Hash },
  { label: "Blog yazısı başlığı", icon: FileText },
];

function Writer() {
  const WELCOME =
    "Merhaba! ✍️ Ben senin AI metin asistanınım. Aşağıdaki önerilerden birini seçebilir ya da doğrudan yazabilirsin.\n\nÖrnek: \"Yaz indirimi için Instagram caption yaz, eğlenceli ve emojili olsun\" veya \"WhatsApp kampanya mesajı, profesyonel ton, kısa.\"";
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "w", role: "assistant", text: WELCOME },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function ask(text: string) {
    const clean = text.trim();
    if (!clean || pending) return;
    const userMsg: ChatMsg = { id: `u-${new Date().getTime()}`, role: "user", text: clean };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    startTransition(async () => {
      const res = await generateCopy(clean);
      setMessages((prev) => [
        ...prev,
        { id: `a-${new Date().getTime()}`, role: "assistant", text: res.error ? res.error : res.text },
      ]);
    });
  }

  function reset() {
    setMessages([{ id: "w", role: "assistant", text: WELCOME }]);
    setDraft("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Sol: asistan kartı */}
      <div className="rounded-xl border bg-primary/[0.04] p-5 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm">
          <Sparkles className="size-8" />
        </div>
        <p className="mt-3 font-semibold">Yazar</p>
        <p className="text-xs text-muted-foreground">AI Metin Asistanı</p>

        <p className="mt-4 text-xs font-medium text-muted-foreground">Yazı türleri</p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => ask(`${t.label} metni yaz`)}
              className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80", t.tone)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs">
          <span className="size-2 rounded-full bg-positive" />
          Hazır
        </div>
      </div>

      {/* Sağ: sohbet */}
      <div className="flex min-h-[460px] flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Metin Yazıcı — AI</p>
              <p className="text-xs text-muted-foreground">Ne yazmamı istersin? Söyle, hemen üreteyim.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-4" />
            Sıfırla
          </Button>
        </div>

        {/* Mesajlar */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/[0.06] text-foreground"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-primary/[0.06] px-4 py-2.5 text-sm text-muted-foreground">
                Yazıyor…
              </div>
            </div>
          )}
        </div>

        {/* Öneri çipleri */}
        <div className="flex flex-wrap gap-1.5 border-t px-3 pt-3">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => ask(s.label)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Icon className="size-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Giriş */}
        <div className="flex items-center gap-2 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
            placeholder="Ne yazmamı istersin? (platform, konu, ton belirt...)"
            className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => ask(draft)}
            disabled={pending || !draft.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
