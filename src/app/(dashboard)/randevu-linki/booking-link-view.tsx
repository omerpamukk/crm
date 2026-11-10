"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Copy, ExternalLink, Scissors } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { BookingSettings, Service } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/shared/skeletons";
import { StatusDot } from "@/components/shared/status";

import {
  regenerateBookingToken,
  setBookingActive,
  toggleServiceBookable,
} from "./booking-actions";
import { DAYS, ScheduleForm } from "./schedule-form";

export type BookingStats = { total: number; approved: number; cancelled: number; rate: number };

/** Adres çubuğundaki site adresi. Sunucuda boş, istemcide dolu; uyumsuzluk oluşmaz. */
function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );
}

/** [1,2,3,4,5] -> "Pzt – Cum", [1,3] -> "Pzt, Çar". */
function dayRange(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 0) return "Gün seçilmedi";
  const label = (v: number) => DAYS.find((d) => d.v === v)?.short ?? "";
  const consecutive = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  if (consecutive && sorted.length > 2) return `${label(sorted[0])} – ${label(sorted[sorted.length - 1])}`;
  return sorted.map(label).join(", ");
}

export function BookingLinkView({
  settings,
  services,
  stats,
  loadFailed,
}: {
  settings: BookingSettings;
  services: Service[];
  stats: BookingStats;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const origin = useOrigin();
  const link = origin ? `${origin}/randevu/${settings.token}` : "";
  const display = link.replace(/^https?:\/\//, "");

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  // Hizmet anahtarları anında değişir; sunucu yanıtı hatalıysa geri döner.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link kopyalandı");
    } catch {
      toast.error("Link kopyalanamadı. Adresi seçip elle kopyalayın.");
    }
  }

  function openPreview() {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  function setActive(next: boolean) {
    startTransition(async () => {
      const res = await setBookingActive(settings.id, next);
      if (res.error) toast.error(res.error);
      else {
        toast.success(next ? "Randevu linki açıldı" : "Randevu linki kapatıldı");
        router.refresh();
      }
    });
  }

  function regenerate() {
    startTransition(async () => {
      const res = await regenerateBookingToken(settings.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setRegenOpen(false);
      toast.success("Yeni link oluşturuldu. Eski link artık çalışmaz.");
      router.refresh();
    });
  }

  function toggleService(s: Service, next: boolean) {
    setOverrides((o) => ({ ...o, [s.id]: next }));
    startTransition(async () => {
      const res = await toggleServiceBookable(s.id, next);
      if (res.error) {
        toast.error(res.error);
        setOverrides((o) => {
          const { [s.id]: _drop, ...rest } = o;
          void _drop;
          return rest;
        });
      } else {
        router.refresh();
      }
    });
  }

  const isOn = (s: Service) => overrides[s.id] ?? s.bookable !== false;
  const bookable = services.filter(isOn);

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        title="Randevu Linki"
        description="Müşterileriniz bu linkten kendi randevusunu alır. Linki paylaşın; hizmetleri ve çalışma saatlerini buradan ayarlayın."
        secondary={
          <ToolbarAction icon={ExternalLink} label="Önizle" mobile="icon" onClick={openPreview} disabled={!link} />
        }
        primary={
          <ToolbarAction prominent icon={Copy} label="Linki kopyala" onClick={copyLink} disabled={!link} />
        }
      />

      {loadFailed ? (
        <ErrorState title="Bazı bilgiler yüklenemedi" onRetry={() => router.refresh()} />
      ) : (
        <MetricStrip aria-label="Bu ayın online randevuları">
          <Metric label="Bu ay gelen" value={stats.total.toLocaleString("tr-TR")} />
          <Metric label="Onaylanan" value={stats.approved.toLocaleString("tr-TR")} />
          <Metric label="İptal edilen" value={stats.cancelled.toLocaleString("tr-TR")} />
          <Metric label="Onay oranı" value={`%${stats.rate}`} />
        </MetricStrip>
      )}

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        <div className="min-w-0 space-y-8">
          {/* Link */}
          <section aria-label="Randevu linki" className="surface space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Randevu linkiniz</h2>
              <StatusDot variant={settings.is_active ? "positive" : "secondary"}>
                {settings.is_active ? "Açık" : "Kapalı"}
              </StatusDot>
            </div>
            <div className="surface-flat flex min-h-11 min-w-0 items-center gap-2 py-1 pr-1 pl-3.5">
              {display ? (
                <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]" title={display}>
                  {display}
                </span>
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
              <Button variant="secondary" size="sm" onClick={copyLink} disabled={!link} className="bg-card">
                <Copy />
                Kopyala
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-separator pt-3">
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-medium">Müşteriler randevu alabilsin</p>
                <p className="text-subhead text-label-2">
                  {settings.is_active
                    ? "Link açık. Kapatırsanız müşteriler randevu alamaz."
                    : "Link kapalı. Müşteriler şu an randevu alamaz."}
                </p>
              </div>
              <Switch
                checked={settings.is_active}
                onCheckedChange={setActive}
                disabled={pending}
                label="Randevu linkini aç ya da kapat"
              />
            </div>
          </section>

          {/* Hizmetler */}
          {services.length === 0 ? (
            <EmptyState
              icon={Scissors}
              title="Henüz hizmet yok"
              description="Müşteriler hizmet seçerek randevu alır. Önce Hizmetler sayfasından hizmet ekleyin."
              action={
                <Button asChild variant="secondary">
                  <a href="/hizmetler">Hizmetler</a>
                </Button>
              }
            />
          ) : (
            <ListGroup
              title="Hizmetler"
              detail={`${bookable.length} / ${services.length} açık`}
              inset={16}
            >
              {services.map((s) => {
                const on = isOn(s);
                return (
                  <ListRow
                    key={s.id}
                    title={<span className={cn(!on && "text-label-2")}>{s.name}</span>}
                    subtitle={[formatPrice(s.price), s.duration_min ? `${s.duration_min} dk` : null]
                      .filter(Boolean)
                      .join(" · ")}
                    trailing={
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => toggleService(s, v)}
                        label={`${s.name} online randevuda görünsün`}
                      />
                    }
                  />
                );
              })}
            </ListGroup>
          )}

          {/* Çalışma saatleri */}
          <ListGroup title="Çalışma saatleri" inset={16}>
            <ListRow
              leading={<CalendarDays aria-hidden className="size-5 text-label-2" />}
              title={dayRange(settings.work_days)}
              subtitle={`${settings.start_time.slice(0, 5)} – ${settings.end_time.slice(0, 5)} · ${settings.slot_minutes} dakikalık randevular`}
              chevron
              onClick={() => setScheduleOpen(true)}
              aria-label="Çalışma saatlerini düzenle"
            />
          </ListGroup>

          {/* Gelişmiş */}
          <Disclosure title="Gelişmiş" contentClassName="">
            <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-medium">Yeni link oluştur</p>
                <p className="text-subhead text-label-2">
                  Linkin yanlış kişilere ulaştıysa yenileyin. Eski link çalışmaz; paylaştığınız yerlerde güncellemeniz gerekir.
                </p>
              </div>
              <Button variant="secondary" className="shrink-0" onClick={() => setRegenOpen(true)}>
                Yeni link oluştur
              </Button>
            </div>
          </Disclosure>
        </div>

        {/* Önizleme */}
        <aside aria-label="Önizleme" className="min-w-0 xl:sticky xl:top-20">
          <h2 className="section-title mb-2 px-1">Müşterinin göreceği sayfa</h2>
          <Preview services={bookable} settings={settings} />
        </aside>
      </div>

      <FormSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Çalışma saatleri"
        description="Müşteriler yalnızca bu gün ve saatlerde randevu alabilir."
      >
        <ScheduleForm
          settings={settings}
          onSuccess={() => {
            setScheduleOpen(false);
            router.refresh();
          }}
          onCancel={() => setScheduleOpen(false)}
        />
      </FormSheet>

      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni link oluştur</DialogTitle>
            <DialogDescription>
              Eski link artık çalışmayacak ve bu işlem geri alınamaz. Linki paylaştığınız yerlerde güncellemeniz gerekir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRegenOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={regenerate} disabled={pending}>
              {pending ? "Oluşturuluyor..." : "Yeni link oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Müşterinin göreceği randevu sayfasının küçük önizlemesi. */
function Preview({ services, settings }: { services: Service[]; settings: BookingSettings }) {
  return (
    <div className="surface mx-auto w-full max-w-sm overflow-hidden">
      <div className="bg-primary-fill px-5 py-5 text-center text-on-primary-fill">
        <p className="text-subhead opacity-85">Online randevu</p>
        <p className="mt-0.5 text-title-3 font-semibold">Randevunuzu oluşturun</p>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-subhead font-semibold text-label-2">1. Hizmet seçin</p>
        {services.length === 0 ? (
          <p className="rounded-xl border border-dashed border-separator-strong p-4 text-center text-subhead text-label-2">
            Gösterilecek hizmet yok. Soldan bir hizmeti açın.
          </p>
        ) : (
          <ul role="list" className="space-y-2">
            {services.slice(0, 4).map((s) => (
              <li key={s.id} className="surface-flat flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-medium">{s.name}</p>
                  <p className="text-subhead text-label-2">{s.duration_min ? `${s.duration_min} dk` : " "}</p>
                </div>
                <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{formatPrice(s.price)}</span>
              </li>
            ))}
            {services.length > 4 && (
              <li className="px-1 text-subhead text-label-2">+ {services.length - 4} hizmet daha</li>
            )}
          </ul>
        )}
        <div className="space-y-1 text-subhead text-label-2">
          <p className="flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-3.5 shrink-0" />
            {dayRange(settings.work_days)}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock aria-hidden className="size-3.5 shrink-0" />
            {settings.start_time.slice(0, 5)} – {settings.end_time.slice(0, 5)} · {settings.slot_minutes} dk aralık
          </p>
        </div>
        <p className="text-center text-subhead text-label-2">Bu yalnızca önizlemedir.</p>
      </div>
    </div>
  );
}
