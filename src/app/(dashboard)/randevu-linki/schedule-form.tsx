"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { BookingSettings } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { updateBookingSettings } from "./booking-actions";
import { scheduleSchema, type ScheduleInput } from "./schema";

export const DAYS = [
  { v: 1, short: "Pzt", long: "Pazartesi" },
  { v: 2, short: "Sal", long: "Salı" },
  { v: 3, short: "Çar", long: "Çarşamba" },
  { v: 4, short: "Per", long: "Perşembe" },
  { v: 5, short: "Cum", long: "Cuma" },
  { v: 6, short: "Cmt", long: "Cumartesi" },
  { v: 7, short: "Paz", long: "Pazar" },
];

const SLOTS = [15, 20, 30, 45, 60];

/** Çalışma günleri, saatleri ve randevu aralığı formu. */
export function ScheduleForm({
  settings,
  onSuccess,
  onCancel,
}: {
  settings: BookingSettings;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    handleSubmit,
    control,
    register,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleInput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      work_days: settings.work_days,
      start_time: settings.start_time.slice(0, 5),
      end_time: settings.end_time.slice(0, 5),
      slot_minutes: settings.slot_minutes,
    },
  });

  async function onSubmit(values: ScheduleInput) {
    setFormError(null);
    const res = await updateBookingSettings(settings.id, values);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success("Çalışma saatleri kaydedildi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label id="days-label">Çalışma günleri</Label>
        <Controller
          control={control}
          name="work_days"
          render={({ field }) => (
            <div role="group" aria-labelledby="days-label" className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = field.value.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    aria-pressed={on}
                    aria-label={d.long}
                    onClick={() =>
                      field.onChange(
                        on
                          ? field.value.filter((x) => x !== d.v)
                          : [...field.value, d.v].sort((a, b) => a - b)
                      )
                    }
                    className={cn(
                      "pressable inline-flex h-11 min-w-12 items-center justify-center gap-1 rounded-full px-3 text-[0.875rem] font-semibold whitespace-nowrap md:h-9",
                      on ? "bg-primary-soft text-primary-text" : "bg-fill text-label-2 hover:bg-fill-2"
                    )}
                  >
                    {on && <Check aria-hidden className="size-3.5" strokeWidth={2.6} />}
                    {d.short}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.work_days && (
          <p className="text-subhead text-danger-text">{errors.work_days.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Açılış</Label>
          <Input id="start_time" type="time" aria-invalid={!!errors.start_time} {...register("start_time")} />
          {errors.start_time && (
            <p className="text-subhead text-danger-text">{errors.start_time.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">Kapanış</Label>
          <Input id="end_time" type="time" aria-invalid={!!errors.end_time} {...register("end_time")} />
          {errors.end_time && (
            <p className="text-subhead text-danger-text">{errors.end_time.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slot_minutes">Randevu aralığı</Label>
        <Controller
          control={control}
          name="slot_minutes"
          render={({ field }) => (
            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger id="slot_minutes" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOTS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} dakika
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-subhead text-label-2">Müşteri bu aralıklarla saat seçebilir.</p>
      </div>

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
