"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { CUSTOMER_SOURCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { customerCreateSchema, type CustomerCreateInput } from "./schema";
import { createCustomerWithDetails } from "./actions";

const NONE = "none";
const QUICK_TAGS = ["VIP", "Taksitli"];

/**
 * Yeni müşteri formu. Varsayılan akış en sık işi yapar: ad, telefon, e-posta.
 * Paket ve diğer bilgiler kapalı başlar.
 */
export function CustomerCreateForm({
  services = [],
  tags = [],
  onSuccess,
  onCancel,
}: {
  /** Verilirse "Paket ekle" bölümü çıkar. */
  services?: string[];
  /** Mevcut etiketler (VIP ve Taksitli her zaman önerilir). */
  tags?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      service: NONE,
      total_sessions: "",
      session_days: "",
      source: NONE,
      tags: [],
      note: "",
    },
  });

  const picked = useWatch({ control, name: "tags" });
  const tagChoices = [...new Set([...QUICK_TAGS, ...tags])].slice(0, 12);

  function toggleTag(t: string) {
    setValue("tags", picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t]);
  }

  async function onSubmit(v: CustomerCreateInput) {
    setFormError(null);
    const res = await createCustomerWithDetails({
      first_name: v.first_name,
      last_name: v.last_name,
      phone: v.phone,
      email: v.email,
      service: !v.service || v.service === NONE ? undefined : v.service,
      total_sessions: v.total_sessions,
      session_days: v.session_days,
      source: !v.source || v.source === NONE ? undefined : v.source,
      tags: v.tags,
      note: v.note,
    });
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success("Müşteri eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cf-first">Ad *</Label>
          <Input id="cf-first" autoComplete="off" aria-invalid={!!errors.first_name} {...register("first_name")} />
          {errors.first_name && <p className="text-subhead text-danger-text">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-last">Soyad</Label>
          <Input id="cf-last" autoComplete="off" {...register("last_name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-phone">Telefon</Label>
          <Input id="cf-phone" type="tel" inputMode="tel" placeholder="0 5xx xxx xx xx" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-email">E-posta</Label>
          <Input id="cf-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <p className="text-subhead text-danger-text">{errors.email.message}</p>}
        </div>
      </div>

      {services.length > 0 && (
        <Disclosure title="Paket ekle" open={pkgOpen} onOpenChange={setPkgOpen} contentClassName="">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cf-service">Hizmet</Label>
              <Controller
                control={control}
                name="service"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="cf-service" className="w-full">
                      <SelectValue placeholder="Hizmet seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Seçilmedi</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-total">Seans sayısı</Label>
              <Input id="cf-total" inputMode="numeric" placeholder="6" aria-invalid={!!errors.total_sessions} {...register("total_sessions")} />
              {errors.total_sessions && <p className="text-subhead text-danger-text">{errors.total_sessions.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-days">Seans günleri</Label>
              <Input id="cf-days" placeholder="Salı, Perşembe 10:00" {...register("session_days")} />
            </div>
          </div>
        </Disclosure>
      )}

      <Disclosure title="Diğer bilgiler" open={moreOpen} onOpenChange={setMoreOpen} contentClassName="">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-source">Nereden geldi</Label>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cf-source" className="w-full">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Seçilmedi</SelectItem>
                    {CUSTOMER_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label id="cf-tags-label">Etiketler</Label>
            <div role="group" aria-labelledby="cf-tags-label" className="flex flex-wrap gap-2">
              {tagChoices.map((t) => {
                const on = picked.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "pressable inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-semibold whitespace-nowrap",
                      on ? "bg-primary-soft text-primary-text" : "bg-fill text-label-2 hover:bg-fill-2"
                    )}
                  >
                    {on && <Check aria-hidden className="size-3.5" strokeWidth={2.6} />}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-note">Not</Label>
            <Textarea id="cf-note" rows={3} {...register("note")} />
          </div>
        </div>
      </Disclosure>

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
