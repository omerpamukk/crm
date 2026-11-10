import { z } from "zod";

import { AGENCY_SECTIONS } from "@/lib/constants";

/** Ajansa gösterilebilecek bölümler (henüz çalışmayan "Reklam & Kampanya" hariç). */
export const SHARE_SECTIONS = AGENCY_SECTIONS.filter((s) => s.key !== "reklam_kampanya");

export const agencySchema = z.object({
  name: z.string().trim().min(1, "Ajans ya da kişi adı zorunludur"),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Geçerli bir e-posta girin"),
  sections: z.array(z.string()).min(1, "En az bir bölüm seçin"),
  /** Gün sayısı; "0" süresiz, "keep" düzenlemede mevcut süreyi korur. */
  days: z.string(),
  note: z.string().optional(),
});

export type AgencyInput = z.infer<typeof agencySchema>;
