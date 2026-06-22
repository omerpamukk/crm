"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { toDateTimeLocal } from "@/lib/format";
import type { Appointment } from "@/types/database";

import {
  appointmentSchema,
  NONE,
  type AppointmentInput,
} from "./schema";
import { createAppointment, updateAppointment } from "./actions";

export interface CustomerOption {
  id: string;
  full_name: string;
}
export interface ServiceOption {
  id: string;
  name: string;
}
export interface StaffOption {
  id: string;
  full_name: string | null;
}

export function AppointmentForm({
  appointment,
  customers,
  services,
  staff,
  onSuccess,
  onCancel,
}: {
  appointment?: Appointment;
  customers: CustomerOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(appointment);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_id: appointment?.customer_id ?? "",
      service_id: appointment?.service_id ?? NONE,
      staff_id: appointment?.staff_id ?? NONE,
      starts_at: toDateTimeLocal(appointment?.starts_at ?? null),
      status: appointment?.status ?? "planned",
      note: appointment?.note ?? "",
    },
  });

  async function onSubmit(values: AppointmentInput) {
    setFormError(null);
    const result = isEdit
      ? await updateAppointment(appointment!.id, values)
      : await createAppointment(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Randevu güncellendi" : "Randevu eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer_id">Müşteri *</Label>
        <Controller
          control={control}
          name="customer_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="customer_id" className="w-full">
                <SelectValue placeholder="Müşteri seçin" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.customer_id && (
          <p className="text-sm text-danger">{errors.customer_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="service_id">Hizmet</Label>
          <Controller
            control={control}
            name="service_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="service_id" className="w-full">
                  <SelectValue placeholder="Hizmet seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Yok —</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff_id">Personel</Label>
          <Controller
            control={control}
            name="staff_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="staff_id" className="w-full">
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Atanmadı —</SelectItem>
                  {staff.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? "İsimsiz"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Tarih ve saat *</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            {...register("starts_at")}
          />
          {errors.starts_at && (
            <p className="text-sm text-danger">{errors.starts_at.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Durum</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Not</Label>
        <Textarea id="note" rows={3} {...register("note")} />
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Ekle"}
        </Button>
      </div>
    </form>
  );
}
