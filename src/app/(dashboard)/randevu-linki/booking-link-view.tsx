"use client";

import { useState, useTransition } from "react";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Power,
  RefreshCw,
  Clock,
  Scissors,
  CalendarDays,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import type { BookingSettings, Service } from "@/types/database";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

import {
  toggleServiceBookable,
  updateBookingSettings,
  setBookingActive,
  regenerateBookingToken,
} from "./booking-actions";

const DAYS = [
  { v: 1, label: "Pzt" },
  { v: 2, label: "Sal" },
  { v: 3, label: "Çar" },
  { v: 4, label: "Per" },
  { v: 5, label: "Cum" },
  { v: 6, label: "Cmt" },
  { v: 7, label: "Paz" },
];

const SLOTS = [15, 20, 30, 45, 60];

export function BookingLinkView({
  settings,
  services,
}: {
  settings: BookingSettings;
  services: Service[];
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = origin ? `${origin}/randevu/${settings.token}` : "";
  const display = link.replace(/^https?:\/\//, "");

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link kopyalandı");
    window.setTimeout(() => setCopied(false), 1500);
  }

  function toggleActive() {
    startTransition(async () => {
      const res = await setBookingActive(settings.id, !settings.is_active);
      if (res.error) toast.error(res.error);
      else toast.success(settings.is_active ? "Link kapatıldı" : "Link açıldı");
    });
  }

  function regenerate() {
    if (
      !window.confirm(
        "Yeni link oluşturulsun mu? Eski link artık çalışmayacak ve paylaştığın yerlerde güncellemen gerekir."
      )
    )
      return;
    startTransition(async () => {
      const res = await regenerateBookingToken(settings.id);
      if (res.error) toast.error(res.error);
      else toast.success("Yeni link oluşturuldu");
    });
  }

  const bookable = services.filter((s) => s.bookable !== false);

  return (
    <div className="space-y-6">
      {/* Link bandı */}
      <Card
        className={cn(
          "overflow-hidden border-l-4",
          settings.is_active ? "border-l-primary" : "border-l-muted-foreground/40"
        )}
      >
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white">
              <Link2 className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Herkese Açık Randevu Linkin</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    settings.is_active
                      ? "bg-positive/12 text-positive"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      settings.is_active ? "bg-positive" : "bg-muted-foreground"
                    )}
                  />
                  {settings.is_active ? "Aktif" : "Kapalı"}
                </span>
              </div>
              <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">
                {display || "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} disabled={!link}>
              {copied ? <Check className="text-positive" /> : <Copy />}
              {copied ? "Kopyalandı" : "Linki Kopyala"}
            </Button>
            <Button variant="outline" size="sm" asChild disabled={!link}>
              <a href={link || "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Önizle
              </a>
            </Button>
            <Button
              variant={settings.is_active ? "destructive" : "default"}
              size="sm"
              onClick={toggleActive}
              disabled={pending}
            >
              <Power />
              {settings.is_active ? "Kapat" : "Aç"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={regenerate}
              disabled={pending}
              title="Yeni link oluştur"
            >
              <RefreshCw />
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hizmetler">
        <TabsList>
          <TabsTrigger value="hizmetler">
            <Scissors className="size-4" />
            Hizmetler
          </TabsTrigger>
          <TabsTrigger value="saat">
            <Clock className="size-4" />
            Tarih & Saat
          </TabsTrigger>
          <TabsTrigger value="onizleme">
            <Smartphone className="size-4" />
            Önizleme
          </TabsTrigger>
        </TabsList>

        {/* Hizmetler */}
        <TabsContent value="hizmetler" className="mt-4">
          <ServicesPanel services={services} pending={pending} startTransition={startTransition} />
        </TabsContent>

        {/* Tarih & Saat */}
        <TabsContent value="saat" className="mt-4">
          <SchedulePanel settings={settings} />
        </TabsContent>

        {/* Önizleme */}
        <TabsContent value="onizleme" className="mt-4">
          <PreviewPanel services={bookable} settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServicesPanel({
  services,
  pending,
  startTransition,
}: {
  services: Service[];
  pending: boolean;
  startTransition: React.TransitionStartFunction;
}) {
  function toggle(s: Service) {
    const next = !(s.bookable !== false);
    startTransition(async () => {
      const res = await toggleServiceBookable(s.id, next);
      if (res.error) toast.error(res.error);
    });
  }

  if (services.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Henüz hizmet eklenmemiş. Önce İşletme → Hizmetler bölümünden hizmet ekle.
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <p className="px-2 pb-2 pt-1 text-xs text-muted-foreground">
          Online randevuda görünmesini istediğin hizmetleri aç. Kapalı olanlar müşteriye gösterilmez.
        </p>
        <ul className="divide-y">
          {services.map((s) => {
            const on = s.bookable !== false;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-2 py-3">
                <div className="min-w-0">
                  <p className={cn("truncate font-medium", !on && "text-muted-foreground")}>
                    {s.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatPrice(s.price)}
                    {s.duration_min ? ` · ${s.duration_min} dk` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(s)}
                  disabled={pending}
                  aria-pressed={on}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
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
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function SchedulePanel({ settings }: { settings: BookingSettings }) {
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState<number[]>(settings.work_days);
  const [start, setStart] = useState(settings.start_time);
  const [end, setEnd] = useState(settings.end_time);
  const [slot, setSlot] = useState(settings.slot_minutes);

  function toggleDay(v: number) {
    setDays((prev) =>
      prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v].sort((a, b) => a - b)
    );
  }

  function save() {
    startTransition(async () => {
      const res = await updateBookingSettings(settings.id, {
        work_days: days,
        start_time: start,
        end_time: end,
        slot_minutes: slot,
      });
      if (res.error) toast.error(res.error);
      else toast.success("Çalışma saatleri kaydedildi");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-5">
        <div className="space-y-2">
          <Label>Çalışma Günleri</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = days.includes(d.v);
              return (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDay(d.v)}
                  className={cn(
                    "h-9 w-12 rounded-lg border text-sm font-medium transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="start">Açılış</Label>
            <input
              id="start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Kapanış</Label>
            <input
              id="end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slot">Randevu Aralığı</Label>
            <select
              id="slot"
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {SLOTS.map((m) => (
                <option key={m} value={m}>
                  {m} dakika
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Müşterinin göreceği randevu akışının canlı önizlemesi (telefon çerçevesi içinde). */
function PreviewPanel({
  services,
  settings,
}: {
  services: Service[];
  settings: BookingSettings;
}) {
  const dayLabels = settings.work_days
    .map((v) => DAYS.find((d) => d.v === v)?.label)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border-8 border-foreground/90 bg-background shadow-xl">
        {/* Telefon başlığı */}
        <div className="bg-gradient-to-br from-primary to-violet-500 px-5 py-6 text-center text-white">
          <p className="text-xs/4 opacity-80">Online Randevu</p>
          <p className="mt-1 text-lg font-bold">Randevunu Oluştur</p>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              1
            </span>
            <span className="font-medium text-foreground">Hizmet Seç</span>
            <ChevronRight className="size-3" />
            <span>Tarih</span>
            <ChevronRight className="size-3" />
            <span>Bilgi</span>
          </div>

          <div className="space-y-2">
            {services.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Gösterilecek hizmet yok. Hizmetler sekmesinden aç.
              </p>
            ) : (
              services.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.duration_min ? `${s.duration_min} dk` : "—"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatPrice(s.price)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {dayLabels || "Gün seçilmedi"}
            </p>
            <p className="mt-1 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {settings.start_time}–{settings.end_time} · {settings.slot_minutes} dk aralık
            </p>
          </div>

          <Button className="w-full" disabled>
            Devam Et
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Bu yalnızca önizlemedir.
          </p>
        </div>
      </div>
    </div>
  );
}
