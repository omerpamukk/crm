"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { fromDateTimeLocal } from "@/lib/zaman";
import { project, useMotionPreset } from "@/lib/motion";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { canChangeArrival } from "@/lib/appointment-status";
import type { UserRole } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toastUndo } from "@/components/ui/sonner";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";

import { markArrived, undoArrived } from "../randevular/actions";
import {
  AppointmentForm,
  type CustomerOption,
  type PackageOption,
  type ServiceOption,
  type StaffOption,
} from "../randevular/appointment-form";
import { AgendaDay, AgendaSkeleton, type AgendaActions } from "./agenda";
import { AppointmentDetail } from "./appointment-detail";
import { MonthCompact, MonthGrid } from "./month-grid";
import { EmptyOverlay, Legend, place, staffInitials, summaryText, useNowMinute, type Placed } from "./parts";
import { staffDotClass } from "@/lib/staff-colors";
import type { CalAppt, RangePayload } from "./queries";
import { TimeGrid, type GridColumn } from "./time-grid";
import { useRangeStore } from "./use-range-store";
import { useTakvimParams } from "./use-takvim-params";
import { hourBounds, offIntervals, type WorkWindow } from "./yerlesim";
import {
  GUN_KISA,
  hhmm,
  addDays,
  dayKeyOf,
  dayTitle,
  daysInRange,
  diffDays,
  minuteOfDay,
  monthOf,
  monthWeeks,
  parseHHMM,
  rangeIncludes,
  rangeTitle,
  stepDate,
  visibleRange,
  weekdayOf,
  zonedToUtc,
  type Gorunum,
} from "./zaman";

export type CalStaff = {
  id: string;
  full_name: string;
  title: string | null;
  is_active: boolean;
  /** Takvim rengi (0042); yoksa gri. */
  color?: string | null;
};
export type CalShift = {
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};
export type WorkingDay = {
  day: number;
  open: boolean;
  start: string;
  end: string;
};
export type FormOptions = {
  customers: CustomerOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  packages: PackageOption[];
};

const VIEWS = [
  { value: "gun", label: "Gün" },
  { value: "hafta", label: "Hafta" },
  { value: "ay", label: "Ay" },
] as const;

const STEP_LABEL: Record<Gorunum, [string, string]> = {
  gun: ["Önceki gün", "Sonraki gün"],
  hafta: ["Önceki hafta", "Sonraki hafta"],
  ay: ["Önceki ay", "Sonraki ay"],
};

const ALL = "tumu";

type Nav = { dir: number; swipe: boolean; v: number };

/**
 * Takvim — Google Takvim gibi Gün / Hafta / Ay.
 *
 * Gün: her personel bir sütun, saatler dikey, "şu an" çizgisi. Hafta: 7 gün sütunu.
 * Ay: gün ızgarası. Telefonda Gün tek sütunluk ızgara, Hafta gün başlıklı
 * liste, Ay sıkı ızgara + seçili günün listesi; sağa/sola kaydırınca tarih
 * değişir. Görünüm ve tarih adreste (?gorunum, ?tarih, ?personel).
 */
