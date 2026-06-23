import { z } from "zod";

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
});

export type StaffInput = z.infer<typeof staffSchema>;
