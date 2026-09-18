import { Check, type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * "Çok yakında" ekranı — entegrasyon gerektiren modüller için.
 * Bozuk/sahte değil; ne sunacağını sakin bir dille anlatır.
 */
export function ComingSoon({
  title,
  pageDescription,
  icon: Icon,
  tagline,
  description,
  features,
}: {
  title: string;
  pageDescription?: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={pageDescription} />

      <Card>
        <CardContent className="space-y-6 py-2">
          <div className="flex items-start gap-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">{tagline}</h2>
                <span className="rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Yakında
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="border-t pt-5">
            <p className="section-label">Bu modül açıldığında</p>
            <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
