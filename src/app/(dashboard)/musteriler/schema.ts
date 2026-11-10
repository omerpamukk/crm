import { z } from "zod";

export const customerSchema = z.object({
  full_name: z.string().min(1, "Ad-soyad zorunludur"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Geçerli bir e-posta adresi girin")
    .optional()
    .or(z.literal("")),
  source: z.string().optional(),
  status: z.string().optional(),
  tags: z.string().optional(), // virgülle ayrılmış; DB'de text[] olarak saklanır
  birthday: z.string().optional(), // yyyy-mm-dd
  note: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/** "Yeni müşteri" formu: müşteri + isteğe bağlı ilk paket. */
export const customerCreateSchema = z.object({
  first_name: z.string().trim().min(1, "Ad zorunludur"),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Geçerli bir e-posta adresi girin")
    .optional()
    .or(z.literal("")),
  service: z.string().optional(),
  total_sessions: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Seans sayısını rakamla yazın"),
  session_days: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()),
  note: z.string().optional(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
