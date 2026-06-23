import { z } from "zod";

/** Select alanlarında "boş" seçim için kullanılan özel değer. */
export const NONE = "none";

export const appointmentSchema = z.object({
  customer_id: z.string().min(1, "Müşteri seçin"),
  service_id: z.string().optional(),
  staff_member_id: z.string().optional(),
  package_id: z.string().optional(),
  starts_at: z.string().min(1, "Tarih ve saat seçin"),
  status: z.string().optional(),
  price: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d+([.,]\d{1,2})?$/.test(v),
      "Geçerli bir fiyat girin"
    ),
  note: z.string().optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
