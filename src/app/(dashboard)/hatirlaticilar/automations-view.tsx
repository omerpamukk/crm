"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Info, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { useUrlState } from "@/lib/use-url-state";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PageHeader } from "@/components/shared/page-header";

import { deleteAutomation, toggleAutomation } from "./actions";
import { RuleForm, type RuleSeed } from "./rule-form";
import { TEMPLATES, ruleSentence, trigDef } from "./rule-meta";
import type { ActionId, TriggerId } from "./schema";
import { isRuleSupported, isTemplateMissing } from "@/lib/automations/supported";

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
  wa_template?: string | null;
};

type Scope = "hepsi" | "acik" | "kapali";

type SheetState =
  | { kind: "create"; step: "pick" | "form"; seed?: RuleSeed; open: boolean }
  | { kind: "edit"; rule: Automation; open: boolean };

export function AutomationsView({ items, loadFailed }: { items: Automation[]; loadFailed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scopeRaw, setScope] = useUrlState("durum", "hepsi");
  const scope = (["hepsi", "acik", "kapali"].includes(scopeRaw) ? scopeRaw : "hepsi") as Scope;
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Automation | null>(null);
  // Anahtarlar anında değişir; sunucu yanıtı hatalıysa geri döner.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isActive = (a: Automation) => overrides[a.id] ?? a.active;
  const activeCount = items.filter(isActive).length;
  const shown = items.filter((a) =>
    scope === "acik" ? isActive(a) : scope === "kapali" ? !isActive(a) : true
  );

  function toggle(a: Automation, next: boolean) {
    setOverrides((o) => ({ ...o, [a.id]: next }));
    start(async () => {
      const res = await toggleAutomation(a.id, next);
      if (res.error) {
        toast.error(res.error);
        setOverrides((o) => {
          const { [a.id]: _drop, ...rest } = o;
          void _drop;
          return rest;
        });
        return;
      }
      toast.success(next ? `“${a.title}” açıldı` : `“${a.title}” kapatıldı`);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const rule = deleteTarget;
    start(async () => {
      const res = await deleteAutomation(rule.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setDeleteTarget(null);
      setSheet(null);
      toast.success(`“${rule.title}” silindi`);
      router.refresh();
    });
  }

  const openCreate = () => setSheet({ kind: "create", step: "pick", open: true });
  const closeSheet = () => setSheet((s) => (s ? { ...s, open: false } : s));

  const header = (
    <PageHeader
      title="Hatırlatmalar"
      description="Randevu, ödeme ve doğum günü mesajlarını otomatikleştirin. Kuralı bir kez kurarsınız, sonrası kendiliğinden işler."
      primary={<ToolbarAction prominent icon={Plus} label="Yeni kural" onClick={openCreate} />}
    />
  );

  const notice = (
    <div className="surface flex items-start gap-3 p-4">
      <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-label-2" />
      <p className="min-w-0 text-[0.9375rem] text-label-2">
        Mesajların gönderilebilmesi için SMS, e-posta ya da WhatsApp bağlantısı kurulu olmalı.{" "}
        <Link href="/ayarlar" className="focus-ring rounded font-semibold whitespace-nowrap text-primary-text hover:underline">
          Ayarlar → Entegrasyonlar
        </Link>{" "}
        bölümünden kurabilirsiniz. Mesajlar 09:00–21:00 arasında gönderilir.
      </p>
    </div>
  );

  let body: React.ReactNode;
  if (loadFailed) {
    body = <ErrorState title="Hatırlatmalar yüklenemedi" onRetry={() => router.refresh()} />;
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon={Bell}
        title="Henüz kural yok"
        description="Hazır şablonlardan birini seçerek ilk kuralınızı birkaç dokunuşla kurun. Örneğin randevudan önce müşteriye hatırlatma gönderin."
        action={
          <Button onClick={openCreate}>
            <Plus />
            Yeni kural
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        <FilterBar
          scope={{
            items: [
              { value: "hepsi", label: "Tümü", count: items.length },
              { value: "acik", label: "Açık", count: activeCount },
              { value: "kapali", label: "Kapalı", count: items.length - activeCount },
            ],
            value: scope,
            onValueChange: (v) => setScope(v as Scope),
            "aria-label": "Kural durumu",
          }}
        />
        {shown.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={scope === "acik" ? "Açık kural yok" : "Kapalı kural yok"}
            description="Listeyi değiştirip tüm kurallara bakabilirsiniz."
            action={
              <Button variant="secondary" onClick={() => setScope("hepsi")}>
                Tüm kurallar
              </Button>
            }
          />
        ) : (
          <ListGroup aria-label="Kurallar" inset={56}>
            {shown.map((a) => {
              const Icon = trigDef(a.trigger_id).icon;
              const supported = isRuleSupported(a);
              const noTemplate = supported && isTemplateMissing(a);
              const on = supported && !noTemplate && isActive(a);
              return (
                <ListRow
                  key={a.id}
                  leading={<Icon aria-hidden className="size-5 text-label-2" />}
                  title={a.title}
                  subtitle={
                    noTemplate
                      ? `${ruleSentence(a)} Şablon adı eksik; düzenleyip yazın.`
                      : supported
                      ? ruleSentence(a)
                      : `${ruleSentence(a)} Bu kural henüz çalışmıyor; düzenleyip çalışan bir tetikleyici seçin.`
                  }
                  trailing={
                    <span className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="max-md:size-11"
                        aria-label={`${a.title} kuralını düzenle`}
                        onClick={() => setSheet({ kind: "edit", rule: a, open: true })}
                      >
                        <Pencil />
                      </Button>
                      <Switch
                        checked={on}
                        disabled={!supported || noTemplate}
                        onCheckedChange={(v) => toggle(a, v)}
                        label={`${a.title} kuralı ${on ? "açık" : "kapalı"}`}
                      />
                    </span>
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </>
    );
  }

  const editing = sheet?.kind === "edit" ? sheet.rule : null;
  const editSeed: RuleSeed | undefined = editing
    ? {
        id: editing.id,
        title: editing.title,
        active: editing.active,
        trigger_id: editing.trigger_id,
        trigger_param: editing.trigger_param?.toString() ?? "",
        action_id: editing.action_id,
        action_param: editing.action_param ?? "",
        message: editing.message ?? "",
        wa_template: editing.wa_template ?? "",
      }
    : undefined;

  return (
    <div className="min-w-0 space-y-8">
      {header}
      {notice}
      {body}

      <FormSheet
        open={!!sheet?.open}
        onOpenChange={(o) => setSheet((s) => (s ? { ...s, open: o } : s))}
        title={sheet?.kind === "edit" ? "Kuralı düzenle" : "Yeni kural"}
        description={sheet?.kind === "create" && sheet.step === "pick" ? "Hazır bir şablonla başlayın." : undefined}
      >
        {sheet?.kind === "create" && sheet.step === "pick" && (
          <div className="space-y-4">
            <ListGroup title="Hazır şablonlar" inset={16}>
              {TEMPLATES.map((t) => (
                <ListRow
                  key={t.title}
                  title={t.title}
                  subtitle={ruleSentence(t)}
                  chevron
                  onClick={() =>
                    setSheet({
                      kind: "create",
                      step: "form",
                      open: true,
                      seed: {
                        title: t.title,
                        active: true,
                        trigger_id: t.trigger_id,
                        trigger_param: t.trigger_param?.toString() ?? "",
                        action_id: t.action_id,
                        action_param: t.action_param ?? "",
                        message: t.message ?? "",
                        wa_template: t.wa_template ?? "",
                      },
                    })
                  }
                />
              ))}
            </ListGroup>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setSheet({ kind: "create", step: "form", open: true })}
            >
              Sıfırdan kur
              <ChevronRight />
            </Button>
          </div>
        )}
        {sheet?.kind === "create" && sheet.step === "form" && (
          <RuleForm
            key={sheet.seed?.title ?? "bos"}
            seed={sheet.seed}
            onSuccess={() => {
              closeSheet();
              router.refresh();
            }}
            onCancel={closeSheet}
          />
        )}
        {editing && (
          <RuleForm
            key={editing.id}
            seed={editSeed}
            onSuccess={() => {
              closeSheet();
              router.refresh();
            }}
            onCancel={closeSheet}
            onDelete={() => setDeleteTarget(editing)}
          />
        )}
      </FormSheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Kuralı sil</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” silinecek ve mesajlar artık gönderilmeyecek. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive-solid" onClick={confirmDelete} disabled={pending}>
              {pending ? "Siliniyor..." : "Kuralı sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
