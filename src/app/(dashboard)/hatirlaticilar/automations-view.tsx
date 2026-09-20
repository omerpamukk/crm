"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronDown,
  Trash2,
  Pencil,
  Clock,
  CalendarCheck,
  CalendarX2,
  UserPlus,
  Banknote,
  Wallet,
  PackageX,
  Gift,
  Tag,
  MessageCircle,
  MessageSquare,
  Mail,
  Bell,
  ListTodo,
  Sparkles,
  LayoutTemplate,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  saveAutomation,
  toggleAutomation,
  deleteAutomation,
} from "./actions";
import type { AutomationInput, TriggerId, ActionId } from "./schema";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TONE: Record<string, string> = {
  pink: "bg-pink-100 text-pink-700",
  purple: "bg-violet-100 text-violet-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  gray: "bg-muted text-muted-foreground",
};

type Tone = keyof typeof TONE;
type Param = { label: string; unit?: string; def: string };
type TriggerDef = { id: string; label: string; icon: LucideIcon; tone: Tone; param?: Param };
type ActionDef = { id: string; label: string; icon: LucideIcon; tone: Tone; channel?: string; message?: boolean; param?: Param };

const TRIGGERS: TriggerDef[] = [
  { id: "randevu_oncesi", label: "Randevudan önce", icon: Clock, tone: "amber", param: { label: "Kaç saat önce?", unit: "saat", def: "24" } },
  { id: "randevu_tamamlandi", label: "Randevu tamamlandığında", icon: CalendarCheck, tone: "green" },
  { id: "noshow", label: "Randevuya gelinmediğinde", icon: CalendarX2, tone: "rose" },
  { id: "yeni_lead", label: "Yeni lead geldiğinde", icon: UserPlus, tone: "blue" },
  { id: "yeni_musteri", label: "Yeni müşteri eklendiğinde", icon: UserPlus, tone: "green" },
  { id: "odeme_alindi", label: "Ödeme alındığında", icon: Banknote, tone: "green" },
  { id: "odeme_gecikti", label: "Ödeme geciktiğinde", icon: Wallet, tone: "rose", param: { label: "Kaç gün sonra?", unit: "gün", def: "7" } },
  { id: "paket_bitiyor", label: "Paket bitmek üzereyken", icon: PackageX, tone: "amber", param: { label: "Kaç seans kaldığında?", unit: "seans", def: "1" } },
  { id: "pasif_musteri", label: "Müşteri uzun süredir gelmediğinde", icon: Clock, tone: "purple", param: { label: "Kaç gündür?", unit: "gün", def: "60" } },
  { id: "dogum_gunu", label: "Doğum günü geldiğinde", icon: Gift, tone: "rose" },
];

const ACTIONS: ActionDef[] = [
  { id: "wa", label: "WhatsApp mesajı gönder", icon: MessageCircle, tone: "green", channel: "WhatsApp", message: true },
  { id: "sms", label: "SMS gönder", icon: MessageSquare, tone: "amber", channel: "SMS", message: true },
  { id: "eposta", label: "E-posta gönder", icon: Mail, tone: "blue", channel: "E-posta", message: true },
  { id: "indirim", label: "İndirim / kupon gönder", icon: Gift, tone: "rose", channel: "WhatsApp", message: true },
  { id: "hatirlatma", label: "Hatırlatma oluştur", icon: Bell, tone: "amber" },
  { id: "gorev", label: "Ekibe görev oluştur", icon: ListTodo, tone: "purple" },
  { id: "etiket_ekle", label: "Müşteriye etiket ekle", icon: Tag, tone: "purple", param: { label: "Eklenecek etiket", def: "Takip" } },
];

const trigDef = (id: string) => TRIGGERS.find((t) => t.id === id) ?? TRIGGERS[0];
const actDef = (id: string) => ACTIONS.find((a) => a.id === id) ?? ACTIONS[0];

/** DB satırı (0025_automations.sql) — alan adları tabloyla birebir. */
export type Automation = {
  id: string;
  title: string;
  active: boolean;
  trigger_id: TriggerId;
  trigger_param: number | null;
  action_id: ActionId;
  action_param: string | null;
  message: string | null;
};

