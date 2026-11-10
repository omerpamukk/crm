"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormActions, FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";

import { updateWorkingHours } from "./actions";
import { workingHoursSchema, type WorkingDay, type WorkingHoursInput } from "./schema";
import { DAY_NAME } from "./settings-meta";

/** Çalışma saatleri: gün gün özet; düzenleme panelde. */
export function HoursSection({ days }: { days: WorkingDay[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <ListGroup
        title="Haftalık düzen"
        detail="Randevu Linki'ndeki saatler de buna göre belirlenir."
        action={
          <Button variant="plain" size="sm" onClick={() => setOpen(true)}>
            Düzenle
          </Button>
        }
      >
        {days.map((d) => (
          <ListRow
            key={d.day}
            title={DAY_NAME[d.day]}
            trailing={
              d.open ? (
                <span className="text-[0.9375rem] tabular-nums">
                  {d.start} – {d.end}
                </span>
              ) : (
                <span className="text-[0.9375rem] text-label-2">Kapalı</span>
              )
            }
          />
        ))}
      </ListGroup>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title="Çalışma saatleri"
        description="Kapalı günlerde randevu alınamaz."
      >
        <HoursForm
          initial={days}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      </FormSheet>
    </div>
  );
}

function HoursForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: WorkingDay[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WorkingHoursInput>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: { days: initial },
  });
  const watched = useWatch({ control, name: "days" });

  async function onSubmit(values: WorkingHoursInput) {
    setFormError(null);
    const res = await updateWorkingHours(values);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success("Çalışma saatleri kaydedildi");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <ul role="list" className="space-y-2">
        {initial.map((d, i) => {
          const isOpen = watched?.[i]?.open ?? d.open;
          const err = errors.days?.[i]?.end?.message ?? errors.days?.[i]?.start?.message;
          return (
            <li key={d.day} className="surface-flat px-4 py-2">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-[0.9375rem] font-medium">{DAY_NAME[d.day]}</span>
                <span className="flex items-center gap-2">
                  <span className="text-subhead text-label-2">{isOpen ? "Açık" : "Kapalı"}</span>
                  <Controller
                    control={control}
                    name={`days.${i}.open`}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        label={`${DAY_NAME[d.day]} açık`}
                      />
                    )}
                  />
                </span>
              </div>
              {isOpen && (
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <label className="space-y-1">
                    <span className="text-subhead text-label-2">Açılış</span>
                    <Input type="time" {...register(`days.${i}.start`)} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-subhead text-label-2">Kapanış</span>
                    <Input type="time" aria-invalid={!!err} {...register(`days.${i}.end`)} />
                  </label>
                  {err && <p className="col-span-2 text-subhead text-danger-text">{err}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </FormActions>
    </form>
  );
}
