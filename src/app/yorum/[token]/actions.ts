"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{16,64}$/),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().default(""),
  wantsCall: z.boolean().optional().default(false),
});

/** Giriş gerektirmez: token yalnızca kendi satırını günceller (0038 submit_feedback). */
export async function submitFeedback(input: z.input<typeof schema>): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Lütfen 1 ile 5 arasında bir puan seçin." };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_feedback", {
    p_token: v.token,
    p_rating: v.rating,
    p_comment: v.comment,
    p_wants_call: v.wantsCall,
  });
  if (error) {
    console.error("submitFeedback:", error);
    return { error: "Gönderilemedi. Biraz sonra tekrar deneyin." };
  }
  const res = data as { ok: boolean; error?: string } | null;
  if (!res?.ok) return { error: res?.error === "answered" ? "Bu ziyaret için daha önce puan verdiniz. Teşekkürler!" : "Gönderilemedi." };
  return {};
}

export async function markGoogleClick(token: string): Promise<void> {
  if (!/^[a-f0-9]{16,64}$/.test(token)) return;
  const supabase = await createClient();
  await supabase.rpc("feedback_google_click", { p_token: token });
}
