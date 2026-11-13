"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormActions } from "@/components/shared/form-sheet";

import { saveAutomation } from "./actions";
import { ACTION_OPTIONS, TRIGGER_OPTIONS, actDef, ruleSentence, trigDef } from "./rule-meta";
import { ruleFormSchema, WHATSAPP_ACTIONS, type AutomationInput, type RuleFormInput } from "./schema";

export type RuleSeed = Partial<RuleFormInput> & { id?: string };

/** Kural kurma ve düzenleme formu. Ad, "Gelişmiş" altında kapalı başlar. */
export function RuleForm({
  seed,
  onSuccess,
  onCancel,
  onDelete,
}: {
  seed?: RuleSeed;
  onSuccess: () => void;
  onCancel: () => void;
  /** Yalnızca düzenlemede: kuralı sil. */
  onDelete?: () => void;
}) {
  const isEdit = Boolean(seed?.id);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormInput>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      title: seed?.title ?? "",
      active: seed?.active ?? true,
      trigger_id: seed?.trigger_id ?? TRIGGER_OPTIONS[0].id,
      trigger_param: seed?.trigger_param ?? (seed?.trigger_id ? "" : TRIGGER_OPTIONS[0].param?.def ?? ""),
      action_id: seed?.action_id ?? ACTION_OPTIONS[0].id,
      action_param: seed?.action_param ?? "",
      message: seed?.message ?? "",
      wa_template: seed?.wa_template ?? "",
    },
  });

  const w = useWatch({ control });
  const tDef = trigDef(w.trigger_id ?? TRIGGER_OPTIONS[0].id);
  const aDef = actDef(w.action_id ?? ACTION_OPTIONS[0].id);
  const triggerChoices = TRIGGER_OPTIONS.some((t) => t.id === seed?.trigger_id) || !seed?.trigger_id
    ? TRIGGER_OPTIONS
    : [...TRIGGER_OPTIONS, trigDef(seed.trigger_id)];
  const actionChoices = ACTION_OPTIONS.some((a) => a.id === seed?.action_id) || !seed?.action_id
    ? ACTION_OPTIONS
    : [...ACTION_OPTIONS, actDef(seed.action_id)];
  const sentence = ruleSentence({
    trigger_id: tDef.id,
    trigger_param: tDef.param ? w.trigger_param : null,
    action_id: aDef.id,
    action_param: w.action_param,
  });
  const suggestedTitle = `${tDef.label} · ${aDef.label}`;

  async function onSubmit(v: RuleFormInput) {
    setFormError(null);
    const t = trigDef(v.trigger_id);
    const a = actDef(v.action_id);
    const input: AutomationInput = {
      id: seed?.id,
      title: v.title.trim() || `${t.label} · ${a.label}`,
      active: v.active,
      trigger_id: v.trigger_id,
      trigger_param: t.param ? Number(v.trigger_param) : null,
      action_id: v.action_id,
      action_param: a.param ? v.action_param.trim() || null : null,
      message: a.message ? v.message.trim() || null : null,
      wa_template: WHATSAPP_ACTIONS.includes(v.action_id) ? v.wa_template.trim() || null : null,
    };
    const res = await saveAutomation(input);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success(isEdit ? "Kural güncellendi" : "Kural kuruldu");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="surface-flat flex items-center justify-between gap-3 py-1 pr-1 pl-4">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium">Kural açık</p>
          <p className="text-subhead text-label-2">
            {isEdit ? "Kapatırsanız mesaj gönderilmez." : "Kaydedince hemen çalışmaya başlar."}
          </p>
        </div>
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} label="Kural açık" />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="trigger_id">Ne zaman?</Label>
        <Controller
          control={control}
          name="trigger_id"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(id) => {
                field.onChange(id);
                const def = trigDef(id);
                setValue("trigger_param", def.param ? getValues("trigger_param") || def.param.def : "");
              }}
            >
              <SelectTrigger id="trigger_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggerChoices.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {tDef.param && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="trigger_param">{tDef.param.label}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="trigger_param"
                inputMode="numeric"
                className="w-28"
                aria-invalid={!!errors.trigger_param}
                {...register("trigger_param")}
              />
              {tDef.param.unit && <span className="text-subhead text-label-2">{tDef.param.unit}</span>}
            </div>
            {errors.trigger_param && (
              <p className="text-subhead text-danger-text">{errors.trigger_param.message}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="action_id">Ne yapılsın?</Label>
        <Controller
          control={control}
          name="action_id"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(id) => {
                field.onChange(id);
                const def = actDef(id);
                setValue("action_param", def.param ? getValues("action_param") || def.param.def : "");
              }}
            >
              <SelectTrigger id="action_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionChoices.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {aDef.param && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="action_param">{aDef.param.label}</Label>
            <Input
              id="action_param"
              aria-invalid={!!errors.action_param}
              {...register("action_param")}
            />
            {errors.action_param && (
              <p className="text-subhead text-danger-text">{errors.action_param.message}</p>
            )}
          </div>
        )}
        {WHATSAPP_ACTIONS.includes(aDef.id) && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="wa_template">WhatsApp şablon adı</Label>
            <Input
              id="wa_template"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="randevu_hatirlatma"
              aria-invalid={!!errors.wa_template}
              {...register("wa_template")}
            />
            {errors.wa_template ? (
              <p className="text-subhead text-danger-text">{errors.wa_template.message}</p>
            ) : (
              <p className="text-subhead text-label-2">
                İşletmenin başlattığı WhatsApp mesajları yalnızca Meta&apos;da onaylanmış şablonla gider. Şablonu
                Meta Business&apos;ta oluşturup onaylatın, adını buraya yazın. Şablondaki {"{{1}}"} müşterinin adıyla dolar.
              </p>
            )}
          </div>
        )}
        {aDef.message && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="message">{WHATSAPP_ACTIONS.includes(aDef.id) ? "Şablon metni (önizleme)" : "Mesaj"}</Label>
            <Textarea
              id="message"
              rows={4}
              aria-invalid={!!errors.message}
              placeholder="Merhaba {ad}, ..."
              {...register("message")}
            />
            {errors.message ? (
              <p className="text-subhead text-danger-text">{errors.message.message}</p>
            ) : (
              <p className="text-subhead text-label-2">
                Müşterinin adı için {"{ad}"} yazın; mesajda müşterinin adıyla değişir.
              </p>
            )}
          </div>
        )}
      </div>

      <div role="status" className="surface-flat px-4 py-3">
        <p className="section-label mb-0.5">Özet</p>
        <p className="text-[0.9375rem]">{sentence}</p>
      </div>

      <Disclosure title="Gelişmiş">
        <Label htmlFor="title">Kural adı</Label>
        <Input id="title" placeholder={suggestedTitle} {...register("title")} />
        {errors.title && <p className="text-subhead text-danger-text">{errors.title.message}</p>}
      </Disclosure>

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <FormActions
        start={
          onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Kuralı sil
            </Button>
          )
        }
      >
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : isEdit ? "Kaydet" : "Kuralı kur"}
        </Button>
      </FormActions>
    </form>
  );
}
