import Link from "next/link";
import { BarChart3, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { requireCapability } from "@/lib/supabase/guard";
import { PageHeader } from "@/components/shared/page-header";

import { NewExpenseButton } from "../giderler/new-expense-button";
import { ReportsOverview } from "./overview";
import { ReportsDetail } from "./detail";

export const metadata = { title: "Raporlar" };

/**
 * Raporlar — eski "Yönetici Paneli" ve "Raporlar" sayfalarının birleşimi.
 *
 * İki sekme tek sayfada toplanır:
 *  - Genel Bakış  → dönem seçilebilen finansal özet (eski Yönetici Paneli)
 *  - Detaylı      → sabit dönemli tablolar ve dağılımlar (eski Raporlar)
 *
 * Sekme seçimi URL'de (`?sekme=`) tutulur; dönem seçici sunucu tarafında
 * `searchParams` okuduğu için istemci tarafı bir Tabs bileşeni kullanılamaz.
 */
export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{
    sekme?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  // Ciro, komisyon ve kâr verisi — yalnızca işletme sahibi.
  await requireCapability("raporlar");

  const { sekme, range, from, to } = await searchParams;
  const detail = sekme === "detay";

  // Sekme değişirken seçili dönem korunur.
  const keep = new URLSearchParams();
  if (range) keep.set("range", range);
  if (from) keep.set("from", from);
  if (to) keep.set("to", to);
  const suffix = keep.toString() ? `&${keep.toString()}` : "";

  const tabs = [
    { key: "ozet", label: "Genel Bakış", icon: BarChart3, active: !detail },
    { key: "detay", label: "Detaylı Raporlar", icon: Table2, active: detail },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="Kazanç istatistikleri, kârlılık, personel performansı ve dönüşüm analizi."
      >
        <NewExpenseButton />
      </PageHeader>

      <div className="overflow-x-auto">
        <nav
          aria-label="Rapor görünümü"
          className="inline-flex gap-1 rounded-[var(--radius-md)] bg-muted p-1"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={`/raporlar?sekme=${t.key}${suffix}`}
                aria-current={t.active ? "page" : undefined}
                className={cn(
                  "focus-ring flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors",
                  t.active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {detail ? <ReportsDetail /> : <ReportsOverview range={range} from={from} to={to} />}
    </div>
  );
}
