"use client";

import { useState } from "react";
import {
  Plus,
  ChevronDown,
  Trash2,
  Pencil,
  ClipboardList,
  UserPlus,
  MessageCircle,
  MessageSquare,
  Zap,
  Send,
  CalendarCheck,
  Star,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const TONE: Record<string, string> = {
  pink: "bg-pink-100 text-pink-700",
  purple: "bg-violet-100 text-violet-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  gray: "bg-muted text-muted-foreground",
};

type Step = { icon: LucideIcon; tone: keyof typeof TONE; text: string };
type Automation = {
  id: string;
  title: string;
  active: boolean;
  meta: string;
  trigger: Step;
  action: Step;
};

const INITIAL: Automation[] = [
  { id: "a1", title: "Meta Lead Form Otomasyonu", active: true, meta: "Son 7 günde 18 lead", trigger: { icon: ClipboardList, tone: "purple", text: "Meta Lead Formu dolduruldu" }, action: { icon: UserPlus, tone: "green", text: "Potansiyele ekle + WhatsApp mesajı" } },
  { id: "a2", title: "DM → Potansiyel Müşteri", active: true, meta: "IG · WA · Messenger · TikTok", trigger: { icon: MessageCircle, tone: "pink", text: "DM’de ‘fiyat’ anahtar kelimesi" }, action: { icon: UserPlus, tone: "blue", text: "Otomatik potansiyele ekle" } },
  { id: "a3", title: "Yeni Takipçi → Hoşgeldin DM", active: false, meta: "Instagram", trigger: { icon: UserPlus, tone: "pink", text: "Yeni takipçi" }, action: { icon: MessageCircle, tone: "purple", text: "Otomatik hoşgeldin DM gönder" } },
  { id: "a4", title: "DM Geldiğinde Otomatik Yanıt", active: true, meta: "Tüm kanallar", trigger: { icon: MessageCircle, tone: "blue", text: "Yeni DM geldiğinde" }, action: { icon: Zap, tone: "blue", text: "‘Mesajınız alındı ✅’ yanıtı" } },
  { id: "a5", title: "Yoruma Cevap & Otomatik DM", active: false, meta: "Instagram · TikTok", trigger: { icon: MessageSquare, tone: "purple", text: "Gönderiye yorum yapıldığında" }, action: { icon: Send, tone: "pink", text: "Yorumu yanıtla + DM gönder" } },
];

const TEMPLATES: Omit<Automation, "id" | "active">[] = [
  { title: "Randevu Sonrası Teşekkür", meta: "WhatsApp", trigger: { icon: CalendarCheck, tone: "green", text: "Randevu tamamlandığında" }, action: { icon: Star, tone: "amber", text: "Teşekkür + değerlendirme isteği" } },
  { title: "Doğum Günü Kutlaması", meta: "WhatsApp · SMS", trigger: { icon: Gift, tone: "rose", text: "Müşterinin doğum gününde" }, action: { icon: MessageCircle, tone: "green", text: "Kutlama + özel indirim kodu" } },
  { title: "Pasif Müşteri Geri Kazanım", meta: "WhatsApp", trigger: { icon: UserPlus, tone: "purple", text: "30 gün işlem yapılmadığında" }, action: { icon: Send, tone: "blue", text: "‘Seni özledik’ kampanya mesajı" } },
  { title: "Yeni Yorum → Otomatik Yanıt", meta: "Instagram · TikTok", trigger: { icon: MessageSquare, tone: "pink", text: "Yeni yorum geldiğinde" }, action: { icon: Send, tone: "purple", text: "Otomatik teşekkür yanıtı" } },
];

function Switch({ on, onClick }: { on: boolean; onClick: (e: React.MouseEvent) => void }) {
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
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/** Tetik → aksiyon dikey akış (WHEN / THEN). */
function Flow({ trigger, action }: { trigger: Step; action: Step }) {
  const T = trigger.icon;
  const A = action.icon;
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE[trigger.tone])}>
          <T className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tetik</p>
          <p className="text-sm font-medium leading-tight">{trigger.text}</p>
        </div>
      </div>
      <div className="my-1 ml-4 flex h-4 items-center">
        <span className="h-full border-l-2 border-dashed border-muted-foreground/30" />
        <ChevronDown className="-ml-[7px] size-3 text-muted-foreground/50" />
      </div>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE[action.tone])}>
          <A className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Aksiyon</p>
          <p className="text-sm font-medium leading-tight">{action.text}</p>
        </div>
      </div>
    </div>
  );
}