/** UI içi kısa erişim — eski alan adlarıyla köprü. */
type FlowShape = { trigger_id: string; trigger_param?: number | null; action_id: string; action_param?: string | null };

function triggerText(a: FlowShape) {
  const d = trigDef(a.trigger_id);
  return a.trigger_param != null
    ? `${d.label} (${a.trigger_param}${d.param?.unit ? ` ${d.param.unit}` : ""})`
    : d.label;
}
function actionText(a: FlowShape) {
  const d = actDef(a.action_id);
  return a.action_param ? `${d.label}: “${a.action_param}”` : d.label;
}
function metaOf(a: { action_id: string }) {
  const d = actDef(a.action_id);
  return d.channel ?? "İç aksiyon";
}

/** Hazır kural şablonları — salonların en sık kurduğu altı senaryo. */
const TEMPLATES: Omit<Automation, "id" | "active">[] = [
  { title: "Randevu Hatırlatma (24 saat)", trigger_id: "randevu_oncesi", trigger_param: 24, action_id: "wa", action_param: null, message: "Merhaba {ad}, yarınki randevunuzu hatırlatmak isteriz 🌸" },
  { title: "Randevu Sonrası Değerlendirme", trigger_id: "randevu_tamamlandi", trigger_param: null, action_id: "wa", action_param: null, message: "Teşekkürler {ad}! Deneyiminizi değerlendirir misiniz?" },
  { title: "No-show Takibi", trigger_id: "noshow", trigger_param: null, action_id: "wa", action_param: null, message: "Merhaba {ad}, kaçırdığınız randevu için yeni bir tarih ayarlayalım mı?" },
  { title: "Doğum Günü İndirimi", trigger_id: "dogum_gunu", trigger_param: null, action_id: "indirim", action_param: null, message: "İyi ki doğdunuz {ad}! Size özel indirim hediyemiz var." },
  { title: "Yeni Lead Karşılama", trigger_id: "yeni_lead", trigger_param: null, action_id: "wa", action_param: null, message: "Merhaba {ad}, ilginiz için teşekkürler! Size nasıl yardımcı olabiliriz?" },
  { title: "Geri Kazanım (60 gün)", trigger_id: "pasif_musteri", trigger_param: 60, action_id: "sms", action_param: null, message: "Sizi özledik {ad}! Dönüşünüze özel bir fırsatımız var." },
];

function Switch({ on, onClick }: { on: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/** Tetik → aksiyon dikey akış (WHEN / THEN). */
function Flow({ a }: { a: FlowShape }) {
  const T = trigDef(a.trigger_id);
  const A = actDef(a.action_id);
  const TI = T.icon;
  const AI = A.icon;
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE[T.tone])}><TI className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tetik</p>
          <p className="text-sm font-medium leading-tight">{triggerText(a)}</p>
        </div>
      </div>
      <div className="my-1 ml-4 flex h-4 items-center">
        <span className="h-full border-l-2 border-dashed border-muted-foreground/30" />
        <ChevronDown className="-ml-[7px] size-3 text-muted-foreground/50" />
      </div>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE[A.tone])}><AI className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Aksiyon</p>
          <p className="text-sm font-medium leading-tight">{actionText(a)}</p>
        </div>
      </div>
    </div>
  );
}

type Draft = { title: string; triggerId: string; triggerParam: string; actionId: string; actionParam: string; message: string };

