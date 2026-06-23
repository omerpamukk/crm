"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock3,
  PackageX,
  CalendarX2,
  MessageCircleQuestion,
  Cake,
  RefreshCw,
  Wallet,
  MessageCircle,
  Phone,
  ArrowRight,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StatusVariant } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type OppItem = {
  id: string;
  name: string;
  phone: string | null;
  meta: string;
  value: number | null;
  waMsg: string;
  call: boolean;
};

export type OppCategory = {
  key: string;
  title: string;
  subtitle: string;
  count: number;
  items: OppItem[];
  footerHref: string;
  footerLabel: string;
};

const META: Record<string, { icon: LucideIcon; bar: string; iconCls: string; badge: StatusVariant }> = {
  inactive: { icon: Clock3, bar: "border-l-danger", iconCls: "bg-danger/10 text-danger", badge: "danger" },
  ending: { icon: PackageX, bar: "border-l-warning", iconCls: "bg-warning/12 text-amber-600", badge: "warning" },
  noshow: { icon: CalendarX2, bar: "border-l-violet-500", iconCls: "bg-violet-500/10 text-violet-600", badge: "info" },
  teklif: { icon: FileText, bar: "border-l-sky-500", iconCls: "bg-sky-500/10 text-sky-600", badge: "info" },
  ongorusme: { icon: MessageCircleQuestion, bar: "border-l-pink-500", iconCls: "bg-pink-500/10 text-pink-600", badge: "danger" },
  birthday: { icon: Cake, bar: "border-l-positive", iconCls: "bg-positive/10 text-positive", badge: "positive" },
  periodic: { icon: RefreshCw, bar: "border-l-primary", iconCls: "bg-primary/10 text-primary", badge: "info" },
  debt: { icon: Wallet, bar: "border-l-danger", iconCls: "bg-danger/10 text-danger", badge: "danger" },
};

function waLink(phone: string | null, msg: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let p = digits;
  if (p.startsWith("0")) p = "90" + p.slice(1);
  else if (!p.startsWith("90")) p = "90" + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}

export function OpportunitiesView({ categories }: { categories: OppCategory[] }) {
  const [cat, setCat] = useState("all");
  const visible = categories.filter((c) => c.count > 0);
  const shown = cat === "all" ? visible : visible.filter((c) => c.key === cat);

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Şu an öne çıkan bir fırsat yok"
        description="Müşteri, randevu, paket ve tahsilat verilerin arttıkça geri kazanım, yenileme, doğum günü ve tahsilat fırsatları burada otomatik listelenecek."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Bilgi bandı */}
      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 text-sm">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Bu panel, para kazanma potansiyeli yüksek müşterileri otomatik tespit eder.
          Her satırda <strong className="text-foreground">WhatsApp</strong> veya{" "}
          <strong className="text-foreground">Ara</strong> ile tek tıkla ulaşabilirsin.
        </p>
      </div>

      {/* Kategori filtresi */}
      <div className="flex items-center justify-end">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {visible.map((c) => (
              <SelectItem key={c.key} value={c.key}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {shown.map((c) => {
          const m = META[c.key];
          const Icon = m?.icon ?? Sparkles;
          return (
            <div key={c.key} className={cn("rounded-xl border border-l-4 bg-card p-5 shadow-xs", m?.bar)}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", m?.iconCls)}>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold leading-tight">{c.title}</h3>
                    <p className="text-xs text-muted-foreground">{c.subtitle}</p>
                  </div>
                </div>
                <Badge variant={m?.badge ?? "secondary"}>{c.count} kişi</Badge>
              </div>

              <ul className="divide-y">
                {c.items.slice(0, 3).map((item) => {
                  const wa = waLink(item.phone, item.waMsg);
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                          {item.name.slice(0, 2).toLocaleUpperCase("tr")}
                        </span>
                        <span className="truncate text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.meta}</span>
                        {item.value != null && (
                          <span className="text-sm font-semibold tabular-nums">{formatPrice(item.value)}</span>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp ile yaz"
                            className="flex size-7 items-center justify-center rounded-md bg-positive/10 text-positive transition-colors hover:bg-positive/20"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                        )}
                        {item.call && item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            title="Ara"
                            className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          >
                            <Phone className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {c.count > 3 && (
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  +{c.count - 3} kişi daha
                </p>
              )}

              <div className="mt-3">
                <Link
                  href={c.footerHref}
                  className={cn(buttonVariants({ size: "sm" }), "w-full gap-1.5")}
                >
                  {c.footerLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
