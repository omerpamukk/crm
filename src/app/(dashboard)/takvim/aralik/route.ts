import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { fetchRange, loadCalendarContext } from "../queries";
import { diffDays, isDayKey } from "../zaman";

/**
 * GET /takvim/aralik?bas=YYYY-MM-DD&son=YYYY-MM-DD
 *
 * Takvimde tarih değiştirince sayfa yeniden yüklenmeden sonraki aralığın
 * randevularını getirir (önceden çekme de buradan). Okuma işi olduğu için
 * Server Action değil Route Handler: istekler paralel gider.
 * Oturum ve işletme kapsamı sayfayla aynı (loadCalendarContext).
 */
export async function GET(request: NextRequest) {
  const bas = request.nextUrl.searchParams.get("bas");
  const son = request.nextUrl.searchParams.get("son");
  if (!isDayKey(bas) || !isDayKey(son) || son < bas || diffDays(bas, son) > 62) {
    return NextResponse.json({ error: "Geçersiz tarih aralığı." }, { status: 400 });
  }

  const supabase = await createClient();
  const ctx = await loadCalendarContext(supabase);

  try {
    const payload = await fetchRange(supabase, ctx, bas, son);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("takvim/aralik:", err);
    return NextResponse.json({ error: "Randevular yüklenemedi." }, { status: 500 });
  }
}
