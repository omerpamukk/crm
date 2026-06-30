"use client";

import { useState } from "react";
import { Plus, Clock, Loader2, CheckCircle2, Bell, User, GripVertical, Zap, Flag } from "lucide-react";
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

const COLUMNS: { key: Status; label: string; icon: typeof Clock; head: string; count: string; top: string }[] = [
  { key: "todo", label: "Yapılacaklar", icon: Clock, head: "text-amber-700", count: "bg-amber-500 text-white", top: "#f59e0b" },
  { key: "doing", label: "Devam Edenler", icon: Loader2, head: "text-primary", count: "bg-primary text-primary-foreground", top: "#5b5bd6" },
  { key: "done", label: "Tamamlananlar", icon: CheckCircle2, head: "text-positive", count: "bg-positive text-white", top: "#16a34a" },
];

const PRIORITY: Record<Priority, { label: string; chip: string; border: string }> = {
  high: { label: "Acil", chip: "bg-danger/10 text-danger", border: "border-l-danger" },
  normal: { label: "Normal", chip: "bg-primary/10 text-primary", border: "border-l-primary" },
  low: { label: "Düşük", chip: "bg-muted text-muted-foreground", border: "border-l-border" },
};

const ASSIGNEES = ["Tüm Ekip", "Ayşe", "Zeynep", "Merve"];
const AVATAR_TONES = ["bg-primary/10 text-primary", "bg-emerald-100 text-emerald-600", "bg-amber-100 text-amber-600", "bg-sky-100 text-sky-600", "bg-violet-100 text-violet-600", "bg-rose-100 text-rose-600"];
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

      <div className="grid gap-4 lg:grid-cols-3">
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
              className={cn("flex flex-col rounded-xl border bg-muted/30 transition-colors", isOver && "ring-2 ring-primary")}
            >
              <div className="flex items-center justify-between gap-2 rounded-t-xl border-b bg-card/60 px-3 py-2.5" style={{ borderTopColor: col.top, borderTopWidth: 3 }}>
                <span className={cn("flex items-center gap-2 text-sm font-semibold", col.head)}>
                  <Icon className="size-4" />
                  {col.label}
                </span>
                <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold", col.count)}>{items.length}</span>
              </div>

              <div className="flex-1 space-y-2.5 p-2.5">
                {items.length === 0 && (
                  <p className={cn("rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground", isOver && "border-primary text-primary")}>
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
                        "group cursor-grab rounded-xl border border-l-4 bg-card p-3 shadow-xs transition-all hover:shadow-sm active:cursor-grabbing",
                        done ? "border-l-positive" : pri.border,
                        draggingId === t.id && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                        <p className={cn("flex-1 text-sm font-semibold leading-tight", done && "text-muted-foreground line-through")}>
                          {t.emoji} {t.title}
                        </p>
                        {t.auto && <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-warning/12 px-1.5 py-0.5 text-[10px] font-medium text-amber-600"><Zap className="size-2.5" />Otomatik</span>}
                        {done && <CheckCircle2 className="size-4 shrink-0 text-positive" />}
                        {t.alert && !done && <Bell className="size-4 shrink-0 text-amber-500" />}
                      </div>

                      {t.desc && !done && <p className="mt-1.5 pl-6 text-xs text-muted-foreground">{t.desc}</p>}

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 py-0.5 pl-0.5 pr-2 font-medium">
                          <span className={cn("flex size-4 items-center justify-center rounded-full text-[9px] font-bold", tone(t.assignee))}>{t.assignee.slice(0, 1).toLocaleUpperCase("tr")}</span>
                          {t.assignee}
                        </span>
                        {!done && t.priority !== "normal" && (
                          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium", pri.chip)}><Flag className="size-2.5" />{pri.label}</span>
                        )}
                        {done ? (
                          <span className="text-muted-foreground">Tamamlandı · {t.completedAt}</span>
                        ) : (
                          <span className={cn(t.priority === "high" ? "font-medium text-danger" : "text-muted-foreground")}>{t.when}</span>
                        )}
                      </div>

                      {t.customer && !done && (
                        <div className="mt-2 ml-6 flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5 text-xs">
                          <User className="size-3.5 text-muted-foreground" />
                          <span className="font-medium">{t.customer}</span>
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Aktif Müşteri</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => openAdd(col.key)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Plus className="size-3.5" />
                  Görev ekle
                </button>
              </div>
            </div>
          );
        })}
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
