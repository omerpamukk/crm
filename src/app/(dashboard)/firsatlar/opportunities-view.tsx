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
  CheckCheck,
  ExternalLink,
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
  /** 360 sayfası bağlantısı için gerçek müşteri id'si (varsa). */
  customerId?: string | null;
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

const firstName = (n: string) => n.split(" ")[0];

export function OpportunitiesView({ categories }: { categories: OppCategory[] }) {
  const [cat, setCat] = useState("all");
  const [sortBy, setSortBy] = useState<"urgent" | "value">("urgent");
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [openCatKey, setOpenCatKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [waItem, setWaItem] = useState<OppItem | null>(null);
  const [waText, setWaText] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("Merhaba {ad}, size özel bir fırsatımız var! 💜 Detaylar için bize ulaşabilirsiniz.");
  const [bulkRecipients, setBulkRecipients] = useState<OppItem[]>([]);
  const [bulkSent, setBulkSent] = useState<Set<string>>(new Set());

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

  function markManyContacted(ids: string[]) {
    if (ids.length === 0) return;
    setContacted((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelected(new Set());
    toast.success(`${ids.length} kişi iletişime geçildi olarak işaretlendi`);
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

  function openCatDrawer(key: string) {
    setOpenCatKey(key);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const prepared = useMemo(() => {
    return categories
      .map((c) => {
        let items = c.items.filter((i) => !contacted.has(i.id));
        if (sortBy === "value") {
          items = [...items].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
        }
        const removed = c.items.filter((i) => contacted.has(i.id)).length;
        const weight = items.reduce((s, i) => s + (i.value ?? 0), 0);
        return { ...c, visibleItems: items, liveCount: Math.max(c.count - removed, 0), weight };
      })
      .filter((c) => c.liveCount > 0 || c.visibleItems.length > 0);
  }, [categories, contacted, sortBy]);

  const filteredByCat = cat === "all" ? prepared : prepared.filter((c) => c.key === cat);
  const shown =
    sortBy === "value"
      ? [...filteredByCat].sort((a, b) => b.weight - a.weight)
      : filteredByCat;

  const summary = useMemo(() => {
    let firsat = 0, tahsil = 0, kisi = 0;
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
  const selectedItems = openCat ? openCat.visibleItems.filter((i) => selected.has(i.id)) : [];
  const allSelected = openCat ? openCat.visibleItems.length > 0 && selectedItems.length === openCat.visibleItems.length : false;

  function startBulkWa(recipients: OppItem[]) {
    if (recipients.length === 0) return;
    setBulkRecipients(recipients);
    setBulkSent(new Set());
    setBulkOpen(true);
  }

  function ContactRow({ item, catKey, selectable }: { item: OppItem; catKey: string; selectable?: boolean }) {
    const wa = waLink(item.phone, item.waMsg);
    const isSel = selected.has(item.id);
    return (
      <li className="flex items-center justify-between gap-2 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {selectable && (
            <button
              type="button"
              onClick={() => toggleSelect(item.id)}
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                isSel ? "border-primary bg-primary text-white" : "border-input bg-background hover:border-primary/50"
              )}
            >
              {isSel && <Check className="size-3.5" strokeWidth={3} />}
            </button>
          )}
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {item.name.slice(0, 2).toLocaleUpperCase("tr")}
          </span>
          {item.customerId ? (
            <Link href={`/musteriler/${item.customerId}`} className="truncate text-sm font-medium hover:text-primary hover:underline">{item.name}</Link>
          ) : (
            <span className="truncate text-sm font-medium">{item.name}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.meta && <span className="text-xs text-muted-foreground">{item.meta}</span>}
          {item.value != null && (
            <span className={cn("text-sm font-bold tabular-nums", catKey === "debt" ? "text-danger" : "text-positive")}>
              {formatPrice(item.value)}
            </span>
          )}
          {wa && (
            <button type="button" onClick={() => openWa(item)} title="WhatsApp ile yaz" className="flex size-7 items-center justify-center rounded-md bg-positive/10 text-positive transition-colors hover:bg-positive/20">
              <MessageCircle className="size-3.5" />
            </button>
          )}
          {item.call && item.phone && (
            <a href={`tel:${item.phone}`} onClick={() => markContacted(item.id, item.name)} title="Ara" className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20">
              <Phone className="size-3.5" />
            </a>
          )}
          <button type="button" onClick={() => markContacted(item.id, item.name)} title="İletişime geçildi olarak işaretle" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
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
            <div key={t.label} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-soft">
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
          Para potansiyeli yüksek müşteriler. <strong className="text-foreground">Tümünü gör</strong> ile kategoride
          toplu seçip <strong className="text-foreground">toplu WhatsApp</strong> gönderebilir veya{" "}
          <strong className="text-foreground">✓</strong> ile &quot;iletişime geçildi&quot; işaretleyebilirsin.
        </p>
      </div>

      {/* Araç çubuğu: sıralama (hem kart-içi hem kartlar-arası) + kategori */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sırala</span>
          <div className="flex items-center rounded-lg border bg-card p-0.5">
            <button type="button" onClick={() => setSortBy("urgent")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", sortBy === "urgent" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <ArrowUpDown className="size-3.5" /> En Acil
            </button>
            <button type="button" onClick={() => setSortBy("value")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", sortBy === "value" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <Coins className="size-3.5" /> En Yüksek Değer
            </button>
          </div>
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

      {/* Kartlar — masonry (eşit olmayan yükseklikler düzgün yerleşsin) */}
      <div className="gap-4 [column-fill:_balance] sm:columns-1 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {shown.map((c) => {
          const m = META[c.key];
          const Icon = m?.icon ?? Sparkles;
          return (
            <div key={c.key} className={cn("rounded-xl border border-l-4 bg-card p-5 shadow-soft transition-shadow hover:shadow-md", m?.bar)}>
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
                {c.liveCount >= 2 && (
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openCatDrawer(c.key)}>
                    <CheckCheck className="size-3.5" />
                    Tümü & Toplu ({c.liveCount})
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

      {/* Tümünü gör + toplu işlem drawer'ı */}
      <Dialog open={!!openCat} onOpenChange={(o) => !o && setOpenCatKey(null)}>
        <DialogContent className="max-h-[88svh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          {openCat && (
            <>
              <DialogHeader className="border-b px-5 py-4">
                <DialogTitle>{openCat.title}</DialogTitle>
                <DialogDescription>{openCat.subtitle}</DialogDescription>
              </DialogHeader>

              {/* Toplu işlem çubuğu */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelected(allSelected ? new Set() : new Set(openCat.visibleItems.map((i) => i.id)))}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <CheckCheck className="size-3.5" />
                  {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedItems.length} seçili</span>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={selectedItems.length === 0} onClick={() => startBulkWa(selectedItems)}>
                    <MessageCircle className="size-3.5" /> Toplu WA
                  </Button>
                  <Button size="sm" className="gap-1.5" disabled={selectedItems.length === 0} onClick={() => markManyContacted(selectedItems.map((i) => i.id))}>
                    <Check className="size-3.5" /> İşaretle
                  </Button>
                </div>
              </div>

              <div className="max-h-[55svh] overflow-y-auto px-5 py-2">
                {openCat.visibleItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-positive">Tüm kategori temizlendi ✓</p>
                ) : (
                  <ul className="divide-y">
                    {openCat.visibleItems.map((item) => (
                      <ContactRow key={item.id} item={item} catKey={openCat.key} selectable />
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-2 border-t bg-muted/30 px-5 py-3">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" disabled={openCat.visibleItems.length === 0} onClick={() => startBulkWa(openCat.visibleItems)}>
                  <MessageCircle className="size-3.5" /> Tümüne Toplu WA
                </Button>
                <Link href={openCat.footerHref} className={cn(buttonVariants({ size: "sm" }), "flex-1 gap-1.5")}>
                  {openCat.footerLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tekil WhatsApp mesaj düzenleme */}
      <Dialog open={!!waItem} onOpenChange={(o) => !o && setWaItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-4 text-positive" /> WhatsApp mesajı
            </DialogTitle>
            <DialogDescription>{waItem?.name} için mesajı düzenleyip gönder.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={waText} onChange={(e) => setWaText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWaItem(null)}>İptal</Button>
            <Button className="gap-1.5 bg-positive text-white hover:bg-positive/90" onClick={sendWa} disabled={!waItem?.phone}>
              <MessageCircle className="size-4" /> WhatsApp&apos;ta Aç
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toplu WhatsApp komposeri */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-h-[88svh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-4 text-positive" /> Toplu WhatsApp ({bulkRecipients.length} kişi)
            </DialogTitle>
            <DialogDescription>
              Mesajı bir kez yaz; <code className="rounded bg-muted px-1">{"{ad}"}</code> otomatik isimle değişir. Her kişi için &quot;Aç&quot;a bas (WhatsApp tek tek açılır).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-3">
            <Textarea rows={3} value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
            <div className="max-h-[40svh] space-y-1.5 overflow-y-auto">
              {bulkRecipients.map((r) => {
                const personal = bulkText.replace(/\{ad\}/g, firstName(r.name));
                const link = waLink(r.phone, personal);
                const sent = bulkSent.has(r.id);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <span className={cn("truncate text-sm", sent && "text-muted-foreground line-through")}>{r.name}</span>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          setBulkSent((prev) => new Set(prev).add(r.id));
                          setContacted((prev) => new Set(prev).add(r.id));
                        }}
                        className={cn(buttonVariants({ size: "sm", variant: sent ? "outline" : "default" }), "gap-1.5", !sent && "bg-positive text-white hover:bg-positive/90")}
                      >
                        {sent ? <Check className="size-3.5" /> : <ExternalLink className="size-3.5" />}
                        {sent ? "Açıldı" : "Aç"}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">telefon yok</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-5 py-3">
            <span className="text-xs text-muted-foreground">{bulkSent.size}/{bulkRecipients.length} açıldı</span>
            <Button size="sm" onClick={() => setBulkOpen(false)}>Kapat</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
