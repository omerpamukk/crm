"use client";

import * as React from "react";
import { ChevronRight, CalendarPlus, CircleAlert, Clock, Plus, Sunset, Undo2, UserCheck, Banknote } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toastUndo } from "@/components/ui/sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { GeldiButton } from "@/components/shared/geldi-button";
import { ListGroup } from "@/components/shared/list-group";
import { Money } from "@/components/shared/money";
import { SwipeRow } from "@/components/shared/swipe-row";

import { markArrived, undoArrived } from "../randevular/actions";
import { fmtTime } from "./dates";
import { usePanelActions } from "./panel-shell";
import { ApptDetail, EndStatus, TagChips, apptLine } from "./appt-parts";
import { Timeline } from "./timeline";
import type { ApptStatus, ScheduleAppt } from "./types";

const VIEW_KEY = "panel-program-gorunumu";
const VIEW_EVENT = "panel-program-gorunumu";
const ROW_LIMIT = 8;

/** Liste/Çizelge seçimi tarayıcıda hatırlanır (erişilemezse sessizce varsayılan). */
function useStoredView(): ["liste" | "cizelge", (v: "liste" | "cizelge") => void] {
  const raw = React.useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(VIEW_EVENT, cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(VIEW_EVENT, cb);
      };
    },
    () => {
      try {
        return localStorage.getItem(VIEW_KEY);
      } catch {
        return null;
      }
    },
    () => null
  );
  const set = React.useCallback((v: "liste" | "cizelge") => {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* yok say */
    }
    window.dispatchEvent(new Event(VIEW_EVENT));
  }, []);
  return [raw === "cizelge" ? "cizelge" : "liste", set];
}

type Override = { status: ApptStatus; arrivedAt: string | null; base: ApptStatus };

function relative(mins: number): string {
  if (mins > 0) {
    if (mins >= 60) return `${Math.floor(mins / 60)} sa ${mins % 60 ? `${mins % 60} dk ` : ""}sonra`;
    return `${mins} dk sonra`;
  }
  if (mins === 0) return "şimdi";
  return `${-mins} dk gecikti`;
}

