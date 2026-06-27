import { Sparkles, Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Premium "çok yakında" ekranı — entegrasyon gerektiren modüller için.
 * Bozuk/sahte değil; "yolda" hissi veren, ne sunacağını anlatan tasarım.
 */
export function ComingSoon({
  title,
  pageDescription,
  icon: Icon,
  tagline,
  description,
  features,
  accent = "from-primary/12 to-violet-500/10",
}: {
  title: string;
  pageDescription?: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  features: string[];
  accent?: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={pageDescription} />

      <Card className="overflow-hidden">
        <div className={cn("relative bg-gradient-to-br px-6 py-12 text-center", accent)}>
          <div
            className="absolute inset-0 opacity-[0.4] [background-image:radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:22px_22px]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-xl">
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-card text-primary shadow-soft">
              <Icon className="size-8" />
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
              <Sparkles className="size-3.5" />
              Çok Yakında
            </span>
            <h2 className="mt-3 text-xl font-bold">{tagline}</h2>
            <p className="mx-auto mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <CardContent className="p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bu modül açıldığında neler yapabileceksin
          </p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 rounded-lg border bg-card p-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-positive/12 text-positive">
                  <Check className="size-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Entegrasyon tamamlandığında bu ekran otomatik olarak aktifleşecek.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
