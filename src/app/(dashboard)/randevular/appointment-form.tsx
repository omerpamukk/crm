"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { StatusBadge } from "@/components/shared/status";
import { formatTime, toDateTimeLocal } from "@/lib/format";
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
  price: number | null;
}
export interface StaffOption {
  id: string;
  full_name: string;
}
export interface PackageOption {
  id: string;
  customer_id: string | null;
  service_name: string | null;
  remaining_sessions: number | null;
}

export function AppointmentForm({
  appointment,
  customers,
  services,
  staff,
  packages,
  presetCustomerId,
  presetStartsAt,
  presetStaffId,
  onSuccess,
  onCancel,
}: {
  appointment?: Appointment;
  customers: CustomerOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  packages: PackageOption[];
  presetCustomerId?: string;
  /** Yeni randevuda başlangıç anı (ISO, ofsetli); işletme saatinde gösterilir. */
  presetStartsAt?: string;
  /** Yeni randevuda önceden seçili personel. */
  presetStaffId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(appointment);
  // "Geldi" yalnızca Geldi eylemiyle verilir; formda seçilemez. Zaten Geldi olan
  // randevuda durum salt-okunur gösterilir ve kayıtta olduğu gibi korunur.
  const isArrived = appointment?.status === "arrived";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_id: appointment?.customer_id ?? presetCustomerId ?? "",
      service_id: appointment?.service_id ?? NONE,
      staff_member_id: appointment?.staff_member_id ?? presetStaffId ?? NONE,
      package_id: appointment?.package_id ?? NONE,
      // Saklanan an işletme saatine çevrilir (sunucu/tarayıcı diliminden bağımsız).
      starts_at: toDateTimeLocal(appointment?.starts_at ?? presetStartsAt ?? null),
      status: appointment?.status ?? "planned",
      price: appointment?.price?.toString() ?? "",
      note: appointment?.note ?? "",
    },
  });

  const selectedCustomer = useWatch({ control, name: "customer_id" });
  const customerPackages = packages.filter(
    (p) => p.customer_id === selectedCustomer && (p.remaining_sessions ?? 0) > 0
  );

  async function onSubmit(values: AppointmentInput) {
    setFormError(null);
    const result = isEdit
      ? await updateAppointment(appointment!.id, values)
      : await createAppointment(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Randevu güncellendi" : "Randevu oluşturuldu");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer_id">Müşteri</Label>
        <Controller
          control={control}
          name="customer_id"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v);
                setValue("package_id", NONE); // müşteri değişince paketi sıfırla
              }}
            >
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
          <p role="alert" className="text-[0.875rem] text-danger-text">{errors.customer_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="service_id">Hizmet</Label>
          <Controller
            control={control}
            name="service_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  // Hizmet seçilince fiyatı otomatik doldur (düzenlenebilir).
                  const svc = services.find((s) => s.id === v);
                  if (svc?.price != null) setValue("price", String(svc.price));
                }}
              >
                <SelectTrigger id="service_id" className="w-full">
                  <SelectValue placeholder="Hizmet seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Seçilmedi</SelectItem>
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
          <Label htmlFor="staff_member_id">Personel</Label>
          <Controller
            control={control}
            name="staff_member_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="staff_member_id" className="w-full">
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Atanmadı</SelectItem>
                  {staff.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Tarih ve saat</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            {...register("starts_at")}
          />
          {errors.starts_at && (
            <p role="alert" className="text-[0.875rem] text-danger-text">{errors.starts_at.message}</p>
          )}
        </div>
        {isEdit && (
          <div className="space-y-2">
            <Label htmlFor="status">Durum</Label>
            {isArrived ? (
              <div className="flex h-9 items-center" id="status">
                <StatusBadge variant="positive">
                  {appointment?.arrived_at ? `Geldi · ${formatTime(appointment.arrived_at)}` : "Geldi"}
                </StatusBadge>
              </div>
            ) : (
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_STATUSES.filter((s) => s.value !== "arrived").map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {isArrived && (
              <p className="text-subhead text-label-2">
                Geldi işaretini listedeki Geldi düğmesiyle geri alabilirsiniz.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Ücret (₺)</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="Hizmetin ücreti otomatik gelir"
            {...register("price")}
          />
          {errors.price && (
            <p role="alert" className="text-[0.875rem] text-danger-text">{errors.price.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="package_id">Pakete bağla</Label>
          <Controller
            control={control}
            name="package_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!selectedCustomer || customerPackages.length === 0}
              >
                <SelectTrigger id="package_id" className="w-full">
                  <SelectValue placeholder="Paket seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Pakete bağlama</SelectItem>
                  {customerPackages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.service_name ?? "Paket"} ({p.remaining_sessions} seans)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-subhead text-label-2">
            Tamamlandığında seçili paketten 1 seans düşülür.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Not</Label>
        <Textarea id="note" rows={3} {...register("note")} />
      </div>

      {formError && <p role="alert" className="text-[0.875rem] text-danger-text">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
