"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, CheckCircle2, Bell, User, GripVertical, Zap, Trash2, AlignLeft, CalendarClock, Tag, X, Check, Pencil, History, MoveRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import {
  createTask,
  updateTask,
  moveTask as moveTaskAction,
  deleteTask,
  createColumn,
  renameColumn,
  deleteColumn,
} from "./actions";

type Priority = "high" | "normal" | "low";
type CustStatus = "aktif" | "lead" | "pasif";

/** Sunucudan gelen liste (task_columns). */
export interface BoardColumn {
  id: string;
  label: string;
  color: string;
  isDone: boolean;
}

/** Sunucudan gelen görev (tasks + ilişkili müşteri/personel). */
export interface BoardTask {
  id: string;
  columnId: string;
  emoji: string;
  title: string;
  description: string;
  assigneeId: string | null;
  assigneeName: string;
  dueAt: string | null;
  priority: Priority;
  customerId: string | null;
  customerName: string | null;
  customerStatus: CustStatus | null;
  isAuto: boolean;
  hasAlert: boolean;
  completedAt: string | null;
  createdByLabel: string;
  createdAt: string;
}

/** Seçim kutuları için (personel / müşteri). */
export interface BoardOption {
  id: string;
  label: string;
  status?: CustStatus;
}

const CUST_STATUS: Record<CustStatus, { label: string; chip: string; dot: string }> = {
  aktif: { label: "Aktif Müşteri", chip: "bg-emerald-500/12 text-emerald-700", dot: "bg-emerald-500" },
  lead: { label: "Lead", chip: "bg-amber-500/15 text-amber-700", dot: "bg-amber-500" },
  pasif: { label: "Pasif Müşteri", chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

const PRIORITY: Record<Priority, { label: string; bar: string; chip: string }> = {
  high: { label: "Acil", bar: "bg-rose-500", chip: "bg-rose-500/12 text-rose-600" },
  normal: { label: "Normal", bar: "bg-indigo-400", chip: "bg-indigo-500/12 text-indigo-600" },
  low: { label: "Düşük", bar: "bg-emerald-400", chip: "bg-emerald-500/12 text-emerald-600" },
};

const DOT_PALETTE = ["bg-amber-400", "bg-primary", "bg-emerald-500", "bg-sky-400", "bg-rose-400", "bg-violet-400", "bg-teal-400", "bg-orange-400"];
const AVATAR_TONES = ["bg-primary/15 text-primary", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];

function tone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h];
}

