import { z } from "zod";

import { STAFF_COLOR_KEYS } from "@/lib/staff-colors";

export const staffSchema = z.object({
  full_name: z.string().min(1, "Ad soyad zorunludur"),
  title: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Geçerli bir e-posta girin"
    ),
  commission_rate: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d+([.,]\d{1,2})?$/.test(v),
      "Geçerli bir oran girin (0-100)"
    ),
  is_active: z.boolean(),
  note: z.string().optional(),
  /** Takvim rengi. */
  color: z.enum(STAFF_COLOR_KEYS).nullable().optional(),
  /** Açık = tüm hizmetleri verir (hizmet listesi boş kaydedilir). */
  all_services: z.boolean(),
  service_ids: z.array(z.string().min(1)).max(200),
}).refine((v) => v.all_services || v.service_ids.length > 0, {
  message: "En az bir hizmet seçin ya da “Tüm hizmetler”i açın",
  path: ["service_ids"],
});

export type StaffInput = z.infer<typeof staffSchema>;
