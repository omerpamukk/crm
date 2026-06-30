"use client";

import { useState } from "react";
import { Plus, Clock, Loader2, CheckCircle2, Bell, User, GripVertical, Zap } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Status = "todo" | "doing" | "done";
type Priority = "high" | "normal" | "low";
type Task = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  assignee: string;
  when: string;
  priority: Priority;
  customer?: string;
  auto?: boolean;
  alert?: boolean;
  status: Status;
  completedAt?: string;
};

const INITIAL: Task[] = [
  { id: "t1", emoji: "📞", title: "Seda Yılmaz aranacak", desc: "Lead geldi, 2 saat aranmadı.", assignee: "Ayşe", when: "Bugün 17:00", priority: "high", customer: "Seda Yılmaz", auto: true, status: "todo" },
  { id: "t2", emoji: "💳", title: "Ahmet Çelik ödeme takibi", desc: "7.000₺ gecikmiş ödeme — 8 gündür ödeme yok.", assignee: "Zeynep", when: "Bugün 16:00", priority: "high", customer: "Ahmet Çelik", auto: true, status: "todo" },
  { id: "t3", emoji: "📅", title: "Randevu hatırlatması gönder", desc: "Yarınki 3 randevu için SMS/WP mesajı gönderilmeli.", assignee: "Tüm Ekip", when: "Bugün 18:00", priority: "normal", status: "todo" },
  { id: "t4", emoji: "📸", title: "Instagram DM yanıtları", desc: "3 yanıtsız DM var, cevap verilecek.", assignee: "Ayşe", when: "Bugün 14:00", priority: "normal", alert: true, status: "doing" },
  { id: "t5", emoji: "🔄", title: "Zeynep Arslan paketi yenile", desc: "Cilt bakımı 4'lü paket bitiyor, teklif yapılacak.", assignee: "Zeynep", when: "Yarın 12:00", priority: "low", customer: "Zeynep Arslan", status: "doing" },
  { id: "t6", emoji: "📞", title: "Büşra Kaya arandı", desc: "", assignee: "Ayşe", when: "", priority: "normal", status: "done", completedAt: "10:30" },
  { id: "t7", emoji: "📊", title: "Mayıs gider raporu hazırla", desc: "", assignee: "Zeynep", when: "", priority: "normal", status: "done", completedAt: "09:15" },
];

const COLUMNS: { key: Status; label: string; icon: typeof Clock; dot: string }[] = [
  { key: "todo", label: "Yapılacaklar", icon: Clock, dot: "bg-amber-400" },
  { key: "doing", label: "Devam Edenler", icon: Loader2, dot: "bg-primary" },
  { key: "done", label: "Tamamlananlar", icon: CheckCircle2, dot: "bg-emerald-500" },
];

const PRIORITY: Record<Priority, { label: string; bar: string; chip: string }> = {
  high: { label: "Acil", bar: "bg-rose-500", chip: "bg-rose-500/12 text-rose-600" },
  normal: { label: "Normal", bar: "bg-indigo-400", chip: "bg-indigo-500/12 text-indigo-600" },
  low: { label: "Düşük", bar: "bg-emerald-400", chip: "bg-emerald-500/12 text-emerald-600" },
};

const ASSIGNEES = ["Tüm Ekip", "Ayşe", "Zeynep", "Merve"];
const AVATAR_TONES = ["bg-primary/15 text-primary", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];
function tone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h];
}

