import { CalendarX2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { BookingFlow, type BookingConfig } from "./booking-flow";

export const dynamic = "force-dynamic";

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
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <CalendarX2 className="size-7" />
        </span>
        <h1 className="text-xl font-bold">Randevu bağlantısı geçersiz</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Bu randevu linki artık aktif değil. Lütfen işletme ile iletişime geçin.
        </p>
      </div>
    );
  }

  return <BookingFlow token={token} config={config} />;
}
