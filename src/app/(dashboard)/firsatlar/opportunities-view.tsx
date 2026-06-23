"use client";

import { useMemo, useState } from "react";
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
  Check,
  Coins,
  Banknote,
  Users,
  ArrowUpDown,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StatusVariant } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [sortBy, setSortBy] = useState<"urgent" | "value">("urgent");
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [openCatKey, setOpenCatKey] = useState<string | null>(null);
  const [waItem, setWaItem] = useState<OppItem | null>(null);
  const [waText, setWaText] = useState("");

  function markContacted(id: string, name: string) {
    setContacted((prev) => new Set(prev).add(id));
    toast.success(`${name} · iletişime geçildi`, {
      action: {
        label: "Geri al",
        onClick: () =>
          setContacted((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          }),
      },
    });
  }

  function openWa(item: OppItem) {
    setWaItem(item);
    setWaText(item.waMsg);
  }

  function sendWa() {
    if (!waItem) return;
    const link = waLink(waItem.phone, waText);
    if (link) window.open(link, "_blank", "noreferrer");
    markContacted(waItem.id, waItem.name);
    setWaItem(null);
  }

  // Görünür (iletişime geçilmemiş) + sıralı öğeler
  const prepared = useMemo(() => {
    return categories
      .map((c) => {
        let items = c.items.filter((i) => !contacted.has(i.id));
        if (sortBy === "value") {
          items = [...items].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
        }
        const removed = c.items.filter((i) => contacted.has(i.id)).length;
        return { ...c, visibleItems: items, liveCount: Math.max(c.count - removed, 0) };
      })
      .filter((c) => c.liveCount > 0 || c.visibleItems.length > 0);
  }, [categories, contacted, sortBy]);

  const shown = cat === "all" ? prepared : prepared.filter((c) => c.key === cat);

  // Özet
  const summary = useMemo(() => {
    let firsat = 0;
    let tahsil = 0;
    let kisi = 0;
    for (const c of prepared) {
      kisi += c.liveCount;
      for (const i of c.visibleItems) {
        if (c.key === "debt") tahsil += i.value ?? 0;
        else firsat += i.value ?? 0;
      }
    }
    return { firsat, tahsil, kisi };
  }, [prepared]);

  if (categories.every((c) => c.count === 0)) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Şu an öne çıkan bir fırsat yok"
        description="Müşteri, randevu, paket ve tahsilat verilerin arttıkça fırsatlar burada otomatik listelenecek."
      />
    );
  }

  const openCat = prepared.find((c) => c.key === openCatKey) ?? null;

  function ContactRow({ item, catKey }: { item: OppItem; catKey: string }) {
    const wa = waLink(item.phone, item.waMsg);
    return (
      <li className="flex items-center justify-between gap-2 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {item.name.slice(0, 2).toLocaleUpperCase("tr")}
          </span>
          <span className="truncate text-sm font-medium">{item.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.meta && <span className="text-xs text-muted-foreground">{item.meta}</span>}
          {item.value != null && (
            <span className={cn("text-sm font-bold tabular-nums", catKey === "debt" ? "text-danger" : "text-positive")}>
              {formatPrice(item.value)}
            </span>
          )}
          {wa && (
            <button
              type="button"
              onClick={() => openWa(item)}
              title="WhatsApp ile yaz"
              className="flex size-7 items-center justify-center rounded-md bg-positive/10 text-positive transition-colors hover:bg-positive/20"
            >
              <MessageCircle className="size-3.5" />
            </button>
          )}
          {item.call && item.phone && (
            <a
              href={`tel:${item.phone}`}
              onClick={() => markContacted(item.id, item.name)}
              title="Ara"
              className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            >
              <Phone className="size-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => markContacted(item.id, item.name)}
            title="İletişime geçildi olarak işaretle"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Check className="size-3.5" />
          </button>
        </div>
      </li>
    );
  }

  const summaryTiles = [
    { label: "Toplam Fırsat Değeri", value: formatPrice(summary.firsat), icon: Coins, tone: "bg-positive/10 text-positive" },
    { label: "Tahsil Edilecek", value: formatPrice(summary.tahsil), icon: Banknote, tone: "bg-danger/10 text-danger" },
    { label: "Toplam Kişi", value: summary.kisi.toLocaleString("tr-TR"), icon: Users, tone: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="space-y-4">
      {/* Özet şeridi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryTiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", t.tone)}>
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className="text-xl font-bold tracking-tight">{t.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bilgi bandı */}
      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 text-sm">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Para kazanma potansiyeli yüksek müşteriler. Her satırda{" "}
          <strong className="text-foreground">WhatsApp</strong> /{" "}
          <strong className="text-foreground">Ara</strong> ile ulaş, ardından{" "}
          <strong className="text-foreground">✓</strong> ile &quot;iletişime geçildi&quot; işaretle — liste küçülsün.
        </p>
      </div>

      {/* Araç çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center rounded-lg border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setSortBy("urgent")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", sortBy === "urgent" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            <ArrowUpDown className="size-3.5" /> En Acil
          </button>
          <button
            type="button"
            onClick={() => setSortBy("value")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", sortBy === "value" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            <Coins className="size-3.5" /> En Yüksek Değer
          </button>
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {prepared.map((c) => (
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
            <div key={c.key} className={cn("rounded-xl border border-l-4 bg-card p-5 shadow-xs transition-shadow hover:shadow-md", m?.bar)}>
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
                <Badge variant={m?.badge ?? "secondary"}>{c.liveCount} kişi</Badge>
              </div>

              {c.visibleItems.length === 0 ? (
                <p className="py-4 text-center text-sm text-positive">Bu kategori temizlendi ✓</p>
              ) : (
                <ul className="divide-y">
                  {c.visibleItems.slice(0, 3).map((item) => (
                    <ContactRow key={item.id} item={item} catKey={c.key} />
                  ))}
                </ul>
              )}

              <div className="mt-3 flex items-center gap-2">
                {c.liveCount > 3 && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpenCatKey(c.key)}>
                    Tümünü gör ({c.liveCount})
                  </Button>
                )}
                <Link href={c.footerHref} className={cn(buttonVariants({ size: "sm" }), "flex-1 gap-1.5")}>
                  {c.footerLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tümünü gör — kategori drawer'ı */}
      <Dialog open={!!openCat} onOpenChange={(o) => !o && setOpenCatKey(null)}>
        <DialogContent className="max-h-[85svh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          {openCat && (
            <>
              <DialogHeader className="border-b px-5 py-4">
                <DialogTitle>{openCat.title}</DialogTitle>
                <DialogDescription>{openCat.subtitle}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60svh] overflow-y-auto px-5 py-2">
                {openCat.visibleItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-positive">Tüm kategori temizlendi ✓</p>
                ) : (
                  <ul className="divide-y">
                    {openCat.visibleItems.map((item) => (
                      <ContactRow key={item.id} item={item} catKey={openCat.key} />
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t bg-muted/30 px-5 py-3">
                <Link href={openCat.footerHref} className={cn(buttonVariants({ size: "sm" }), "w-full gap-1.5")}>
                  {openCat.footerLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp mesaj düzenleme */}
      <Dialog open={!!waItem} onOpenChange={(o) => !o && setWaItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-4 text-positive" />
              WhatsApp mesajı
            </DialogTitle>
            <DialogDescription>
              {waItem?.name} için mesajı düzenleyip gönderebilirsin.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={waText} onChange={(e) => setWaText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWaItem(null)}>İptal</Button>
            <Button
              className="gap-1.5 bg-positive text-white hover:bg-positive/90"
              onClick={sendWa}
              disabled={!waItem?.phone}
            >
              <MessageCircle className="size-4" />
              WhatsApp&apos;ta Aç
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