export default function GorevlerPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "", assignee: "Tüm Ekip", priority: "normal" as Priority, when: "Bugün", status: "todo" as Status });

  function drop(id: string, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? {
      ...t,
      status,
      completedAt: status === "done" ? new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : undefined,
    } : t)));
  }

  function openAdd(status: Status) {
    setForm({ title: "", desc: "", assignee: "Tüm Ekip", priority: "normal", when: "Bugün", status });
    setOpen(true);
  }

  function addTask() {
    if (!form.title.trim()) return;
    setTasks((prev) => [
      { id: `t-${Date.now()}`, emoji: "📝", title: form.title.trim(), desc: form.desc.trim(), assignee: form.assignee, when: form.when.trim() || "Bugün", priority: form.priority, status: form.status, completedAt: form.status === "done" ? new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : undefined },
      ...prev,
    ]);
    setOpen(false);
    toast.success("Görev eklendi");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Görev Sistemi" description="Kartları sürükleyip sütunlar arasında taşı; otomatik görevler de burada toplanır.">
        <Button onClick={() => openAdd("todo")}>
          <Plus className="size-4" />
          Görev Ekle
        </Button>
      </PageHeader>

      {/* Trello tarzı board zemini */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/8 via-violet-500/8 to-sky-500/10 p-3 ring-1 ring-black/5 sm:p-4 dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-sky-500/10">
        <div className="grid gap-3 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            const Icon = col.icon;
            const isOver = overCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); if (draggingId) setOverCol(col.key); }}
                onDragLeave={() => setOverCol((s) => (s === col.key ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverCol(null);
                  const id = e.dataTransfer.getData("text/task");
                  if (id) drop(id, col.key);
                  setDraggingId(null);
                }}
                className={cn(
                  "flex flex-col rounded-xl border border-white/60 bg-white/55 shadow-sm backdrop-blur-md transition-all dark:border-white/10 dark:bg-white/5",
                  isOver && "bg-primary/10 ring-2 ring-primary"
                )}
              >
                <div className="flex items-center gap-2 px-3 py-3">
                  <span className={cn("size-2.5 rounded-full", col.dot)} />
                  <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
                    <Icon className="size-4 text-muted-foreground" />
                    {col.label}
                  </span>
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/8 px-1.5 text-xs font-bold text-muted-foreground">{items.length}</span>
                </div>

                <div className="flex-1 space-y-2 px-2 pb-2">
                  {items.length === 0 && (
                    <p className={cn("rounded-lg border border-dashed border-foreground/15 py-8 text-center text-sm text-muted-foreground", isOver && "border-primary text-primary")}>
                      {isOver ? "Buraya bırak" : "Görev yok"}
                    </p>
                  )}
                  {items.map((t) => {
                    const done = t.status === "done";
                    const pri = PRIORITY[t.priority];
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("text/task", t.id); e.dataTransfer.effectAllowed = "move"; setDraggingId(t.id); }}
                        onDragEnd={() => setDraggingId(null)}
                        className={cn(
                          "group cursor-grab overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing dark:ring-white/10",
                          draggingId === t.id && "rotate-2 opacity-60"
                        )}
                      >
                        {/* Renkli etiket çubukları (Trello label) */}
                        <div className="flex gap-1 px-3 pt-2.5">
                          <span className={cn("h-1.5 w-9 rounded-full", done ? "bg-emerald-500" : pri.bar)} />
                          {t.auto && <span className="h-1.5 w-6 rounded-full bg-violet-400" />}
                          {t.customer && <span className="h-1.5 w-6 rounded-full bg-sky-400" />}
                          {t.alert && !done && <span className="h-1.5 w-6 rounded-full bg-amber-400" />}
                        </div>

                        <div className="p-3 pt-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/25 transition-colors group-hover:text-muted-foreground" />
                            <p className={cn("flex-1 text-sm font-semibold leading-tight", done && "text-muted-foreground line-through")}>
                              {t.emoji} {t.title}
                            </p>
                            {done && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
                            {t.alert && !done && <Bell className="size-4 shrink-0 text-amber-500" />}
                          </div>

                          {t.desc && !done && <p className="mt-1.5 pl-6 text-xs text-muted-foreground">{t.desc}</p>}

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 py-0.5 pl-0.5 pr-2 font-medium">
                              <span className={cn("flex size-4 items-center justify-center rounded-full text-[9px] font-bold", tone(t.assignee))}>{t.assignee.slice(0, 1).toLocaleUpperCase("tr")}</span>
                              {t.assignee}
                            </span>
                            {t.auto && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/12 px-1.5 py-0.5 font-medium text-violet-600"><Zap className="size-2.5" />Otomatik</span>}
                            {!done && t.priority !== "normal" && <span className={cn("rounded-full px-1.5 py-0.5 font-medium", pri.chip)}>{pri.label}</span>}
                            {done ? (
                              <span className="text-muted-foreground">Tamamlandı · {t.completedAt}</span>
                            ) : (
                              <span className={cn(t.priority === "high" ? "font-medium text-rose-600" : "text-muted-foreground")}>{t.when}</span>
                            )}
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

                  <button
                    onClick={() => openAdd(col.key)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    Görev ekle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Yeni Görev</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="t-title">Başlık</label>
              <input id="t-title" autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Görev başlığı" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="t-desc">Açıklama</label>
              <textarea id="t-desc" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} rows={2} placeholder="Detay (opsiyonel)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Atanan</label>
                <select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Öncelik</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="high">Acil</option>
                  <option value="normal">Normal</option>
                  <option value="low">Düşük</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ne zaman</label>
                <input value={form.when} onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))} placeholder="Bugün 17:00" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sütun</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="todo">Yapılacaklar</option>
                  <option value="doing">Devam Edenler</option>
                  <option value="done">Tamamlananlar</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={addTask} disabled={!form.title.trim()}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