export function TakvimView({
  tz,
  serverTodayKey,
  staff,
  shifts,
  workingDays,
  initial,
  role,
  profileStaffId,
  onlyOwn,
  canManage,
  formOptions,
}: {
  tz: string;
  serverTodayKey: string;
  staff: CalStaff[];
  shifts: CalShift[];
  workingDays: WorkingDay[] | null;
  initial: RangePayload | null;
  role: UserRole;
  profileStaffId: string | null;
  /** Uzman rolü: yalnızca kendi randevuları (sunucu da süzer). */
  onlyOwn: boolean;
  canManage: boolean;
  formOptions: FormOptions | null;
}) {
  const nowMs = useNowMinute();
  const todayKey = nowMs !== null ? dayKeyOf(nowMs, tz) : serverTodayKey;
  const nowMin = nowMs !== null ? minuteOfDay(nowMs, tz) : null;

  const { view, dateKey, personel, set } = useTakvimParams(todayKey);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { reduce, transition } = useMotionPreset();

  const range = visibleRange(view, dateKey);
  const rangeKey = `${view}|${range.start}`;
  const store = useRangeStore({
    tz,
    initial,
    range,
    prefetch: [
      visibleRange(view, stepDate(view, dateKey, -1)),
      visibleRange(view, stepDate(view, dateKey, 1)),
    ],
  });

  /* ---------------- Personel, filtre, mesai ---------------- */

  const activeStaff = React.useMemo(() => staff.filter((s) => s.is_active), [staff]);
  const ownStaff = React.useMemo(
    () => (onlyOwn ? staff.filter((s) => s.id === profileStaffId) : null),
    [onlyOwn, profileStaffId, staff],
  );
  const filterable = !onlyOwn && activeStaff.length >= 2;
  const filterId = filterable && activeStaff.some((s) => s.id === personel) ? personel : "";

  const businessWindow = React.useMemo(() => {
    const map = new Map<number, WorkWindow>();
    if (!workingDays) return map;
    for (const d of workingDays) {
      const s = parseHHMM(d.start);
      const e = parseHHMM(d.end);
      map.set(d.day, d.open && s !== null && e !== null && e > s ? { start: s, end: e } : null);
    }
    return map;
  }, [workingDays]);

  const shiftWindows = React.useMemo(() => {
    const map = new Map<string, Map<number, WorkWindow>>();
    for (const sh of shifts) {
      const days = map.get(sh.staff_id) ?? new Map<number, WorkWindow>();
      const s = parseHHMM(sh.start_time);
      const e = parseHHMM(sh.end_time);
      days.set(sh.weekday, sh.is_active && s !== null && e !== null && e > s ? { start: s, end: e } : null);
      map.set(sh.staff_id, days);
    }
    return map;
  }, [shifts]);

  /** Vardiyası tanımlı personelde vardiya (tanımsız gün kapalı); yoksa işletme saati. */
  const windowFor = React.useCallback(
    (staffId: string | null, dayKey: string): WorkWindow => {
      const wd = weekdayOf(dayKey);
      const own = staffId ? shiftWindows.get(staffId) : undefined;
      if (own) return own.get(wd) ?? null;
      return businessWindow.get(wd);
    },
    [businessWindow, shiftWindows],
  );

  const timeOffFor = React.useCallback(
    (staffId: string | null, dayKey: string): [number, number][] => {
      if (!staffId) return [];
      const dayStart = zonedToUtc(dayKey, 0, tz);
      const dayEnd = zonedToUtc(addDays(dayKey, 1), 0, tz);
      const out: [number, number][] = [];
      for (const t of store.timeOff) {
        if (t.staff_id !== staffId) continue;
        const s = new Date(t.starts_at).getTime();
        const e = new Date(t.ends_at).getTime();
        if (e <= dayStart || s >= dayEnd) continue;
        out.push([s <= dayStart ? 0 : minuteOfDay(s, tz), e >= dayEnd ? 1440 : minuteOfDay(e, tz)]);
      }
      return out;
    },
    [store.timeOff, tz],
  );

  /* ---------------- Randevular ---------------- */

  const placed = React.useMemo(() => store.appts?.map((a) => place(a, tz)) ?? null, [store.appts, tz]);
  const visible = React.useMemo(
    () => placed?.filter((a) => !filterId || a.staff_member_id === filterId) ?? null,
    [placed, filterId],
  );
  const byDay = React.useMemo(() => {
    const map = new Map<string, Placed[]>();
    for (const a of visible ?? []) {
      const list = map.get(a.dayKey) ?? [];
      list.push(a);
      map.set(a.dayKey, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
    return map;
  }, [visible]);

  const loading = store.status === "loading";
  const failed = store.status === "error";
  const ready = store.status === "ready";

  const { m: shownMonth } = monthOf(dateKey);
  const countable = React.useMemo(() => {
    if (!visible) return [];
    return view === "ay" ? visible.filter((a) => monthOf(a.dayKey).m === shownMonth) : visible;
  }, [visible, view, shownMonth]);
  const summary = ready ? summaryText(countable) : "";
  const isEmpty = ready && countable.length === 0;

  /* ---------------- Gezinme ---------------- */

  const [nav, setNav] = React.useState<Nav>({ dir: 0, swipe: false, v: 0 });
  const [sel, setSel] = React.useState<string | null>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);
  const swiping = React.useRef(false);

  const go = React.useCallback(
    (next: { view?: Gorunum; dateKey?: string }, motionInfo: Nav) => {
      setSel(null);
      setNav(motionInfo);
      set(next);
    },
    [set, setSel, setNav],
  );

  const step = React.useCallback(
    (dir: number, swipe = false, v = 0) => go({ dateKey: stepDate(view, dateKey, dir) }, { dir, swipe, v }),
    [dateKey, go, view],
  );

  const atToday = view === "ay" ? dateKey === todayKey : rangeIncludes(range, todayKey);
  const toToday = React.useCallback(() => {
    if (dateKey === todayKey) return;
    go({ dateKey: todayKey }, { dir: Math.sign(diffDays(dateKey, todayKey)), swipe: false, v: 0 });
  }, [dateKey, go, todayKey]);

  const changeView = (v: Gorunum) => go({ view: v }, { dir: 0, swipe: false, v: 0 });
  const openDay = (key: string) => go({ view: "gun", dateKey: key }, { dir: 0, swipe: false, v: 0 });
  const selectDay = (key: string) => {
    if (visibleRange(view, key).start === range.start) set({ dateKey: key });
    else go({ dateKey: key }, { dir: Math.sign(diffDays(dateKey, key)), swipe: false, v: 0 });
  };

  // Klavye: ← → tarih, T bugün (yazı alanı, segment ve açık pencere hariç)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t?.closest(
          "input, textarea, select, [contenteditable='true'], [role='radiogroup'], [role='dialog'], [role='menu'], [role='listbox']",
        )
      )
        return;
      if (
        document.querySelector("[data-slot='sheet-content'], [data-slot='popover-content'], [role='dialog']")
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toToday();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, toToday]);

  function onSwipeEnd(_: unknown, info: PanInfo) {
    window.setTimeout(() => (swiping.current = false), 0);
    const w = window.innerWidth;
    const landing = info.offset.x + project(info.velocity.x);
    if (Math.abs(info.offset.x) < 24 || Math.abs(landing) < w * 0.35) return;
    step(landing < 0 ? 1 : -1, true, info.velocity.x);
  }

  /* ---------------- Ayrıntı, Geldi, form ---------------- */

  const openAppt = (a: Placed, el: HTMLElement) => {
    if (swiping.current) return;
    if (sel === a.id && !isPhone) {
      setSel(null);
      return;
    }
    anchorRef.current = el;
    setSel(a.id);
  };

  // Kapanırken içerik boşalmasın: son gösterileni tut
  const [shownId, setShownId] = React.useState<string | null>(null);
  if (sel && sel !== shownId) setShownId(sel);
  const shownRaw = shownId ? store.find(shownId) : null;
  const shown = shownRaw ? place(shownRaw, tz) : null;

  const canArrive = React.useCallback(
    (a: Pick<CalAppt, "staff_member_id">) => canChangeArrival(role, profileStaffId, a.staff_member_id),
    [profileStaffId, role],
  );

  const { patch } = store;
  const undo = React.useCallback(
    async (a: CalAppt, fromToast = false) => {
      patch(a.id, { status: "planned", arrived_at: null });
      const res = await undoArrived(a.id);
      if (res.error) {
        patch(a.id, {
          status: "arrived",
          arrived_at: a.arrived_at ?? new Date().toISOString(),
        });
        toast.error(res.error);
        if (!fromToast) throw new Error(res.error);
        return;
      }
      toast.success(`${a.customer_name}: Geldi geri alındı`);
    },
    [patch],
  );

  const arrive = React.useCallback(
    async (a: CalAppt) => {
      const at = new Date().toISOString();
      patch(a.id, { status: "arrived", arrived_at: at });
      const res = await markArrived(a.id);
      if (res.error) {
        patch(a.id, { status: a.status, arrived_at: a.arrived_at ?? null });
        toast.error(res.error);
        throw new Error(res.error);
      }
      toastUndo(
        `${a.customer_name} geldi`,
        () => void undo({ ...a, status: "arrived", arrived_at: at }, true),
      );
    },
    [patch, undo],
  );

  type FormState = { mode: "create"; startsAt?: string; staffId?: string } | { mode: "edit"; appt: CalAppt };
  const [form, setForm] = React.useState<FormState | null>(null);
  const [shownForm, setShownForm] = React.useState<FormState | null>(null);
  if (form && form !== shownForm) setShownForm(form);
  const noCustomers = !formOptions;
  const openCreate = () => setForm({ mode: "create" });
  const openSlot = (dayKey: string, minute: number, staffId: string | null) => {
    if (!canManage || !formOptions) return;
    const startsAt = fromDateTimeLocal(`${dayKey}T${hhmm(minute)}`, tz) ?? undefined;
    setSel(null);
    setForm({ mode: "create", startsAt, staffId: staffId ?? undefined });
  };

  const agenda: AgendaActions = {
    tz,
    canArrive,
    onOpen: openAppt,
    onArrive: arrive,
    onUndo: (a) => undo(a),
  };

  /* ---------------- Izgara sütunları ---------------- */

  const dayItems = React.useMemo(() => byDay.get(dateKey) ?? [], [byDay, dateKey]);

  const dayColumns = React.useMemo<GridColumn[]>(() => {
    if (view !== "gun") return [];
    type Lane = { id: string | null; name: string; title: string | null };
    let lanes: Lane[];
    if (ownStaff)
      lanes = ownStaff.map((s) => ({
        id: s.id,
        name: s.full_name,
        title: s.title,
      }));
    else if (filterId) {
      const s = activeStaff.find((x) => x.id === filterId)!;
      lanes = [{ id: s.id, name: s.full_name, title: s.title }];
    } else {
      lanes = activeStaff.map((s) => ({
        id: s.id,
        name: s.full_name,
        title: s.title,
      }));
      // Pasif personelin ya da silinmiş kaydın randevusu da görünsün
      for (const a of dayItems) {
        if (a.staff_member_id && !lanes.some((l) => l.id === a.staff_member_id)) {
          lanes.push({
            id: a.staff_member_id,
            name: a.staff_name ?? "Personel",
            title: null,
          });
        }
      }
      if (dayItems.some((a) => !a.staff_member_id)) lanes.push({ id: null, name: "Atanmadı", title: null });
    }
    const isToday = dateKey === todayKey;
    if (lanes.length === 0) {
      return [
        {
          key: "all",
          dayKey: dateKey,
          label: "Randevular",
          header: <ColumnHeader kind="all" name="Randevular" count={dayItems.length} />,
          items: dayItems,
          off: [],
          isToday,
        },
      ];
    }
    return lanes.map((l) => {
      const items = dayItems.filter((a) => a.staff_member_id === l.id);
      const win = windowFor(l.id, dateKey);
      const leave = timeOffFor(l.id, dateKey);
      const notes: { at: number; text: string }[] = [];
      if (win === null) notes.push({ at: 0, text: "Çalışmıyor" });
      for (const [s] of leave) notes.push({ at: s, text: "İzinli" });
      return {
        key: l.id ?? "none",
        dayKey: dateKey,
        staffId: l.id,
        label: l.name,
        header: (
          <ColumnHeader
            kind={l.id === null ? "none" : "staff"}
            name={l.name}
            count={items.length}
            color={l.id ? staff.find((x) => x.id === l.id)?.color : null}
          />
        ),
        items,
        off: offIntervals(win, 0, 1440, leave),
        notes,
        isToday,
      };
    });
  }, [activeStaff, dateKey, dayItems, filterId, ownStaff, staff, timeOffFor, todayKey, view, windowFor]);

  // Telefonda Gün: tek sütun (Tümü'nde bütün personel, baş harfleriyle)
  const phoneStaffId = ownStaff ? (ownStaff[0]?.id ?? null) : filterId || null;
  const phoneDayColumn = React.useMemo<GridColumn>(() => {
    const win = phoneStaffId ? windowFor(phoneStaffId, dateKey) : businessWindow.get(weekdayOf(dateKey));
    const leave = timeOffFor(phoneStaffId, dateKey);
    return {
      key: "phone",
      dayKey: dateKey,
      staffId: phoneStaffId,
      label: dayTitle(dateKey, todayKey),
      items: dayItems,
      off: offIntervals(win, 0, 1440, leave),
      notes: win === null ? [{ at: 0, text: phoneStaffId ? "Çalışmıyor" : "Kapalı" }] : [],
      isToday: dateKey === todayKey,
    };
  }, [businessWindow, dateKey, dayItems, phoneStaffId, timeOffFor, todayKey, windowFor]);

  const weekDays = React.useMemo(
    () => (view === "hafta" ? daysInRange(range.start, range.end) : []),
    [range.end, range.start, view],
  );
  const weekStaffId = ownStaff ? (ownStaff[0]?.id ?? null) : filterId || null;
  const weekColumns = React.useMemo<GridColumn[]>(
    () =>
      weekDays.map((k) => {
        const items = byDay.get(k) ?? [];
        const win = weekStaffId ? windowFor(weekStaffId, k) : businessWindow.get(weekdayOf(k));
        const isToday = k === todayKey;
        return {
          key: k,
          dayKey: k,
          staffId: weekStaffId,
          label: dayTitle(k, todayKey),
          header: (
            <button
              type="button"
              onClick={() => openDay(k)}
              aria-label={`${dayTitle(k, todayKey)}${items.length ? `, ${items.length} randevu` : ""}. Günü aç`}
              className="pressable -mx-1.5 flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pr-2 pl-1.5 hover:bg-hover"
            >
              <span className="text-[0.8125rem] font-medium text-label-2">{GUN_KISA[weekdayOf(k) - 1]}</span>
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-[0.9375rem] font-semibold tabular-nums",
                  isToday && "bg-primary-fill text-on-primary-fill",
                )}
              >
                {Number(k.slice(8))}
              </span>
            </button>
          ),
          items,
          off: offIntervals(win, 0, 1440, timeOffFor(weekStaffId, k)),
          notes: win === null ? [{ at: 0, text: weekStaffId ? "Çalışmıyor" : "Kapalı" }] : [],
          isToday,
        };
      }),
    // openDay her çizimde yeni; başlık düğmesi güncel tarihi kullanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessWindow, byDay, timeOffFor, todayKey, weekDays, weekStaffId, windowFor],
  );

  // Saat aralığı: görünen günlerin işletme saati + görünen personelin vardiyası + randevular
  const hours = React.useMemo<[number, number]>(() => {
    const keys = view === "hafta" ? weekDays : [dateKey];
    const ids = ownStaff ? ownStaff.map((s) => s.id) : filterId ? [filterId] : activeStaff.map((s) => s.id);
    const windows: { start: number; end: number }[] = [];
    for (const k of keys) {
      const b = businessWindow.get(weekdayOf(k));
      if (b) windows.push(b);
      for (const id of ids) {
        const w = windowFor(id, k);
        if (w) windows.push(w);
      }
    }
    const spans = keys.flatMap((k) =>
      (byDay.get(k) ?? []).map((a) => ({ start: a.startMin, end: a.endMin })),
    );
    return hourBounds(windows, spans);
  }, [activeStaff, businessWindow, byDay, dateKey, filterId, ownStaff, view, weekDays, windowFor]);

  const manyStaff = !filterId && !onlyOwn && activeStaff.length >= 2;
  const colorOf = React.useMemo(() => new Map(staff.map((s) => [s.id, s.color ?? null])), [staff]);
  const initialsFor = manyStaff
    ? (a: Placed) => {
        const text = staffInitials(a);
        if (!text) return null;
        return (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className={cn("status-dot size-1.5", staffDotClass(colorOf.get(a.staff_member_id ?? "")))} />
            {text}
          </span>
        );
      }
    : undefined;

  /* ---------------- Boş durum ---------------- */

  const emptyTitle =
    view === "gun" ? "Bu gün randevu yok" : view === "hafta" ? "Bu hafta randevu yok" : "Bu ay randevu yok";
  const emptyAction = canManage ? (
    noCustomers ? (
      <Button asChild variant="secondary">
        <Link href="/musteriler">Müşterilere git</Link>
      </Button>
    ) : (
      <Button onClick={openCreate}>
        <Plus />
        Yeni randevu
      </Button>
    )
  ) : undefined;
  const emptyDescription = canManage
    ? noCustomers
      ? "Randevu oluşturmak için önce bir müşteri ekleyin."
      : "Yeni randevu oluşturabilir ya da başka bir tarihe geçebilirsiniz."
    : "Başka bir tarihe geçmek için okları kullanın.";

  const overlay = isEmpty ? (
    <EmptyOverlay
      icon={CalendarPlus}
      title={emptyTitle}
      description={emptyDescription}
      action={emptyAction}
      className={view === "ay" ? "top-1/3" : "top-20"}
    />
  ) : null;

  /* ---------------- İçerik ---------------- */

  const errorBox = (
    <ErrorState
      title="Randevular yüklenemedi"
      description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
      onRetry={store.retry}
    />
  );

  let content: React.ReactNode;
  if (failed) {
    content = errorBox;
  } else if (view === "gun") {
    content = (
      <>
        <div className="hidden md:block">
          <TimeGrid
            columns={dayColumns}
            hours={hours}
            nowMin={nowMin}
            minColWidth={dayColumns.length > 1 ? 168 : 0}
            fitViewport
            loading={loading}
            selectedId={sel}
            onOpen={openAppt}
            onSlot={canManage ? openSlot : undefined}
            scrollKey={rangeKey}
            overlay={overlay}
            ariaLabel={`${dayTitle(dateKey, todayKey)} — personele göre randevular`}
          />
        </div>
        <div className="md:hidden">
          <TimeGrid
            columns={[phoneDayColumn]}
            hours={hours}
            nowMin={nowMin}
            gutter={50}
            minColWidth={0}
            showHeader={false}
            loading={loading}
            selectedId={sel}
            initialsFor={initialsFor}
            onOpen={openAppt}
            onSlot={canManage ? openSlot : undefined}
            scrollKey={rangeKey}
            overlay={overlay}
            ariaLabel={`${dayTitle(dateKey, todayKey)} randevuları`}
          />
        </div>
      </>
    );
  } else if (view === "hafta") {
    content = (
      <>
        <div className="hidden md:block">
          <TimeGrid
            columns={weekColumns}
            hours={hours}
            nowMin={nowMin}
            minColWidth={92}
            fitViewport
            loading={loading}
            selectedId={sel}
            initialsFor={initialsFor}
            onOpen={openAppt}
            onSlot={canManage ? openSlot : undefined}
            scrollKey={rangeKey}
            overlay={overlay}
            ariaLabel={`${rangeTitle("hafta", dateKey, todayKey)} haftasının randevuları`}
          />
        </div>
        <div className="space-y-6 md:hidden">
          {loading ? (
            <AgendaSkeleton />
          ) : isEmpty ? (
            <EmptyState
              icon={CalendarX2}
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          ) : (
            weekDays.map((k) => (
              <AgendaDay key={k} dayKey={k} todayKey={todayKey} items={byDay.get(k) ?? []} actions={agenda} />
            ))
          )}
        </div>
      </>
    );
  } else {
    const weeks = monthWeeks(dateKey);
    const selectedItems = byDay.get(dateKey) ?? [];
    content = (
      <>
        <div className="hidden md:block">
          <MonthGrid
            weeks={weeks}
            month={shownMonth}
            todayKey={todayKey}
            byDay={byDay}
            loading={loading}
            selectedId={sel}
            onOpen={openAppt}
            onDay={openDay}
            overlay={overlay}
          />
        </div>
        <div className="space-y-5 md:hidden">
          <MonthCompact
            weeks={weeks}
            month={shownMonth}
            todayKey={todayKey}
            selectedKey={dateKey}
            byDay={byDay}
            loading={loading}
            onSelect={selectDay}
          />
          {loading ? (
            <AgendaSkeleton rows={2} />
          ) : selectedItems.length === 0 ? (
            <section aria-label={dayTitle(dateKey, todayKey)} className="space-y-2">
              <h3 className="section-title mx-1 truncate">{dayTitle(dateKey, todayKey)}</h3>
              <EmptyState
                icon={CalendarPlus}
                title="Bu gün randevu yok"
                description={canManage && !noCustomers ? "Bu güne randevu ekleyebilirsiniz." : undefined}
                action={emptyAction}
                className="py-8"
              />
            </section>
          ) : (
            <AgendaDay dayKey={dateKey} todayKey={todayKey} items={selectedItems} actions={agenda} />
          )}
        </div>
      </>
    );
  }

  const enterX = (n: Nav) =>
    n.swipe ? Math.round((typeof window === "undefined" ? 400 : window.innerWidth) * 0.6) : 48;
  const variants = {
    enter: (n: Nav) =>
      reduce
        ? { opacity: 0 }
        : n.dir === 0
          ? { opacity: 0, scale: 0.985, x: 0 }
          : { opacity: 0, x: n.dir * enterX(n), scale: 1 },
    center: { opacity: 1, x: 0, scale: 1, transition: transition("default") },
    exit: (n: Nav) =>
      reduce
        ? { opacity: 0, transition: transition("exit") }
        : n.dir === 0
          ? { opacity: 0, scale: 0.985, transition: transition("exit") }
          : {
              opacity: 0,
              x: -n.dir * (n.swipe ? enterX(n) / 0.6 : 48),
              transition: n.swipe ? transition("momentum", n.v) : transition("exit"),
            },
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="Takvim"
        description="Randevuları gün, hafta ya da ay olarak görün."
        context={
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <SegmentedControl
              aria-label="Görünüm"
              items={VIEWS}
              value={view}
              onValueChange={changeView}
              size="touch"
              fullWidth
              className="md:w-auto"
            />
            <div className="flex min-w-0 items-center gap-1">
              <Button
                variant="glass"
                size="icon-sm"
                className="max-md:size-11"
                aria-label={STEP_LABEL[view][0]}
                onClick={() => step(-1)}
              >
                <ChevronLeft />
              </Button>
              <h2
                aria-live="polite"
                className="min-w-0 flex-1 truncate px-1 text-center text-[0.9375rem] font-semibold whitespace-nowrap md:w-[12.5rem] md:flex-none"
              >
                <span className="md:hidden">{rangeTitle(view, dateKey, todayKey, true)}</span>
                <span className="hidden md:inline">{rangeTitle(view, dateKey, todayKey)}</span>
              </h2>
              <Button
                variant="glass"
                size="icon-sm"
                className="max-md:size-11"
                aria-label={STEP_LABEL[view][1]}
                onClick={() => step(1)}
              >
                <ChevronRight />
              </Button>
              <Button
                variant="glass"
                size="sm"
                className="ml-1 max-md:h-11 max-md:px-4"
                onClick={toToday}
                disabled={atToday}
                aria-keyshortcuts="T"
              >
                Bugün
              </Button>
            </div>
          </div>
        }
        primary={
          canManage ? (
            <ToolbarAction
              prominent
              icon={Plus}
              label="Yeni randevu"
              onClick={openCreate}
              disabled={noCustomers}
            />
          ) : undefined
        }
      />

      {/* Personel filtresi + özet; satır hep yer tutar, gezinirken içerik zıplamaz */}
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-4">
        {filterable && (
          <SegmentedControl
            aria-label="Personel"
            items={[
              { value: ALL, label: "Tümü" },
              ...activeStaff.map((s) => ({ value: s.id, label: s.full_name })),
            ]}
            value={filterId || ALL}
            onValueChange={(v) => {
              setSel(null);
              set({ personel: v === ALL ? "" : v });
            }}
            size="touch"
            fullWidth
            className="md:w-auto md:max-w-[min(44rem,100%)]"
          />
        )}
        <p
          className={cn(
            "min-h-[1.125rem] truncate text-subhead text-label-2w md:shrink-0",
            filterable && "md:ml-auto",
          )}
          aria-live="polite"
        >
          {isEmpty ? "" : summary}
        </p>
      </div>

      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false} custom={nav}>
          <motion.div
            key={rangeKey}
            custom={nav}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag={isPhone ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            dragMomentum={false}
            onDragStart={() => (swiping.current = true)}
            onDragEnd={onSwipeEnd}
            style={{ touchAction: "pan-y" }}
            className="space-y-3"
          >
            {content}
            {!failed && view !== "ay" && (
              <div className={cn("flex min-w-0 items-center gap-4", view === "hafta" && "max-md:hidden")}>
                <Legend className="min-w-0 flex-1" />
                <p className="hidden shrink-0 text-[0.75rem] whitespace-nowrap text-label-2 lg:block">
                  Bloğa basın: ayrıntı ve Geldi · ← → tarih · T bugün
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ayrıntı: masaüstünde bloğun yanında, telefonda alt sayfa */}
      {!isPhone && (
        <Popover open={!!sel && !!shown} onOpenChange={(o) => !o && setSel(null)}>
          <PopoverAnchor virtualRef={anchorRef as React.RefObject<HTMLElement>} />
          <PopoverContent
            side="bottom"
            align="start"
            className="w-80"
            aria-label={shown ? `${shown.customer_name} randevusu` : "Randevu"}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (anchorRef.current?.isConnected) anchorRef.current.focus({ preventScroll: true });
            }}
            onInteractOutside={(e) => {
              if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
          >
            {shown && (
              <AppointmentDetail
                variant="popover"
                a={shown}
                tz={tz}
                todayKey={todayKey}
                canArrive={canArrive(shown)}
                canEdit={canManage && !!formOptions}
                onArrive={() => arrive(shown)}
                onUndo={() => undo(shown)}
                onEdit={() => {
                  setSel(null);
                  setForm({ mode: "edit", appt: shown });
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      )}
      {isPhone && (
        <Sheet open={!!sel && !!shown} onOpenChange={(o) => !o && setSel(null)}>
          <SheetContent side="bottom" detents={[0.58, 0.9]}>
            <SheetHeader>
              <SheetTitle className="truncate">{shown?.customer_name ?? "Randevu"}</SheetTitle>
              <SheetDescription className="truncate">
                {shown?.service_name ?? "Hizmet belirtilmedi"}
              </SheetDescription>
            </SheetHeader>
            {shown && (
              <AppointmentDetail
                variant="sheet"
                a={shown}
                tz={tz}
                todayKey={todayKey}
                canArrive={canArrive(shown)}
                canEdit={canManage && !!formOptions}
                onArrive={() => arrive(shown)}
                onUndo={() => undo(shown)}
                onEdit={() => {
                  setSel(null);
                  setForm({ mode: "edit", appt: shown });
                }}
              />
            )}
          </SheetContent>
        </Sheet>
      )}

      {/* Yeni randevu / Düzenle — Randevular'daki formun aynısı */}
      {formOptions && (
        <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
          <SheetContent side="auto">
            <SheetHeader>
              <SheetTitle>{shownForm?.mode === "edit" ? "Randevuyu düzenle" : "Yeni randevu"}</SheetTitle>
              <SheetDescription>
                {shownForm?.mode === "edit"
                  ? `${shownForm.appt.customer_name} · ${dayTitle(dayKeyOf(shownForm.appt.starts_at, tz), todayKey)}`
                  : "Müşteri, hizmet ve saati seçin."}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-5">
              {shownForm?.mode !== "edit" && noCustomers ? (
                <EmptyState
                  variant="inline"
                  icon={CalendarPlus}
                  title="Önce müşteri ekleyin"
                  description="Randevu bir müşteriye bağlanır. Müşteri ekledikten sonra buradan randevu oluşturabilirsiniz."
                  action={
                    <Button asChild variant="secondary">
                      <Link href="/musteriler">Müşterilere git</Link>
                    </Button>
                  }
                />
              ) : shownForm ? (
                <AppointmentForm
                  key={shownForm.mode === "edit" ? shownForm.appt.id : `new-${shownForm.startsAt ?? ""}-${shownForm.staffId ?? ""}`}
                  appointment={shownForm.mode === "edit" ? shownForm.appt : undefined}
                  customers={formOptions.customers}
                  services={formOptions.services}
                  staff={formOptions.staff}
                  packages={formOptions.packages}
                  presetStartsAt={shownForm.mode === "create" ? shownForm.startsAt : undefined}
                  presetStaffId={shownForm.mode === "create" ? shownForm.staffId : undefined}
                  onSuccess={() => {
                    setForm(null);
                    void store.refresh();
                  }}
                  onCancel={() => setForm(null)}
                />
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/** Gün görünümünde personel sütununun başlığı. */
function ColumnHeader({
  kind,
  name,
  count,
  color,
}: {
  kind: "staff" | "none" | "all";
  name: string;
  count: number;
  color?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {kind === "staff" && <Avatar name={name} size="sm" />}
      {kind === "none" && (
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-label-3 text-label-3"
        >
          <UserRound className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] leading-4 font-semibold" title={name}>
          {kind === "staff" && <span aria-hidden className={cn("status-dot", staffDotClass(color))} />}
          <span className="truncate">{name}</span>
        </p>
        <p className="truncate text-[0.75rem] leading-4 text-label-2">
          {count ? `${count} randevu` : "Randevu yok"}
        </p>
      </div>
    </div>
  );
}