/** Sıfırdan / düzenleme kurucusu. */
function Builder({ initial, submitLabel, busy, onSubmit }: { initial?: Partial<Draft>; submitLabel: string; busy?: boolean; onSubmit: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>({
    title: initial?.title ?? "",
    triggerId: initial?.triggerId ?? TRIGGERS[0].id,
    triggerParam: initial?.triggerParam ?? "",
    actionId: initial?.actionId ?? ACTIONS[0].id,
    actionParam: initial?.actionParam ?? "",
    message: initial?.message ?? "",
  });
  const tDef = trigDef(d.triggerId);
  const aDef = actDef(d.actionId);
  const suggested = `${tDef.label} → ${aDef.label}`;

  function pickTrigger(id: string) {
    const def = trigDef(id);
    setD((p) => ({ ...p, triggerId: id, triggerParam: def.param ? (p.triggerParam || def.param.def) : "" }));
  }
  function pickAction(id: string) {
    const def = actDef(id);
    setD((p) => ({ ...p, actionId: id, actionParam: def.param ? (p.actionParam || def.param.def) : "" }));
  }

  return (
    <div className="space-y-4">
      {/* Tetik */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ne zaman? (Tetik)</label>
        <select value={d.triggerId} onChange={(e) => pickTrigger(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
          {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        {tDef.param && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tDef.param.label}</span>
            <input value={d.triggerParam} onChange={(e) => setD((p) => ({ ...p, triggerParam: e.target.value }))} className="h-8 w-28 rounded-lg border border-input bg-background px-2 text-sm" placeholder={tDef.param.def} />
            {tDef.param.unit && <span className="text-xs text-muted-foreground">{tDef.param.unit}</span>}
          </div>
        )}
      </div>

      <div className="ml-4 flex h-3 items-center"><span className="h-full border-l-2 border-dashed border-muted-foreground/30" /><ChevronDown className="-ml-[7px] size-3 text-muted-foreground/50" /></div>

      {/* Aksiyon */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ne yapılsın? (Aksiyon)</label>
        <select value={d.actionId} onChange={(e) => pickAction(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
          {ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}{a.channel ? ` · ${a.channel}` : ""}</option>)}
        </select>
        {aDef.param && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{aDef.param.label}</span>
            <input value={d.actionParam} onChange={(e) => setD((p) => ({ ...p, actionParam: e.target.value }))} className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-sm" placeholder={aDef.param.def} />
          </div>
        )}
        {aDef.message && (
          <div className="space-y-1">
            <textarea value={d.message} onChange={(e) => setD((p) => ({ ...p, message: e.target.value }))} rows={3} placeholder="Mesaj şablonu… (kişiselleştirme için {ad} kullanabilirsin)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <p className="text-[11px] text-muted-foreground">İpucu: <code className="rounded bg-muted px-1">{"{ad}"}</code> müşteri adıyla değişir.</p>
          </div>
        )}
      </div>

      {/* Ad + önizleme */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kural adı</label>
        <input value={d.title} onChange={(e) => setD((p) => ({ ...p, title: e.target.value }))} placeholder={suggested} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Önizleme</p>
        <Flow
          a={{
            trigger_id: d.triggerId,
            trigger_param: d.triggerParam ? Number(d.triggerParam) : null,
            action_id: d.actionId,
            action_param: d.actionParam || null,
          }}
        />
      </div>

      <Button className="w-full" disabled={busy} onClick={() => onSubmit({ ...d, title: d.title.trim() || suggested })}>{busy ? "Kaydediliyor…" : submitLabel}</Button>
    </div>
  );
}

/** Form değerleri (hepsi string) → DB satırı. */
function draftToInput(d: Draft, id?: string, active = true): AutomationInput {
  const param = d.triggerParam.trim();
  return {
    id,
    title: d.title.trim(),
    active,
    trigger_id: d.triggerId as AutomationInput["trigger_id"],
    trigger_param: param ? Number(param) : null,
    action_id: d.actionId as AutomationInput["action_id"],
    action_param: d.actionParam.trim() || null,
    message: d.message.trim() || null,
  };
}

export function AutomationsView({ items }: { items: Automation[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Automation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const activeCount = items.filter((a) => a.active).length;

  function toggle(a: Automation) {
    start(async () => {
      const res = await toggleAutomation(a.id, !a.active);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Bu kural silinsin mi?")) return;
    start(async () => {
      const res = await deleteAutomation(id);
      if (res.error) toast.error(res.error);
      else {
        setEditing(null);
        toast.success("Kural silindi");
        router.refresh();
      }
    });
  }

  function saveDraft(d: Draft) {
    start(async () => {
      const res = await saveAutomation(
        draftToInput(d, editing?.id, editing?.active ?? true)
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (editing) setEditing(null);
      else setCreateOpen(false);
      toast.success(editing ? "Kural güncellendi" : `“${d.title}” kuralı eklendi`);
      router.refresh();
    });
  }

  function addTemplate(t: Omit<Automation, "id" | "active">) {
    start(async () => {
      const res = await saveAutomation({ ...t, active: true });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setCreateOpen(false);
      toast.success(`“${t.title}” kuralı eklendi`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Özet */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/12 px-3 py-1 font-medium text-positive">
          <span className="size-1.5 rounded-full bg-positive" />{activeCount} aktif
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">{items.length - activeCount} pasif</span>
        <span className="text-muted-foreground/70">· Toplam {items.length} kural</span>
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><Sparkles className="size-3.5 text-primary" />Tetik gerçekleştiğinde aksiyon otomatik çalışır</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <Card key={a.id} onClick={() => setEditing(a)} className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-soft-lg">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-tight">{a.title}</p>
                <span className={cn("shrink-0 rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium", a.active ? "bg-positive/12 text-positive" : "bg-muted text-muted-foreground")}>{a.active ? "Aktif" : "Pasif"}</span>
              </div>
              <Flow a={a} />
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground">{metaOf(a)}</span>
                <div className="flex items-center gap-2">
                  <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  <Switch on={a.active} onClick={(e) => { e.stopPropagation(); toggle(a); }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <button type="button" onClick={() => setCreateOpen(true)} className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card/50 p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary"><Plus className="size-6" /></span>
          <span className="font-semibold">Yeni Kural</span>
          <span className="text-xs text-muted-foreground">Şablondan seç veya sıfırdan oluştur</span>
        </button>
      </div>

      {/* Oluştur modalı — şablon / sıfırdan */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Yeni Hatırlatma Kuralı</DialogTitle></DialogHeader>
          <Tabs defaultValue="scratch">
            <TabsList>
              <TabsTrigger value="scratch"><Wand2 className="size-4" />Sıfırdan Oluştur</TabsTrigger>
              <TabsTrigger value="template"><LayoutTemplate className="size-4" />Şablondan Seç</TabsTrigger>
            </TabsList>
            <TabsContent value="scratch" className="mt-4">
              <Builder submitLabel="Kuralı Oluştur" busy={pending} onSubmit={saveDraft} />
            </TabsContent>
            <TabsContent value="template" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {TEMPLATES.map((t) => {
                  const TI = trigDef(t.trigger_id).icon;
                  const AI = actDef(t.action_id).icon;
                  return (
                    <button key={t.title} type="button" onClick={() => addTemplate(t)} className="rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
                      <p className="mb-2 text-sm font-semibold leading-tight">{t.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("flex size-6 items-center justify-center rounded-md", TONE[trigDef(t.trigger_id).tone])}><TI className="size-3.5" /></span>
                        <ChevronDown className="size-3 -rotate-90" />
                        <span className={cn("flex size-6 items-center justify-center rounded-md", TONE[actDef(t.action_id).tone])}><AI className="size-3.5" /></span>
                        <span className="ml-1 truncate">{metaOf(t)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Düzenle modalı — tam kurucu */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Kuralı Düzenle</DialogTitle></DialogHeader>
          {editing && (
            <>
              <div className="mb-3 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Durum</p>
                  <p className="text-xs text-muted-foreground">{editing.active ? "Aktif — çalışıyor" : "Pasif — durduruldu"}</p>
                </div>
                <Switch on={editing.active} onClick={() => setEditing((e) => (e ? { ...e, active: !e.active } : e))} />
              </div>
              <Builder
                initial={{ title: editing.title, triggerId: editing.trigger_id, triggerParam: editing.trigger_param?.toString() ?? "", actionId: editing.action_id, actionParam: editing.action_param ?? "", message: editing.message ?? "" }}
                submitLabel="Değişiklikleri Kaydet"
                busy={pending}
                onSubmit={saveDraft}
              />
              <DialogFooter className="mt-3">
                <Button variant="destructive" disabled={pending} onClick={() => remove(editing.id)}><Trash2 className="size-4" />Kuralı Sil</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
