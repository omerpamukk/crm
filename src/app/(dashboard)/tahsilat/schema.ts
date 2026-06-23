import { z } from "zod";

/** "Pakete bağla" select'inde boş seçim. */
export const NONE = "none";

export const paymentSchema = z.object({
  customer_id: z.string().min(1, "Müşteri seçin"),
  amount: z
    .string()
    .min(1, "Tutar girin")
    .refine(
      (v) => /^\d+([.,]\d{1,2})?$/.test(v) && Number(v.replace(",", ".")) > 0,
      "Geçerli bir tutar girin"
    ),
  method: z.string().optional(),
  package_id: z.string().optional(),
  note: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