function relTime(iso: string) {
  const at = new Date(iso).getTime();
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün önce`;
  return new Date(at).toLocaleDateString("tr-TR");
}

/** "2026-09-19T17:00:00Z" → "19 Eyl 17:00" */
function formatDue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** datetime-local input değeri ("2026-09-19T17:00") */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeOnly(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function TasksBoard({
  columns,
  tasks,
  staff,
  customers,
  hasBusiness,
}: {
  columns: BoardColumn[];
  tasks: BoardTask[];
  staff: BoardOption[];
  customers: BoardOption[];
  hasBusiness: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  /** Server action çalıştır; hata varsa bildir, başarılıysa veriyi tazele. */
  function run(fn: () => Promise<{ error?: string }>, okMsg?: string) {
    start(async () => {
      const res = await fn();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
    });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id).replace(/^task-/, ""));
  }

  function handleDragEnd(e: DragEndEvent) {
    const id = activeId;
    setActiveId(null);
    if (!id || !e.over) return;
    const overData = e.over.data.current as { colId?: string } | undefined;
    const toCol = overData?.colId;
    if (!toCol) return;

    const task = tasks.find((t) => t.id === id);
    if (!task || task.columnId === toCol) return;

    // Hedef listedeki yeni sıralama (taşınan kart sona eklenir).
    const ordered = [...tasks.filter((t) => t.columnId === toCol).map((t) => t.id), id];
    run(() => moveTaskAction(id, toCol, ordered));
  }

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee_id: "",
    priority: "normal" as Priority,
    due_at: "",
    column_id: columns[0]?.id ?? "",
    customer_id: "",
  });

  const [editId, setEditId] = useState<string | null>(null);
  const editing = tasks.find((t) => t.id === editId) ?? null;
  // Kart detayında düzenlenen alanlar (kaydedilene kadar yerelde tutulur).
  const [draft, setDraft] = useState<Partial<BoardTask>>({});
  const current = editing ? { ...editing, ...draft } : null;

  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [colName, setColName] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const isDone = (colId: string) => !!columns.find((c) => c.id === colId)?.isDone;

  function openAdd(colId: string) {
    setForm({
      title: "",
      description: "",
      assignee_id: "",
      priority: "normal",
      due_at: "",
      column_id: colId,
      customer_id: "",
    });
    setOpen(true);
  }

  function addTask() {
    if (!form.title.trim()) return;
    setOpen(false);
    run(() => createTask(form), "Görev eklendi");
  }

  /** Kart detayındaki değişiklikleri kaydeder. */
  function saveCurrent() {
    if (!current) return;
    setEditId(null);
    setDraft({});
    run(
      () =>
        updateTask(current.id, {
          title: current.title,
          description: current.description,
          emoji: current.emoji,
          column_id: current.columnId,
          assignee_id: current.assigneeId ?? "",
          due_at: toLocalInput(current.dueAt),
          priority: current.priority,
          customer_id: current.customerId ?? "",
        }),
      "Görev güncellendi"
    );
  }

  function removeTask(id: string) {
    setEditId(null);
    setDraft({});
    run(() => deleteTask(id), "Görev silindi");
  }

  function startRename(c: BoardColumn) {
    setEditingCol(c.id);
    setColName(c.label);
  }

  function commitRename() {
    const id = editingCol;
    const name = colName.trim();
    setEditingCol(null);
    if (id && name) run(() => renameColumn(id, name));
  }

  function addList() {
    const name = newListName.trim();
    setAddingList(false);
    setNewListName("");
    if (!name) return;
    run(
      () => createColumn({ label: name, color: DOT_PALETTE[columns.length % DOT_PALETTE.length] }),
      "Liste eklendi"
    );
  }

  function removeList(c: BoardColumn) {
    if (columns.length <= 1) {
      toast.error("En az bir liste kalmalı.");
      return;
    }
    run(() => deleteColumn(c.id), `"${c.label}" listesi silindi`);
  }

  if (!hasBusiness) {
    return (
      <div className="space-y-6">
        <PageHeader title="Görev Sistemi" description="Ekip görevlerini listeler halinde yönet." />
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Oturum bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Görev Sistemi" description="Listeleri Trello gibi yönet: kart ekle, sürükle, kartın içine girip düzenle; müşteri bağla, geçmişi gör.">
        <Button onClick={() => openAdd(columns[0]?.id ?? "todo")}>
          <Plus className="size-4" />
          Görev Ekle
        </Button>
      </PageHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
      <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {columns.map((col) => {
            const items = tasks.filter((t) => t.columnId === col.id);
            return (
              <TaskColumn key={col.id} colId={col.id}>
                <div className="group/col flex items-center gap-2 px-3 py-2.5">
                  <span className={cn("size-2.5 shrink-0 rounded-full", col.color)} />
                  {editingCol === col.id ? (
                    <input autoFocus value={colName} onChange={(e) => setColName(e.target.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingCol(null); }} className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-sm font-bold outline-none" />
                  ) : (
                    <button onClick={() => startRename(col)} className="flex flex-1 items-center gap-1.5 text-left text-sm font-bold tracking-tight" title="Yeniden adlandır">
                      {col.label}<Pencil className="size-3 text-muted-foreground/0 transition-colors group-hover/col:text-muted-foreground/60" />
                    </button>
                  )}
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/8 px-1.5 text-xs font-bold text-muted-foreground">{items.length}</span>
                  <button onClick={() => removeList(col)} className="text-muted-foreground/0 transition-colors group-hover/col:text-muted-foreground/60 hover:!text-danger" title="Listeyi sil"><Trash2 className="size-3.5" /></button>
                </div>

                <div className="flex-1 space-y-2 px-2 pb-2">
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Görev yok</p>
                  )}
                  {items.map((t) => {
                    const done = isDone(t.columnId);
                    const pri = PRIORITY[t.priority];
                    const cust = t.customerStatus ? CUST_STATUS[t.customerStatus] : null;
                    return (
                      <SortableTaskCard
                        key={t.id}
                        taskId={t.id}
                        onOpen={() => setEditId(t.id)}
                      >
                        <div className="flex gap-1 px-3 pt-2.5">
                          <span className={cn("h-1.5 w-9 rounded-full", done ? "bg-emerald-500" : pri.bar)} />
                          {t.isAuto && <span className="h-1.5 w-6 rounded-full bg-violet-400" />}
                          {t.customerName && <span className={cn("h-1.5 w-6 rounded-full", cust!.dot)} />}
                          {t.hasAlert && !done && <span className="h-1.5 w-6 rounded-full bg-amber-400" />}
                        </div>

                        <div className="p-3 pt-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground/25 transition-colors group-hover:text-muted-foreground" />
                            <p className={cn("flex-1 text-sm font-semibold leading-tight", done && "text-muted-foreground line-through")}>{t.emoji} {t.title}</p>
                            {done && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
                            {t.hasAlert && !done && <Bell className="size-4 shrink-0 text-amber-500" />}
                          </div>

                          {t.description && !done && <p className="mt-1.5 line-clamp-2 pl-6 text-xs text-muted-foreground">{t.description}</p>}

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 py-0.5 pl-0.5 pr-2 font-medium">
                              <span className={cn("flex size-4 items-center justify-center rounded-full text-[9px] font-bold", tone(t.assigneeName))}>{t.assigneeName.slice(0, 1).toLocaleUpperCase("tr")}</span>{t.assigneeName}
                            </span>
                            {t.isAuto && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/12 px-1.5 py-0.5 font-medium text-violet-600"><Zap className="size-2.5" />Otomatik</span>}
                            {!done && t.priority !== "normal" && <span className={cn("rounded-[var(--radius-sm)] px-1.5 py-0.5 font-medium", pri.chip)}>{pri.label}</span>}
                            {done ? <span className="text-muted-foreground">Tamamlandı · {timeOnly(t.completedAt)}</span> : <span className={cn(t.priority === "high" ? "font-medium text-rose-600" : "text-muted-foreground")}>{formatDue(t.dueAt)}</span>}
                          </div>

                          {t.customerName && (
                            <div className={cn("mt-2 ml-6 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs", cust!.chip)}>
                              <User className="size-3.5" />
                              <span className="font-medium">{t.customerName}</span>
                              <span className="ml-auto rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold">{cust!.label}</span>
                            </div>
                          )}
                        </div>
                      </SortableTaskCard>
                    );
                  })}

                  <button onClick={() => openAdd(col.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"><Plus className="size-3.5" />Görev ekle</button>
                </div>
              </TaskColumn>
            );
          })}

          <div className="w-72 shrink-0 self-start">
            {addingList ? (
              <div className="surface p-2">
                <input autoFocus value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addList(); if (e.key === "Escape") { setAddingList(false); setNewListName(""); } }} placeholder="Liste adı…" className="mb-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none" />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={addList}><Check className="size-4" />Ekle</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingList(false); setNewListName(""); }}><X className="size-4" /></Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingList(true)} className="flex w-full items-center gap-1.5 rounded-lg border border-dashed bg-card/60 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"><Plus className="size-4" />Liste ekle</button>
            )}
          </div>
        </div>
      </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }}>
          {activeTask ? (
            <div className="w-72 rotate-2 rounded-lg border bg-card p-3 shadow-soft-lg">
              <p className="text-sm font-semibold leading-tight">
                {activeTask.emoji} {activeTask.title}
              </p>
              {activeTask.assigneeName && (
                <p className="mt-1 text-xs text-muted-foreground">{activeTask.assigneeName}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* YENİ GÖREV */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Yeni Görev</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="t-title">Başlık</label>
              <input id="t-title" autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} placeholder="Görev başlığı" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="t-desc">Açıklama</label>
              <textarea id="t-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Detay (opsiyonel)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atanan</label>
                <select value={form.assignee_id} onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Tüm Ekip</option>
                  {staff.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="t-due">Ne zaman</label>
                <input id="t-due" type="datetime-local" value={form.due_at} onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Müşteri</label>
              <CustomerPicker customers={customers} value={form.customer_id} onChange={(v) => setForm((f) => ({ ...f, customer_id: v }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Öncelik</label>
              <PriorityPicker value={form.priority} onChange={(p) => setForm((f) => ({ ...f, priority: p }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liste</label>
              <ColumnPicker columns={columns} value={form.column_id} onChange={(id) => setForm((f) => ({ ...f, column_id: id }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={addTask} disabled={!form.title.trim() || pending}>{pending ? "Ekleniyor…" : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KART DETAYI */}
      <Dialog open={!!editId} onOpenChange={(o) => { if (!o) { setEditId(null); setDraft({}); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {current && (
            <>
              <div className="flex gap-1 pr-8">
                <span className={cn("h-1.5 w-12 rounded-full", isDone(current.columnId) ? "bg-emerald-500" : PRIORITY[current.priority].bar)} />
                {current.isAuto && <span className="h-1.5 w-7 rounded-full bg-violet-400" />}
                {current.customerStatus && <span className={cn("h-1.5 w-7 rounded-full", CUST_STATUS[current.customerStatus].dot)} />}
              </div>
              <DialogHeader>
                <DialogTitle className="sr-only">Görev Detayı</DialogTitle>
                <input value={current.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-bold outline-none hover:border-input focus:border-input focus:bg-background" />
                <p className="px-2 text-xs text-muted-foreground"><b>{current.createdByLabel}</b> oluşturdu · {relTime(current.createdAt)}</p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Tag className="size-3.5" />Liste</label>
                  <ColumnPicker columns={columns} value={current.columnId} onChange={(id) => setDraft((d) => ({ ...d, columnId: id }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><AlignLeft className="size-3.5" />Açıklama</label>
                  <textarea value={current.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={3} placeholder="Bu göreve açıklama ekle…" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><User className="size-3.5" />Atanan</label>
                    <select value={current.assigneeId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, assigneeId: e.target.value || null }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Tüm Ekip</option>
                      {staff.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarClock className="size-3.5" />Ne zaman</label>
                    <input type="datetime-local" value={toLocalInput(current.dueAt)} onChange={(e) => setDraft((d) => ({ ...d, dueAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><User className="size-3.5" />Müşteri</label>
                  <CustomerPicker customers={customers} value={current.customerId ?? ""} onChange={(v) => setDraft((d) => ({ ...d, customerId: v || null }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Öncelik</label>
                  <PriorityPicker value={current.priority} onChange={(p) => setDraft((d) => ({ ...d, priority: p }))} />
                </div>

              </div>

              <DialogFooter className="sm:justify-between">
                <Button variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => removeTask(current.id)}><Trash2 className="size-4" />Sil</Button>
                <Button onClick={saveCurrent} disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerPicker({ customers, value, onChange }: { customers: BoardOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
      <option value="">— Müşteri yok —</option>
      {customers.map((c) => <option key={c.id} value={c.id}>{c.label}{c.status ? ` (${CUST_STATUS[c.status].label})` : ""}</option>)}
    </select>
  );
}

function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  const opts: Priority[] = ["high", "normal", "low"];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {opts.map((p) => {
        const m = PRIORITY[p];
        const active = value === p;
        return (
          <button key={p} type="button" onClick={() => onChange(p)} className={cn("flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors", active ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted")}>
            <span className={cn("size-2.5 rounded-full", m.bar)} />{m.label}
          </button>
        );
      })}
    </div>
  );
}

function ColumnPicker({ columns, value, onChange }: { columns: BoardColumn[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {columns.map((c) => {
        const active = value === c.id;
        return (
          <button key={c.id} type="button" onClick={() => onChange(c.id)} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            <span className={cn("size-2.5 rounded-full", c.color)} />{c.label}
          </button>
        );
      })}
    </div>
  );
}

/** Görev listesi kabı — kartların bırakılabileceği hedef. */
function TaskColumn({
  colId,
  children,
}: {
  colId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${colId}`,
    data: { colId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col self-start rounded-lg border bg-card shadow-soft transition-colors",
        isOver && "ring-2 ring-primary"
      )}
    >
      {children}
    </div>
  );
}

/** Sürüklenebilir görev kartı; sürükleme yoksa tıklayınca detayı açar. */
function SortableTaskCard({
  taskId,
  onOpen,
  children,
}: {
  taskId: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task-${taskId}`, data: { id: taskId } });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => {
        // Sürükleme sırasında tıklama tetiklenmesin
        if (!isDragging) onOpen();
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group cursor-pointer touch-none overflow-hidden rounded-lg border bg-card shadow-soft transition-all",
        isDragging ? "opacity-40" : "hover:-translate-y-0.5 hover:shadow-soft-lg"
      )}
    >
      {children}
    </div>
  );
}
