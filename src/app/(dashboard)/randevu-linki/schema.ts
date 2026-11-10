import { z } from "zod";

/** Çalışma günleri ve saatleri formu. */
export const scheduleSchema = z
  .object({
    work_days: z.array(z.number().int().min(1).max(7)).min(1, "En az bir çalışma günü seçin"),
    start_time: z.string().regex(/^\d{2}:\d{2}/, "Açılış saatini girin"),
    end_time: z.string().regex(/^\d{2}:\d{2}/, "Kapanış saatini girin"),
    slot_minutes: z.number().int().positive("Randevu aralığını seçin"),
  })
  .refine((v) => v.start_time.slice(0, 5) < v.end_time.slice(0, 5), {
    path: ["end_time"],
    message: "Kapanış saati açılıştan sonra olmalı",
  });

export type ScheduleInput = z.infer<typeof scheduleSchema>;
