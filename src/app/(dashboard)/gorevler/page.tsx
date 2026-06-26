"use client";

import { useState } from "react";
import { Plus, Clock, Loader2, CheckCircle2, Bell, ChevronRight, ChevronLeft, User } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Status = "todo" | "doing" | "done";
type Task = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  assignee: string;
  when: string;
  urgent?: boolean;
  customer?: string;
  auto?: boolean;
  alert?: boolean;
  status: Status;
  accent: string;
  completedAt?: string;
};

const INITIAL: Task[] = [
  { id: "t1", emoji: "📞", title: "Seda Yılmaz aranacak", desc: "Lead geldi, 2 saat aranmadı.", assignee: "Ayşe", when: "Bugün 17:00", urgent: true, customer: "Seda Yılmaz", auto: true, status: "todo", accent: "border-l-amber-400" },
  { id: "t2", emoji: "💳", title: "Ahmet Çelik ödeme takibi", desc: "7.000₺ gecikmiş ödeme — 8 gündür ödeme yok.", assignee: "Zeynep", when: "Bugün 16:00", urgent: true, customer: "Ahmet Çelik", auto: true, status: "todo", accent: "border-l-danger" },
  { id: "t3", emoji: "📅", title: "Randevu hatırlatması gönder", desc: "Yarınki 3 randevu için SMS/WP mesajı gönderilmeli.", assignee: "Tüm Ekip", when: "Bugün 18:00", status: "todo", accent: "border-l-primary" },
  { id: "t4", emoji: "📸", title: "Instagram DM yanıtları", desc: "3 yanıtsız DM var, cevap verilecek.", assignee: "Ayşe", when: "Bugün 14:00", alert: true, status: "doing", accent: "border-l-sky-400" },
  { id: "t5", emoji: "🔄", title: "Zeynep Arslan paketi yenile", desc: "Cilt bakımı 4'lü paket bitiyor, teklif yapılacak.", assignee: "Zeynep", when: "Yarın 12:00", customer: "Zeynep Arslan", status: "doing", accent: "border-l-violet-400" },
  { id: "t6", emoji: "📞", title: "Büşra Kaya arandı", desc: "", assignee: "Ayşe", when: "", status: "done", accent: "border-l-positive", completedAt: "10:30" },
  { id: "t7", emoji: "📊", title: "Mayıs gider raporu hazırla", desc: "", assignee: "Zeynep", when: "", status: "done", accent: "border-l-positive", completedAt: "09:15" },
];

const COLUMNS: { key: Status; label: string; icon: typeof Clock; head: string; count: string }[] = [
  { key: "todo", label: "Yapılacaklar", icon: Clock, head: "bg-warning/12 text-amber-700", count: "bg-amber-500 text-white" },
  { key: "doing", label: "Devam Edenler", icon: Loader2, head: "bg-primary/10 text-primary", count: "bg-primary text-primary-foreground" },
  { key: "done", label: "Tamamlananlar", icon: CheckCircle2, head: "bg-positive/12 text-positive", count: "bg-positive text-white" },
];

export default function GorevlerPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  function move(id: string, dir: 1 | -1) {
    const order: Status[] = ["todo", "doing", "done"];
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const idx = order.indexOf(t.status);
        const next = order[Math.min(2, Math.max(0, idx + dir))];
        return {
          ...t,
          status: next,
          completedAt: next === "done" ? new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : undefined,
          accent: next === "done" ? "border-l-positive" : t.accent,
        };
      })
    );
  }

  function addTask() {
    if (!title.trim()) return;
    setTasks((prev) => [
      { id: `t-${new Date().getTime()}`, emoji: "📝", title: title.trim(), desc: desc.trim(), assignee: "Tüm Ekip", when: "Bugün", status: "todo", accent: "border-l-primary" },
      ...prev,
    ]);
    setTitle("");
    setDesc("");
    setOpen(false);
    toast.success("Görev eklendi");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Görev Sistemi" description="Ekibinin yapılacaklarını sürükleyip ilerlet; otomatik görevler de burada toplanır.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Görev Ekle
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          const Icon = col.icon;
          return (
            <div key={col.key} className="space-y-3">
              <div className={cn("flex items-center justify-between gap-2 rounded-xl px-4 py-3", col.head)}>
                <span className="flex items-center gap-2 font-semibold">
                  <Icon className="size-4" />
                  {col.label}
                </span>
                <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold", col.count)}>{items.length}</span>
              </div>

              <div className="space-y-3">
                {items.length === 0 && (
                  <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Görev yok.</p>
                )}
                {items.map((t) => (
                  <div key={t.id} className={cn("group rounded-xl border border-l-4 bg-card p-3 shadow-xs", t.accent)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-semibold leading-tight", t.status === "done" && "text-muted-foreground line-through")}>
                        {t.emoji} {t.title}
                      </p>
                      {t.auto && <span className="shrink-0 rounded-full bg-warning/12 px-2 py-0.5 text-[10px] font-medium text-amber-600">Otomatik</span>}
                      {t.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-positive" />}
                      {t.alert && <Bell className="size-4 shrink-0 text-amber-500" />}
                    </div>

                    {t.desc && t.status !== "done" && <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium">{t.assignee}</span>
                      {t.status === "done" ? (
                        <span className="text-muted-foreground">· Tamamlandı {t.completedAt}</span>
                      ) : (
                        <span className={cn("flex items-center gap-1", t.urgent ? "font-medium text-danger" : "text-muted-foreground")}>
                          · {t.when}
                        </span>
                      )}
                    </div>

                    {t.customer && t.status !== "done" && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5 text-xs">
                        <User className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{t.customer}</span>
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Aktif Müşteri</span>
                      </div>
                    )}

                    {/* Taşıma aksiyonları */}
                    <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {t.status !== "todo" && (
                        <Button variant="outline" size="icon-sm" title="Geri al" onClick={() => move(t.id, -1)}><ChevronLeft className="size-3.5" /></Button>
                      )}
                      {t.status !== "done" && (
                        <Button size="sm" onClick={() => move(t.id, 1)}>
                          {t.status === "todo" ? "Başla" : "Tamamla"}
                          <ChevronRight className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
              <input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Görev başlığı" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="t-desc">Açıklama</label>
              <textarea id="t-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Detay (opsiyonel)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={addTask} disabled={!title.trim()}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