export function TodaySchedule({
  appointments,
  nowIso,
  canPay,
  canCreate,
}: {
  appointments: ScheduleAppt[];
  nowIso: string;
  canPay: boolean;
  canCreate: boolean;
}) {
  const actions = usePanelActions();
  const [now, setNow] = React.useState(() => new Date(nowIso).getTime());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const [storedView, setStoredView] = useStoredView();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const view = isDesktop ? storedView : "liste";

  const [overrides, setOverrides] = React.useState<Record<string, Override>>({});
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [showPast, setShowPast] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  // Sunucudan gelen durum ile iyimser durum: sunucu henüz yetişmediyse iyimser olan görünür
  const appts = React.useMemo(
    () =>
      appointments.map((a) => {
        const o = overrides[a.id];
        return o && o.base === a.status ? { ...a, status: o.status, arrivedAt: o.arrivedAt } : a;
      }),
    [appointments, overrides]
  );

  const arrive = React.useCallback(
    async (a: ScheduleAppt) => {
      const mark = (o: Override | null) =>
        setOverrides((s) => {
          const n = { ...s };
          if (o) n[a.id] = o;
          else delete n[a.id];
          return n;
        });
      mark({ status: "arrived", arrivedAt: new Date().toISOString(), base: a.status });
      const res = await markArrived(a.id);
      if (res.error) {
        mark(null);
        toast.error(res.error);
        throw new Error(res.error);
      }
      toastUndo(`${a.customerName} geldi`, async () => {
        mark({ status: "planned", arrivedAt: null, base: a.status });
        const r = await undoArrived(a.id);
        if (r.error) {
          mark(null);
          toast.error(r.error);
        }
      });
    },
    []
  );

  const undo = React.useCallback(async (a: ScheduleAppt) => {
    setOverrides((s) => ({ ...s, [a.id]: { status: "planned", arrivedAt: null, base: a.status } }));
    const res = await undoArrived(a.id);
    if (res.error) {
      setOverrides((s) => {
        const n = { ...s };
        delete n[a.id];
        return n;
      });
      toast.error(res.error);
      throw new Error(res.error);
    }
  }, []);

  const endMs = (a: ScheduleAppt) => new Date(a.endsAt).getTime();
  const isPast = (a: ScheduleAppt) =>
    a.status === "completed" || a.status === "cancelled" || a.status === "no_show" || (a.status === "planned" && endMs(a) <= now);
  const past = appts.filter(isPast);
  const upcoming = appts.filter((a) => !isPast(a));
  const next = upcoming.find((a) => a.status === "planned") ?? null;
  const rest = upcoming.filter((a) => a.id !== next?.id);

  const count = (s: ApptStatus) => appts.filter((a) => a.status === s).length;
  const summary = [
    `${appts.length} randevu`,
    count("completed") ? `${count("completed")} tamamlandı` : "",
    count("arrived") ? `${count("arrived")} geldi` : "",
    count("no_show") ? `${count("no_show")} gelmedi` : "",
    count("cancelled") ? `${count("cancelled")} iptal` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const openAppt = appts.find((a) => a.id === openId) ?? null;

  if (appts.length === 0) {
    return (
      <section aria-label="Bugünün programı" className="min-w-0">
        <div className="mx-1 mb-2 flex items-center">
          <h2 className="section-title whitespace-nowrap">Bugünün programı</h2>
        </div>
        <EmptyState
          icon={CalendarPlus}
          title="Bugün için randevu yok"
          description={canCreate ? "Yeni bir randevu oluşturarak günü planlayın." : "Size atanmış bir randevu görünmüyor."}
          action={
            canCreate ? (
              <Button onClick={() => actions?.openAppointment()}>
                <Plus />
                Yeni randevu
              </Button>
            ) : undefined
          }
        />
      </section>
    );
  }

  const visibleRest = showAll ? rest : rest.slice(0, ROW_LIMIT);

  return (
    <>
      <ListGroup
        title="Bugünün programı"
        detail={<span className="max-md:hidden">{summary}</span>}
        action={
          <SegmentedControl
            aria-label="Program görünümü"
            size="md"
            className="max-md:hidden"
            items={[
              { value: "liste", label: "Liste" },
              { value: "cizelge", label: "Çizelge" },
            ]}
            value={view}
            onValueChange={setStoredView}
          />
        }
        inset={16}
        footer={
          view === "liste" && rest.length > ROW_LIMIT ? (
            <>
              <span className="min-w-0 truncate">{showAll ? "Tüm randevular gösteriliyor" : `${rest.length - ROW_LIMIT} randevu daha`}</span>
              <button type="button" className="focus-ring shrink-0 rounded font-medium text-primary-text" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Daha az göster" : "Tümünü göster"}
              </button>
            </>
          ) : undefined
        }
      >
        {view === "cizelge" ? (
          <li>
            <Timeline appts={appts} now={now} nextId={next?.id ?? null} onOpen={setOpenId} />
          </li>
        ) : (
          <>
            <li className="md:hidden">
              <p className="px-4 py-2.5 text-subhead text-label-2">{summary}</p>
            </li>
            {past.length > 0 && (
              <li>
                <button
                  type="button"
                  aria-expanded={showPast}
                  onClick={() => setShowPast((v) => !v)}
                  className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover focus-visible:outline-offset-[-3px]"
                >
                  <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-label-3 transition-transform duration-200", showPast && "rotate-90")} />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.9375rem] leading-5 font-medium">{past.length} önceki randevu</span>
                    <span className="block truncate text-subhead text-label-2">
                      {[
                        past.filter((a) => a.status === "completed").length ? `${past.filter((a) => a.status === "completed").length} tamamlandı` : "",
                        past.filter((a) => a.status === "no_show").length ? `${past.filter((a) => a.status === "no_show").length} gelmedi` : "",
                        past.filter((a) => a.status === "cancelled").length ? `${past.filter((a) => a.status === "cancelled").length} iptal` : "",
                        past.filter((a) => a.status === "planned").length ? `${past.filter((a) => a.status === "planned").length} işaretlenmemiş` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
                {showPast && (
                  <ul role="list" className="inset-rows border-t border-separator">
                    {past.map((a) => (
                      <li key={a.id}>
                        <ApptRow a={a} now={now} onOpen={setOpenId} onArrive={arrive} onUndo={undo} muted />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}
            <li>
              {next ? (
                <NextCard a={next} now={now} canPay={canPay} onOpen={() => setOpenId(next.id)} onArrive={() => arrive(next)} onUndo={() => undo(next)} onPay={() => actions?.openPayment(next.customerId ?? undefined)} />
              ) : (
                <EmptyState
                  variant="inline"
                  icon={Sunset}
                  title="Bugün başka randevu yok"
                  description={canCreate ? "Yeni randevu oluşturabilir ya da yarının programına bakabilirsiniz." : undefined}
                  className="py-8"
                  action={
                    canCreate ? (
                      <Button variant="secondary" onClick={() => actions?.openAppointment()}>
                        <Plus />
                        Yeni randevu
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </li>
            {visibleRest.map((a) => (
              <li key={a.id}>
                <ApptRow a={a} now={now} onOpen={setOpenId} onArrive={arrive} onUndo={undo} />
              </li>
            ))}
          </>
        )}
      </ListGroup>

      <Sheet open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="auto" detents={[0.5, 0.9]}>
          {openAppt && (
            <>
              <SheetHeader>
                <SheetTitle>{fmtTime(openAppt.startsAt)} · {openAppt.service}</SheetTitle>
                <SheetDescription>Randevu ayrıntısı</SheetDescription>
              </SheetHeader>
              <ApptDetail
                a={openAppt}
                canPay={canPay}
                onArrive={() => arrive(openAppt)}
                onUndo={() => undo(openAppt)}
                onPay={() => {
                  setOpenId(null);
                  actions?.openPayment(openAppt.customerId ?? undefined);
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Sıradaki randevu: saat, kaç dakika sonra, kişi, açık borç, Ödeme al ve Geldi. */
function NextCard({
  a,
  now,
  canPay,
  onOpen,
  onArrive,
  onUndo,
  onPay,
}: {
  a: ScheduleAppt;
  now: number;
  canPay: boolean;
  onOpen: () => void;
  onArrive: () => Promise<unknown>;
  onUndo: () => Promise<unknown>;
  onPay: () => void;
}) {
  const mins = Math.round((new Date(a.startsAt).getTime() - now) / 60000);
  return (
    <div className="px-4 pt-3.5 pb-4">
      <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold tracking-[0.04em] text-label-2 uppercase">
        <Clock aria-hidden className="size-3.5" />
        Sıradaki · {relative(mins)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-60 items-center gap-3.5">
          <span className="shrink-0 min-w-[4.75rem] md:min-w-[5rem]">
            <b className="block text-[1.25rem] leading-6 font-semibold tabular-nums md:text-[1.5rem] md:leading-7">{fmtTime(a.startsAt)}</b>
            <span className="block text-[0.8125rem] text-label-2 tabular-nums">{fmtTime(a.endsAt)}</span>
          </span>
          <Avatar name={a.customerName} size="lg" className="max-[400px]:hidden" />
          <button type="button" onClick={onOpen} className="focus-ring min-w-0 flex-1 rounded-md text-left">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[1.0625rem] leading-6 font-semibold">{a.customerName}</span>
              <TagChips tags={a.tags} />
            </span>
            <span className="block truncate text-[0.875rem] text-label-2">{apptLine(a)}</span>
            {a.debt > 0 && (
              <span className="mt-0.5 block">
                <Money amount={a.debt} tone="debt" overdue={a.debtOverdue} suffix={a.debtOverdue ? "gecikmiş borç" : "açık borç"} className="text-subhead" />
              </span>
            )}
          </button>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 md:w-auto">
          {canPay && a.customerId && (
            <Button variant="secondary" className="max-md:h-11 max-md:flex-1" onClick={onPay}>
              <Banknote />
              Ödeme al
            </Button>
          )}
          {a.canArrive && (
            <GeldiButton
              size="md"
              className="max-md:h-11 max-md:flex-1"
              customerName={a.customerName}
              arrived={a.status === "arrived"}
              onArrive={onArrive}
              onUndo={onUndo}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Randevu satırı. Telefonda sağa kaydırınca Geldi; görünür karşılığı satıra
 * dokununca açılan ayrıntıdaki Geldi düğmesidir.
 */
function ApptRow({
  a,
  now,
  onOpen,
  onArrive,
  onUndo,
  muted = false,
}: {
  a: ScheduleAppt;
  now: number;
  onOpen: (id: string) => void;
  onArrive: (a: ScheduleAppt) => Promise<unknown>;
  onUndo: (a: ScheduleAppt) => Promise<unknown>;
  muted?: boolean;
}) {
  const late = a.status === "planned" && new Date(a.startsAt).getTime() < now;
  const showGeldi = a.canArrive && (a.status === "planned" || a.status === "arrived");
  const swipe =
    a.canArrive && a.status === "planned"
      ? { label: "Geldi", icon: UserCheck, tone: "positive" as const, onAction: () => void onArrive(a).catch(() => {}) }
      : a.canArrive && a.status === "arrived"
        ? { label: "Geri al", icon: Undo2, tone: "neutral" as const, onAction: () => void onUndo(a).catch(() => {}) }
        : undefined;

  return (
    <SwipeRow leading={swipe}>
      <div className="relative flex min-h-[60px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover">
        <button
          type="button"
          onClick={() => onOpen(a.id)}
          aria-label={`${fmtTime(a.startsAt)} ${a.customerName}, ${apptLine(a)}. Ayrıntıyı aç`}
          className="focus-ring absolute inset-0 z-0 rounded-none"
        />
        <span className={cn("pointer-events-none relative w-12 shrink-0", muted && "text-label-2")}>
          <b className="block text-[0.9375rem] leading-5 font-semibold tabular-nums">{fmtTime(a.startsAt)}</b>
          <span className="block text-[0.75rem] leading-4 text-label-2 tabular-nums">{fmtTime(a.endsAt)}</span>
        </span>
        <span className="pointer-events-none relative min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn("truncate text-[0.9375rem] leading-5 font-medium", a.status === "cancelled" && "text-label-2 line-through")}>{a.customerName}</span>
            <span className="contents max-md:hidden"><TagChips tags={a.tags} /></span>
          </span>
          <span className="block truncate text-subhead text-label-2">{apptLine(a)}</span>
        </span>
        <span className="relative z-[1] flex shrink-0 items-center gap-2 whitespace-nowrap">
          {/* Masaüstü: Geldi düğmesi satırda */}
          <span className="flex items-center gap-2 max-md:hidden">
            {late && (
              <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-warning-text">
                <CircleAlert aria-hidden className="size-3.5" />
                Saati geçti
              </span>
            )}
            {showGeldi ? (
              <>
                <GeldiButton
                  size="sm"
                  customerName={a.customerName}
                  arrived={a.status === "arrived"}
                  onArrive={() => onArrive(a)}
                  onUndo={() => onUndo(a)}
                />
                {a.status === "arrived" && a.arrivedAt && (
                  <span className="text-[0.8125rem] text-label-2 tabular-nums">{fmtTime(a.arrivedAt)}</span>
                )}
              </>
            ) : a.status === "planned" ? (
              <span className="text-subhead text-label-2">Planlandı</span>
            ) : (
              <EndStatus a={a} />
            )}
          </span>
          {/* Telefon: durum metni; Geldi kaydırma ve ayrıntı sayfasında */}
          <span className="flex items-center gap-1 md:hidden">
            {a.status !== "planned" && <EndStatus a={a} compact />}
            <ChevronRight aria-hidden className="size-4 text-label-3" />
          </span>
        </span>
      </div>
    </SwipeRow>
  );
}
