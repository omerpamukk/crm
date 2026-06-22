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
