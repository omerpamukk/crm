"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Bell, User, GripVertical, Zap, Trash2, AlignLeft, CalendarClock, Tag, X, Check, Pencil } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Priority = "high" | "normal" | "low";
type Column = { id: string; label: string; dot: string; done?: boolean };
type Task = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  assignee: string;
  when: string;
  priority: Priority;
  colId: string;
  customer?: string;
  auto?: boolean;
  alert?: boolean;
  completedAt?: string;
};

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", label: "Yapılacaklar", dot: "bg-amber-400" },
  { id: "doing", label: "Devam Edenler", dot: "bg-primary" },
  { id: "done", label: "Tamamlananlar", dot: "bg-emerald-500", done: true },
];

const INITIAL: Task[] = [
  { id: "t1", emoji: "📞", title: "Seda Yılmaz aranacak", desc: "Lead geldi, 2 saat aranmadı.", assignee: "Ayşe", when: "Bugün 17:00", priority: "high", customer: "Seda Yılmaz", auto: true, colId: "todo" },
  { id: "t2", emoji: "💳", title: "Ahmet Çelik ödeme takibi", desc: "7.000₺ gecikmiş ödeme — 8 gündür ödeme yok.", assignee: "Zeynep", when: "Bugün 16:00", priority: "high", customer: "Ahmet Çelik", auto: true, colId: "todo" },
  { id: "t3", emoji: "📅", title: "Randevu hatırlatması gönder", desc: "Yarınki 3 randevu için SMS/WP mesajı gönderilmeli.", assignee: "Tüm Ekip", when: "Bugün 18:00", priority: "normal", colId: "todo" },
  { id: "t4", emoji: "📸", title: "Instagram DM yanıtları", desc: "3 yanıtsız DM var, cevap verilecek.", assignee: "Ayşe", when: "Bugün 14:00", priority: "normal", alert: true, colId: "doing" },
  { id: "t5", emoji: "🔄", title: "Zeynep Arslan paketi yenile", desc: "Cilt bakımı 4'lü paket bitiyor, teklif yapılacak.", assignee: "Zeynep", when: "Yarın 12:00", priority: "low", customer: "Zeynep Arslan", colId: "doing" },
  { id: "t6", emoji: "📞", title: "Büşra Kaya arandı", desc: "", assignee: "Ayşe", when: "", priority: "normal", colId: "done", completedAt: "10:30" },
  { id: "t7", emoji: "📊", title: "Mayıs gider raporu hazırla", desc: "", assignee: "Zeynep", when: "", priority: "normal", colId: "done", completedAt: "09:15" },
];

const PRIORITY: Record<Priority, { label: string; bar: string; chip: string }> = {
  high: { label: "Acil", bar: "bg-rose-500", chip: "bg-rose-500/12 text-rose-600" },
  normal: { label: "Normal", bar: "bg-indigo-400", chip: "bg-indigo-500/12 text-indigo-600" },
  low: { label: "Düşük", bar: "bg-emerald-400", chip: "bg-emerald-500/12 text-emerald-600" },
};

