"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Clock,
  Star,
  RotateCcw,
  ClipboardCheck,
  Megaphone,
  Calendar,
  Gift,
  Tag,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

const TAGS: { label: string; icon: LucideIcon; tone: string; border: string }[] = [
  { label: "Randevu Hatırlatma", icon: Calendar, tone: "text-blue-600 bg-blue-50", border: "border-blue-200" },
  { label: "Form Dolduranlar", icon: ClipboardCheck, tone: "text-green-600 bg-green-50", border: "border-green-200" },
  { label: "Reklamdan Form Dolduranlar", icon: Megaphone, tone: "text-amber-600 bg-amber-50", border: "border-amber-200" },
  { label: "Satın Almaktan Vazgeçti", icon: RotateCcw, tone: "text-rose-600 bg-rose-50", border: "border-rose-200" },
  { label: "İşlemi Biten Müşteri", icon: Star, tone: "text-violet-600 bg-violet-50", border: "border-violet-200" },
];

type Reminder = { id: string; title: string; meta: string; icon: LucideIcon; tone: string; on: boolean };

const WA: Reminder[] = [
  { id: "w1", title: "Randevu Hatırlatma (24 saat önce)", meta: "WhatsApp · Otomatik · 24 saat önce", icon: CalendarCheck, tone: "bg-green-50 text-green-600", on: true },
  { id: "w2", title: "Randevu Hatırlatma (2 saat önce)", meta: "WhatsApp · Otomatik · 2 saat önce", icon: Clock, tone: "bg-green-50 text-green-600", on: true },
  { id: "w3", title: "Değerlendirme İsteği", meta: "WhatsApp · Otomatik · ‘İşlemi Biten Müşteri’ + 1 gün", icon: Star, tone: "bg-amber-50 text-amber-600", on: true },
  { id: "w4", title: "Pasif Müşteri Geri Kazanım", meta: "WhatsApp · Otomatik · 30 gün işlem yok", icon: RotateCcw, tone: "bg-violet-50 text-violet-600", on: false },
  { id: "w5", title: "Form Dolduranlar — Ön Görüşme Onayı", meta: "WhatsApp · Otomatik · ‘Form Dolduranlar’ anında", icon: ClipboardCheck, tone: "bg-green-50 text-green-600", on: true },
  { id: "w6", title: "Reklamdan Form Dolduranlar — Ön Görüşme", meta: "WhatsApp · Otomatik · etiket anında", icon: Megaphone, tone: "bg-amber-50 text-amber-600", on: true },
];

const SMS: Reminder[] = [
  { id: "s1", title: "Randevu SMS", meta: "SMS · Otomatik · 1 gün önce", icon: Calendar, tone: "bg-amber-50 text-amber-600", on: true },
  { id: "s2", title: "Doğum Günü SMS", meta: "SMS · Otomatik · Doğum günü — 09:00", icon: Gift, tone: "bg-rose-50 text-rose-600", on: true },
];

function ReminderList({ items }: { items: Reminder[] }) {
  const [list, setList] = useState(items);
  return (
    <div className="space-y-2">
      {list.map((r) => {
        const Icon = r.icon;
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", r.tone)}>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
            </div>
            <Switch on={r.on} onClick={() => setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))} />
          </div>
        );
      })}
    </div>
  );
}

export function RemindersView() {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Tag className="size-4 text-primary" />
            Etiketler
          </h3>
          <Button variant="outline" size="sm" onClick={() => toast.info("Yeni etiket ekleme yakında.")}>
            <Plus className="size-4" />
            Yeni Etiket
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TAGS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className={cn("rounded-xl border-2 bg-card p-3 text-center", t.border)}>
                <span className={cn("mx-auto flex size-9 items-center justify-center rounded-lg", t.tone)}>
                  <Icon className="size-5" />
                </span>
                <p className="mt-2 text-xs font-semibold leading-tight">{t.label}</p>
                <p className="text-[10px] text-muted-foreground">Sistem Etiketi</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[#075E54]">WhatsApp Hatırlatıcıları</h3>
        <ReminderList items={WA} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-amber-600">SMS Hatırlatıcıları</h3>
        <ReminderList items={SMS} />
      </section>
    </div>
  );
}