export function AutomationsView() {
  const [items, setItems] = useState<Automation[]>(INITIAL);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftActive, setDraftActive] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const activeCount = items.filter((a) => a.active).length;

  function toggle(id: string) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  }

  function openEdit(a: Automation) {
    setEditing(a);
    setDraftName(a.title);
    setDraftActive(a.active);
  }

  function saveEdit() {
    if (!editing) return;
    setItems((prev) => prev.map((a) => (a.id === editing.id ? { ...a, title: draftName.trim() || a.title, active: draftActive } : a)));
    setEditing(null);
    toast.success("Otomasyon güncellendi");
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id));
    setEditing(null);
    toast.success("Otomasyon silindi");
  }

  function addTemplate(t: Omit<Automation, "id" | "active">) {
    setItems((prev) => [...prev, { ...t, id: `auto-${new Date().getTime()}`, active: true }]);
    setCreateOpen(false);
    toast.success(`“${t.title}” otomasyonu eklendi`);
  }

  return (
    <div className="space-y-4">
      {/* Özet */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/12 px-3 py-1 font-medium text-positive">
          <span className="size-1.5 rounded-full bg-positive" />
          {activeCount} aktif
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">
          {items.length - activeCount} pasif
        </span>
        <span className="text-muted-foreground/70">· Toplam {items.length} otomasyon</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <Card
            key={a.id}
            onClick={() => openEdit(a)}
            className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-tight">{a.title}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    a.active ? "bg-positive/12 text-positive" : "bg-muted text-muted-foreground"
                  )}
                >
                  {a.active ? "Aktif" : "Pasif"}
                </span>
              </div>

              <Flow trigger={a.trigger} action={a.action} />

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="truncate text-xs text-muted-foreground">{a.meta}</span>
                <div className="flex items-center gap-2">
                  <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  <Switch
                    on={a.active}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(a.id);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plus className="size-6" />
          </span>
          <span className="font-semibold">Yeni Otomasyon</span>
          <span className="text-xs text-muted-foreground">Şablondan seç veya sıfırdan oluştur</span>
        </button>
      </div>

      {/* Düzenle modalı */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Otomasyonu Düzenle</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="auto-name">Otomasyon adı</label>
                <input
                  id="auto-name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <Flow trigger={editing.trigger} action={editing.action} />
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Durum</p>
                  <p className="text-xs text-muted-foreground">{draftActive ? "Aktif — çalışıyor" : "Pasif — durduruldu"}</p>
                </div>
                <Switch on={draftActive} onClick={() => setDraftActive((v) => !v)} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button variant="destructive" onClick={() => editing && remove(editing.id)}>
              <Trash2 className="size-4" />
              Sil
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
              <Button onClick={saveEdit}>Kaydet</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Şablon seçici modalı */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Otomasyon — Şablon Seç</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60svh] gap-3 overflow-y-auto sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const T = t.trigger.icon;
              const A = t.action.icon;
              return (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => addTemplate(t)}
                  className="rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <p className="mb-2 text-sm font-semibold leading-tight">{t.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("flex size-6 items-center justify-center rounded-md", TONE[t.trigger.tone])}>
                      <T className="size-3.5" />
                    </span>
                    <ChevronDown className="size-3 -rotate-90" />
                    <span className={cn("flex size-6 items-center justify-center rounded-md", TONE[t.action.tone])}>
                      <A className="size-3.5" />
                    </span>
                    <span className="ml-1 truncate">{t.meta}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
