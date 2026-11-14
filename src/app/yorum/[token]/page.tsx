import { MessageSquareOff } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AuthCard, AuthFrame } from "@/app/(auth)/auth-shell";

import { FeedbackFlow, type FeedbackInfo } from "./feedback-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ziyaretiniz nasıldı?", robots: { index: false, follow: false } };

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("feedback_info", { p_token: token });
  const info = (data ?? { valid: false }) as FeedbackInfo;

  if (!info.valid) {
    return (
      <AuthFrame>
        <AuthCard
          icon={MessageSquareOff}
          title="Bağlantı geçersiz"
          description="Bu değerlendirme bağlantısı artık çalışmıyor. Görüşünüzü işletmeye doğrudan iletebilirsiniz."
        />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <FeedbackFlow token={token} info={info} />
    </AuthFrame>
  );
}
