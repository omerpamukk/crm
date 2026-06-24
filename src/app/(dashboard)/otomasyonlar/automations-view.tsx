"use client";

import { useState } from "react";
import { Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const TONE: Record<string, string> = {
  pink: "bg-pink-100 text-pink-700",
  purple: "bg-violet-100 text-violet-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-rose-100 text-rose-700",
  gray: "bg-muted text-muted-foreground",
};

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

type Automation = {
  id: string;
  title: string;
  meta: string;
  active: boolean;
  bg: string;
  trigger: { text: string; tone: keyof typeof TONE };
  action: { text: string; tone: keyof typeof TONE };
};

const INITIAL: Automation[] = [
  { id: "a1", title: "Meta Lead Form Otomasyonu", meta: "Son 7 günde 18 lead", active: true, bg: "from-violet-50 to-indigo-50", trigger: { text: "Meta Lead Formu", tone: "purple" }, action: { text: "Potansiyel + WhatsApp", tone: "green" } },
  { id: "a2", title: "DM → Potansiyel Müşteri", meta: "IG, WA, MS, TT", active: true, bg: "from-pink-50 to-rose-50", trigger: { text: "Anahtar kelime: ‘fiyat’", tone: "pink" }, action: { text: "Potansiyele eklendi", tone: "gray" } },
  { id: "a3", title: "Yeni Takipçi → Hoşgeldin DM", meta: "Instagram", active: false, bg: "from-fuchsia-50 to-purple-50", trigger: { text: "Yeni takipçi", tone: "pink" }, action: { text: "Otomatik hoşgeldin DM", tone: "purple" } },
  { id: "a4", title: "DM Geldiğinde Otomatik Yanıt", meta: "Tüm kanallar", active: true, bg: "from-sky-50 to-blue-50", trigger: { text: "Yeni DM", tone: "blue" }, action: { text: "‘Mesajınız alındı ✅’", tone: "blue" } },
  { id: "a5", title: "Yoruma Cevap & Otomatik DM", meta: "IG / TikTok", active: false, bg: "from-rose-50 to-pink-50", trigger: { text: "Gönderi yorumu", tone: "purple" }, action: { text: "Yorum yanıtı + DM", tone: "pink" } },
];

export function AutomationsView() {
  const [items, setItems] = useState(INITIAL);

  function toggle(id: string) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => (
        <Card key={a.id} className="overflow-hidden">
          <div className={cn("bg-gradient-to-br p-4", a.bg)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs", TONE[a.trigger.tone])}>
                {a.trigger.text}
              </span>
              <span className="flex size-6 items-center justify-center rounded-full bg-white/80 text-primary shadow-xs">
                <ArrowRight className="size-3.5" />
              </span>
              <span className={cn("rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs", TONE[a.action.tone])}>
                {a.action.text}
              </span>
            </div>
          </div>
          <CardContent className="flex items-start justify-between gap-2 p-4">
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{a.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", a.active ? "bg-positive" : "bg-muted-foreground/40")} />
                {a.active ? "Aktif" : "Pasif"} · {a.meta}
              </p>
            </div>
            <Switch on={a.active} onClick={() => toggle(a.id)} />
          </CardContent>
        </Card>
      ))}

      <button
        type="button"
        onClick={() => toast.info("Otomasyon şablonları yakında.")}
        className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 p-4 text-center transition-colors hover:bg-muted/40"
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Plus className="size-6" />
        </span>
        <span className="font-semibold">Yeni Otomasyon</span>
        <span className="text-xs text-muted-foreground">Şablondan seç veya sıfırdan oluştur</span>
      </button>
    </div>
  );
}