const DOT_PALETTE = ["bg-amber-400", "bg-primary", "bg-emerald-500", "bg-sky-400", "bg-rose-400", "bg-violet-400", "bg-teal-400", "bg-orange-400"];
const ASSIGNEES = ["Tüm Ekip", "Ayşe", "Zeynep", "Merve"];
const AVATAR_TONES = ["bg-primary/15 text-primary", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];
function tone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h];
}
const now = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default function GorevlerPage() {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "", assignee: "Tüm Ekip", priority: "normal" as Priority, when: "Bugün", colId: "todo" });
  const [editId, setEditId] = useState<string | null>(null);
  const editing = tasks.find((t) => t.id === editId) ?? null;

  // Sütun düzenleme
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [colName, setColName] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const isDone = (colId: string) => !!columns.find((c) => c.id === colId)?.done;
  const update = (id: string, patch: Partial<Task>) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const drop = (id: string, colId: string) => update(id, { colId, completedAt: isDone(colId) ? now() : undefined });
  const remove = (id: string) => { setTasks((prev) => prev.filter((t) => t.id !== id)); setEditId(null); toast.success("Görev silindi"); };

  function openAdd(colId: string) {
    setForm({ title: "", desc: "", assignee: "Tüm Ekip", priority: "normal", when: "Bugün", colId });
    setOpen(true);
  }
  function addTask() {
    if (!form.title.trim()) return;
    setTasks((prev) => [
      { id: `t-${Date.now()}`, emoji: "📝", title: form.title.trim(), desc: form.desc.trim(), assignee: form.assignee, when: form.when.trim() || "Bugün", priority: form.priority, colId: form.colId, completedAt: isDone(form.colId) ? now() : undefined },
      ...prev,
    ]);
    setOpen(false);
    toast.success("Görev eklendi");
  }

  // --- Sütun işlemleri ---
  function startRename(c: Column) { setEditingCol(c.id); setColName(c.label); }
  function commitRename() {
    if (editingCol && colName.trim()) setColumns((prev) => prev.map((c) => (c.id === editingCol ? { ...c, label: colName.trim() } : c)));
    setEditingCol(null);
  }
  function addList() {
    const name = newListName.trim();
    if (!name) { setAddingList(false); return; }
    const id = `col-${Date.now()}`;
    setColumns((prev) => [...prev, { id, label: name, dot: DOT_PALETTE[prev.length % DOT_PALETTE.length] }]);
    setNewListName("");
    setAddingList(false);
    toast.success("Liste eklendi");
  }
  function removeList(c: Column) {
    if (columns.length <= 1) { toast.error("En az bir liste kalmalı."); return; }
    const fallback = columns.find((x) => x.id !== c.id)!.id;
    setTasks((prev) => prev.map((t) => (t.colId === c.id ? { ...t, colId: fallback } : t)));
    setColumns((prev) => prev.filter((x) => x.id !== c.id));
    toast.success(`"${c.label}" listesi silindi`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Görev Sistemi" description="Listeleri Trello gibi yönet: kart ekle, sürükle, kartın içine girip düzenle; liste ekle/yeniden adlandır.">
        <Button onClick={() => openAdd(columns[0]?.id ?? "todo")}>
          <Plus className="size-4" />
          Görev Ekle
        </Button>
      </PageHeader>

      {/* Trello tarzı board zemini — yatay kaydırma */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/8 via-violet-500/8 to-sky-500/10 p-3 ring-1 ring-black/5 sm:p-4 dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-sky-500/10">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {columns.map((col) => {
            const items = tasks.filter((t) => t.colId === col.id);
            const over = overCol === col.id;
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); if (draggingId) setOverCol(col.id); }}
                onDragLeave={() => setOverCol((s) => (s === col.id ? null : s))}
                onDrop={(e) => { e.preventDefault(); setOverCol(null); const id = e.dataTransfer.getData("text/task"); if (id) drop(id, col.id); setDraggingId(null); }}
                className={cn(
                  "flex w-72 shrink-0 flex-col self-start rounded-xl border border-white/60 bg-white/55 shadow-sm backdrop-blur-md transition-all dark:border-white/10 dark:bg-white/5",
                  over && "bg-primary/10 ring-2 ring-primary"
                )}
              >
                {/* Başlık — tıkla yeniden adlandır */}
                <div className="group/col flex items-center gap-2 px-3 py-2.5">
                  <span className={cn("size-2.5 shrink-0 rounded-full", col.dot)} />
                  {editingCol === col.id ? (
                    <input
                      autoFocus
                      value={colName}
                      onChange={(e) => setColName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingCol(null); }}
                      className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-sm font-bold outline-none"
                    />
                  ) : (
                    <button onClick={() => startRename(col)} className="flex flex-1 items-center gap-1.5 text-left text-sm font-bold tracking-tight" title="Yeniden adlandır">
                      {col.label}
                      <Pencil className="size-3 text-muted-foreground/0 transition-colors group-hover/col:text-muted-foreground/60" />
                    </button>
                  )}
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/8 px-1.5 text-xs font-bold text-muted-foreground">{items.length}</span>
                  <button onClick={() => removeList(col)} className="text-muted-foreground/0 transition-colors group-hover/col:text-muted-foreground/60 hover:!text-danger" title="Listeyi sil">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="flex-1 space-y-2 px-2 pb-2">
                  {items.length === 0 && (
                    <p className={cn("rounded-lg border border-dashed border-foreground/15 py-8 text-center text-sm text-muted-foreground", over && "border-primary text-primary")}>
                      {over ? "Buraya bırak" : "Görev yok"}
                    </p>
                  )}
                  {items.map((t) => {
                    const done = isDone(t.colId);
                    const pri = PRIORITY[t.priority];
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("text/task", t.id); e.dataTransfer.effectAllowed = "move"; setDraggingId(t.id); setDidDrag(true); }}
                        onDragEnd={() => { setDraggingId(null); setTimeout(() => setDidDrag(false), 0); }}
                        onClick={() => { if (!didDrag) setEditId(t.id); }}
                        className={cn(
                          "group cursor-pointer overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing dark:ring-white/10",
                          draggingId === t.id && "rotate-2 opacity-60"
                        )}
                      >
                        <div className="flex gap-1 px-3 pt-2.5">
                          <span className={cn("h-1.5 w-9 rounded-full", done ? "bg-emerald-500" : pri.bar)} />
                          {t.auto && <span className="h-1.5 w-6 rounded-full bg-violet-400" />}
                          {t.customer && <span className="h-1.5 w-6 rounded-full bg-sky-400" />}
                          {t.alert && !done && <span className="h-1.5 w-6 rounded-full bg-amber-400" />}
                        </div>

                        <div className="p-3 pt-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground/25 transition-colors group-hover:text-muted-foreground" />
                            <p className={cn("flex-1 text-sm font-semibold leading-tight", done && "text-muted-foreground line-through")}>{t.emoji} {t.title}</p>
                            {done && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
                            {t.alert && !done && <Bell className="size-4 shrink-0 text-amber-500" />}
                          </div>

                          {t.desc && !done && <p className="mt-1.5 line-clamp-2 pl-6 text-xs text-muted-foreground">{t.desc}</p>}

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 py-0.5 pl-0.5 pr-2 font-medium">
                              <span className={cn("flex size-4 items-center justify-center rounded-full text-[9px] font-bold", tone(t.assignee))}>{t.assignee.slice(0, 1).toLocaleUpperCase("tr")}</span>
                              {t.assignee}
                            </span>
                            {t.auto && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/12 px-1.5 py-0.5 font-medium text-violet-600"><Zap className="size-2.5" />Otomatik</span>}
                            {!done && t.priority !== "normal" && <span className={cn("rounded-full px-1.5 py-0.5 font-medium", pri.chip)}>{pri.label}</span>}
                            {done ? <span className="text-muted-foreground">Tamamlandı · {t.completedAt}</span> : <span className={cn(t.priority === "high" ? "font-medium text-rose-600" : "text-muted-foreground")}>{t.when}</span>}
                          </div>

                          {t.customer && !done && (
                            <div className="mt-2 ml-6 flex items-center gap-1.5 rounded-md bg-sky-500/8 px-2 py-1.5 text-xs">
                              <User className="size-3.5 text-sky-600" />
                              <span className="font-medium">{t.customer}</span>
                              <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Aktif Müşteri</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button onClick={() => openAdd(col.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground">
                    <Plus className="size-3.5" />Görev ekle
                  </button>
                </div>
              </div>
            );
          })}

          {/* Liste ekle */}
          <div className="w-72 shrink-0 self-start">
            {addingList ? (
              <div className="rounded-xl border border-white/60 bg-white/70 p-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addList(); if (e.key === "Escape") { setAddingList(false); setNewListName(""); } }}
                  placeholder="Liste adı…"
                  className="mb-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={addList}><Check className="size-4" />Ekle</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingList(false); setNewListName(""); }}><X className="size-4" /></Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingList(true)} className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-foreground/20 bg-white/30 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/60 hover:text-foreground dark:bg-white/5">
                <Plus className="size-4" />Liste ekle
              </button>
            )}
          </div>
        </div>
      </div>

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
              <textarea id="t-desc" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} rows={2} placeholder="Detay (opsiyonel)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atanan</label>
                <select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ne zaman</label>
                <input value={form.when} onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))} placeholder="Bugün 17:00" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Öncelik</label>
              <PriorityPicker value={form.priority} onChange={(p) => setForm((f) => ({ ...f, priority: p }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liste</label>
              <ColumnPicker columns={columns} value={form.colId} onChange={(id) => setForm((f) => ({ ...f, colId: id }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={addTask} disabled={!form.title.trim()}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KART DETAYI */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <>
              <div className="flex gap-1 pr-8">
                <span className={cn("h-1.5 w-12 rounded-full", isDone(editing.colId) ? "bg-emerald-500" : PRIORITY[editing.priority].bar)} />
                {editing.auto && <span className="h-1.5 w-7 rounded-full bg-violet-400" />}
                {editing.customer && <span className="h-1.5 w-7 rounded-full bg-sky-400" />}
              </div>
              <DialogHeader>
                <DialogTitle className="sr-only">Görev Detayı</DialogTitle>
                <input value={editing.title} onChange={(e) => update(editing.id, { title: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-bold outline-none hover:border-input focus:border-input focus:bg-background" />
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Tag className="size-3.5" />Liste</label>
                  <ColumnPicker columns={columns} value={editing.colId} onChange={(id) => update(editing.id, { colId: id, completedAt: isDone(id) ? now() : undefined })} />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><AlignLeft className="size-3.5" />Açıklama</label>
                  <textarea value={editing.desc} onChange={(e) => update(editing.id, { desc: e.target.value })} rows={3} placeholder="Bu göreve açıklama ekle…" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><User className="size-3.5" />Atanan</label>
                    <select value={editing.assignee} onChange={(e) => update(editing.id, { assignee: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarClock className="size-3.5" />Ne zaman</label>
                    <input value={editing.when} onChange={(e) => update(editing.id, { when: e.target.value })} placeholder="Bugün 17:00" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Öncelik</label>
                  <PriorityPicker value={editing.priority} onChange={(p) => update(editing.id, { priority: p })} />
                </div>
                {editing.customer && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-sky-500/8 px-3 py-2 text-sm">
                    <User className="size-4 text-sky-600" />
                    <span className="font-medium">{editing.customer}</span>
                    <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Aktif Müşteri</span>
                  </div>
                )}
              </div>

              <DialogFooter className="sm:justify-between">
                <Button variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => remove(editing.id)}><Trash2 className="size-4" />Sil</Button>
                <Button onClick={() => setEditId(null)}>Kapat</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
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

function ColumnPicker({ columns, value, onChange }: { columns: Column[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {columns.map((c) => {
        const active = value === c.id;
        return (
          <button key={c.id} type="button" onClick={() => onChange(c.id)} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            <span className={cn("size-2.5 rounded-full", c.dot)} />{c.label}
          </button>
        );
      })}
    </div>
  );
}
