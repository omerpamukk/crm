import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, MapPin, Phone, Star, Store } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { sectorLabel } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { AuthCard, AuthFrame } from "@/app/(auth)/auth-shell";

export const dynamic = "force-dynamic";

type Day = { day: number; open: boolean; start: string; end: string };
type Profile = {
  valid: boolean;
  name?: string;
  sector?: string | null;
  about?: string | null;
  phone?: string | null;
  address?: string | null;
  working_hours?: { days?: Day[] } | null;
  booking_token?: string | null;
  services?: { name: string; price: number | null; duration_min: number | null }[];
  rating_avg?: number | null;
  rating_count?: number;
  reviews?: { author: string; rating: number; comment: string; date: string }[];
};

const DAY = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

async function load(slug: string): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_profile", { p_slug: slug });
  return (data ?? { valid: false }) as Profile;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p.valid) return { title: "İşletme bulunamadı", robots: { index: false } };
  return {
    title: p.name,
    description: p.about ?? `${p.name} · ${sectorLabel(p.sector)} · hizmetler, fiyatlar ve online randevu`,
    robots: { index: true, follow: true },
  };
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} strokeWidth={1.5} className={cn(size, i <= Math.round(value) ? "fill-[color:var(--warning-dot)] text-warning-dot" : "text-label-3")} />
      ))}
    </span>
  );
}

/**
 * Herkese açık işletme sayfası (0040): hizmetler, fiyatlar, saatler,
 * yalnızca gerçekten gelmiş müşterilerden gelen puanlar ve "Randevu al".
 */
export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p.valid) {
    return (
      <AuthFrame>
        <AuthCard icon={Store} title="İşletme bulunamadı" description="Bu sayfa yayında değil ya da adresi değişmiş." />
      </AuthFrame>
    );
  }

  const days = Array.isArray(p.working_hours?.days) ? (p.working_hours?.days as Day[]) : [];
  const services = p.services ?? [];
  const reviews = p.reviews ?? [];
  const count = p.rating_count ?? 0;

  return (
    <div className="min-h-svh px-4 py-8">
      <div aria-hidden className="app-wall" />
      <main className="mx-auto w-full max-w-xl space-y-8">
        <header className="space-y-3 text-center">
          <p className="eyebrow">{sectorLabel(p.sector)}</p>
          <h1 className="text-large-title font-bold text-balance">{p.name}</h1>
          {count > 0 && p.rating_avg != null && (
            <p className="flex items-center justify-center gap-2 text-subhead text-label-2">
              <Stars value={Number(p.rating_avg)} />
              <span className="font-semibold text-label tabular-nums">{Number(p.rating_avg).toLocaleString("tr-TR")}</span>
              <span>· {count} değerlendirme</span>
            </p>
          )}
          {p.about && <p className="text-[0.9375rem] text-label-2 text-pretty">{p.about}</p>}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            {p.booking_token && (
              <Link href={`/randevu/${p.booking_token}`} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                <CalendarPlus />
                Randevu al
              </Link>
            )}
            {p.phone && (
              <a href={`tel:${p.phone.replace(/\s/g, "")}`} className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "w-full sm:w-auto")}>
                <Phone />
                Ara
              </a>
            )}
          </div>
          {p.address && (
            <p className="flex items-center justify-center gap-1.5 text-subhead text-label-2">
              <MapPin aria-hidden className="size-4 shrink-0" />
              <span>{p.address}</span>
            </p>
          )}
        </header>

        {services.length > 0 && (
          <section aria-labelledby="hizmetler" className="space-y-2">
            <h2 id="hizmetler" className="section-title mx-1">Hizmetler</h2>
            <ul className="surface inset-rows overflow-clip" style={{ "--row-inset": "16px" } as React.CSSProperties}>
              {services.map((s) => (
                <li key={s.name} className="flex min-h-12 items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{s.name}</span>
                    {s.duration_min ? <span className="block text-subhead text-label-2">{s.duration_min} dk</span> : null}
                  </span>
                  {s.price != null && <span className="shrink-0 tabular-nums">{formatPrice(Number(s.price))}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {days.length === 7 && (
          <section aria-labelledby="saatler" className="space-y-2">
            <h2 id="saatler" className="section-title mx-1">Çalışma saatleri</h2>
            <ul className="surface inset-rows overflow-clip" style={{ "--row-inset": "16px" } as React.CSSProperties}>
              {days.map((d) => (
                <li key={d.day} className="flex min-h-11 items-center justify-between px-4 py-2 text-[0.9375rem]">
                  <span>{DAY[d.day]}</span>
                  <span className={cn("tabular-nums", !d.open && "text-label-2")}>{d.open ? `${d.start} – ${d.end}` : "Kapalı"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {reviews.length > 0 && (
          <section aria-labelledby="yorumlar" className="space-y-2">
            <h2 id="yorumlar" className="section-title mx-1">Müşteri yorumları</h2>
            <ul className="surface inset-rows overflow-clip" style={{ "--row-inset": "16px" } as React.CSSProperties}>
              {reviews.map((r, i) => (
                <li key={i} className="space-y-1 px-4 py-3">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">{r.author}</span>
                    <Stars value={r.rating} size="size-3.5" />
                  </p>
                  <p className="text-[0.9375rem] text-label-2">{r.comment}</p>
                </li>
              ))}
            </ul>
            <p className="mx-1 text-footnote text-label-2">Yorumlar yalnızca bu işletmeye gerçekten gelmiş müşterilerden toplanır.</p>
          </section>
        )}
      </main>
    </div>
  );
}
