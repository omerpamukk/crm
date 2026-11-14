import { CalendarX2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AuthCard, AuthFrame } from "@/app/(auth)/auth-shell";

import { ConfirmFlow, type ConfirmInfo } from "./confirm-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Randevunuz", robots: { index: false, follow: false } };

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("appointment_confirm_info", { p_token: token });
  const info = (data ?? { valid: false }) as ConfirmInfo;

  if (!info.valid) {
    return (
      <AuthFrame>
        <AuthCard icon={CalendarX2} title="Bağlantı geçersiz" description="Bu randevu bağlantısı artık çalışmıyor. Bir sorun varsa işletmeyi arayın." />
      </AuthFrame>
    );
  }
  return (
    <AuthFrame>
      <ConfirmFlow token={token} info={info} />
    </AuthFrame>
  );
}
