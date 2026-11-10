import { CalendarX2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AuthCard, AuthFrame } from "@/app/(auth)/auth-shell";

import { BookingFlow, type BookingConfig } from "./booking-flow";
import { todayKey } from "./booking-time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Online randevu" };

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("booking_config", { p_token: token });
  const config = (raw ?? { valid: false }) as BookingConfig;

  if (!config.valid) {
    return (
      <AuthFrame>
        <AuthCard
          icon={CalendarX2}
          title="Randevu bağlantısı geçersiz"
          description="Bu randevu bağlantısı artık çalışmıyor. İşletmeyi arayıp güncel bağlantıyı isteyebilirsiniz."
        />
      </AuthFrame>
    );
  }

  return <BookingFlow token={token} config={config} today={todayKey()} />;
}
