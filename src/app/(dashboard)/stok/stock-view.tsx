"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Coins,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createProduct, updateProduct, deleteProduct, addMovement } from "./actions";
import { UNITS, type ProductInput } from "./schema";

export interface StockProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  stock_qty: number;
  critical_level: number;
  cost_price: number | null;
  sale_price: number | null;
  is_active: boolean;
}

export interface StockMovement {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  unit: string;
  kind: "in" | "out" | "adjust" | "consume";
  qty: number;
  note: string | null;
}

const MOVEMENT_LABEL: Record<StockMovement["kind"], { label: string; tone: string }> = {
  in: { label: "Giriş", tone: "bg-positive/12 text-positive" },
  out: { label: "Çıkış", tone: "bg-danger/12 text-danger" },
  adjust: { label: "Sayım", tone: "bg-primary/10 text-primary" },
  consume: { label: "Seansta kullanıldı", tone: "bg-warning/12 text-amber-600" },
};

/** Stok durumu: kritik seviyeye göre. */
function statusOf(p: StockProduct): { label: string; tone: string } {
  if (p.stock_qty <= 0) return { label: "Tükendi", tone: "bg-danger/12 text-danger" };
  if (p.critical_level > 0 && p.stock_qty <= p.critical_level)
    return { label: "Kritik", tone: "bg-danger/12 text-danger" };
  if (p.critical_level > 0 && p.stock_qty <= p.critical_level * 2)
    return { label: "Az", tone: "bg-warning/12 text-amber-600" };
  return { label: "Yeterli", tone: "bg-positive/12 text-positive" };
}

const EMPTY: ProductInput = {
  name: "",
  sku: "",
  category: "",
  unit: "adet",
  stock_qty: "",
  critical_level: "",
  cost_price: "",
  sale_price: "",
  is_active: true,
};

export function StockView({
  products,
  movements,
}: {
  products: StockProduct[];
  movements: StockMovement[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockProduct | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY);

  const [movOpen, setMovOpen] = useState<{ product: StockProduct; kind: "in" | "out" } | null>(null);
  const [movQty, setMovQty] = useState("");
  const [movNote, setMovNote] = useState("");

  const [confirmDel, setConfirmDel] = useState<StockProduct | null>(null);

  function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(okMsg);
      router.refresh();
    });
  }

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))] as string[],
    [products]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return products.filter((p) => {
      if (needle) {
        const hay = `${p.name} ${p.sku ?? ""}`.toLocaleLowerCase("tr");
        if (!hay.includes(needle)) return false;
      }
      if (category !== "all" && p.category !== category) return false;
      if (status !== "all" && statusOf(p).label !== status) return false;
      return true;
    });
  }, [products, q, category, status]);

  const stats = useMemo(() => {
    const totalValue = products.reduce(
      (sum, p) => sum + p.stock_qty * (p.cost_price ?? 0),
      0
    );
    const critical = products.filter(
      (p) => p.stock_qty <= 0 || (p.critical_level > 0 && p.stock_qty <= p.critical_level)
    ).length;
    const monthOut = movements
      .filter((m) => (m.kind === "out" || m.kind === "consume"))
      .reduce((sum, m) => sum + m.qty, 0);
    return { totalValue, critical, monthOut };
  }, [products, movements]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function openEdit(p: StockProduct) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      category: p.category ?? "",
      unit: p.unit,
      stock_qty: "",
      critical_level: String(p.critical_level ?? ""),
      cost_price: p.cost_price != null ? String(p.cost_price) : "",
      sale_price: p.sale_price != null ? String(p.sale_price) : "",
      is_active: p.is_active,
    });
    setFormOpen(true);
  }

  function saveProduct() {
    if (!form.name.trim()) return;
    setFormOpen(false);
    if (editing) {
      run(() => updateProduct(editing.id, form), "Ürün güncellendi");
    } else {
      run(() => createProduct(form), "Ürün eklendi");
    }
  }

  function saveMovement() {
    if (!movOpen || !movQty.trim()) return;
    const { product, kind } = movOpen;
    setMovOpen(null);
    setMovQty("");
    setMovNote("");
    run(
      () => addMovement({ product_id: product.id, kind, qty: movQty, note: movNote }),
      kind === "in" ? "Stok girişi kaydedildi" : "Stok çıkışı kaydedildi"
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok"
        description="Ürün ve malzemeleri takip et; kritik seviyeye düşenleri anında gör."
      >
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Ürün Ekle
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Toplam Ürün" value={String(products.length)} icon={Boxes} sub={`${categories.length} kategori`} />
        <StatCard label="Stok Değeri" value={formatPrice(stats.totalValue)} icon={Coins} hint="Alış fiyatı × miktar" />
        <StatCard
          label="Kritik Stok"
          value={String(stats.critical)}
          icon={AlertTriangle}
          accent={stats.critical > 0 ? "text-danger" : undefined}
          sub={stats.critical > 0 ? "Sipariş gerekiyor" : "Sorun yok"}
        />
        <StatCard label="Son Çıkışlar" value={String(stats.monthOut)} icon={ShoppingCart} sub="Son 30 hareket" />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Henüz ürün yok"
          description="Kullandığın malzeme ve satılan ürünleri ekle; stok otomatik takip edilsin."
          action={<Button onClick={openNew}><Plus className="size-4" />Ürün Ekle</Button>}
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Ürünler</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ürün veya kod ara…"
                className="h-9 w-44"
                aria-label="Ürün ara"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Kategori filtresi"
                className="h-9 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm"
              >
                <option value="all">Tüm kategoriler</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Durum filtresi"
                className="h-9 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm"
              >
                <option value="all">Tüm durumlar</option>
                <option value="Kritik">Kritik</option>
                <option value="Az">Az</option>
                <option value="Yeterli">Yeterli</option>
                <option value="Tükendi">Tükendi</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Bu filtrede ürün yok.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Ürün</TableHead>
                    <TableHead className="hidden sm:table-cell">Kod</TableHead>
                    <TableHead className="hidden md:table-cell">Kategori</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Değer</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const st = statusOf(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{p.sku ?? "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{p.category ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {p.stock_qty} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium", st.tone)}>
                            {st.label}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right tabular-nums text-muted-foreground">
                          {p.cost_price ? formatPrice(p.stock_qty * p.cost_price) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon-sm" variant="outline" aria-label="Stok girişi" title="Stok girişi" onClick={() => { setMovOpen({ product: p, kind: "in" }); setMovQty(""); setMovNote(""); }}>
                              <ArrowDownToLine className="size-3.5" />
                            </Button>
                            <Button size="icon-sm" variant="outline" aria-label="Stok çıkışı" title="Stok çıkışı" onClick={() => { setMovOpen({ product: p, kind: "out" }); setMovQty(""); setMovNote(""); }}>
                              <ArrowUpFromLine className="size-3.5" />
                            </Button>
                            <Button size="icon-sm" variant="outline" aria-label="Düzenle" title="Düzenle" onClick={() => openEdit(p)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button size="icon-sm" variant="outline" aria-label="Sil" title="Sil" onClick={() => setConfirmDel(p)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" />
              Son Hareketler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="row-list">
              {movements.map((m) => {
                const meta = MOVEMENT_LABEL[m.kind];
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </span>
                    <Badge className={cn("shrink-0", meta.tone)}>{meta.label}</Badge>
                    <span className="flex-1 font-medium">{m.productName}</span>
                    <span className="tabular-nums font-semibold">
                      {m.kind === "in" ? "+" : m.kind === "adjust" ? "=" : "−"}{m.qty} {m.unit}
                    </span>
                    {m.note && <span className="w-full text-xs text-muted-foreground sm:w-auto">{m.note}</span>}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Ürün ekle / düzenle */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Ürünü Düzenle" : "Yeni Ürün"}</DialogTitle>
            <DialogDescription>
              {editing ? "Bilgileri güncelle. Stok miktarı hareketlerle değişir." : "Ürün bilgilerini gir."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Ürün Adı</Label>
              <Input id="p-name" autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">Kod</Label>
                <Input id="p-sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="CBK001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-cat">Kategori</Label>
                <Input id="p-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="güzellik" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-unit">Birim</Label>
                <select id="p-unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="h-9 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-crit">Kritik Seviye</Label>
                <Input id="p-crit" inputMode="decimal" value={form.critical_level} onChange={(e) => setForm((f) => ({ ...f, critical_level: e.target.value }))} placeholder="3" />
              </div>
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="p-qty">Açılış Stoğu</Label>
                <Input id="p-qty" inputMode="decimal" value={form.stock_qty} onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))} placeholder="0" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-cost">Alış Fiyatı</Label>
                <Input id="p-cost" inputMode="decimal" value={form.cost_price} onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sale">Satış Fiyatı</Label>
                <Input id="p-sale" inputMode="decimal" value={form.sale_price} onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))} placeholder="0" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button onClick={saveProduct} disabled={!form.name.trim() || pending}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stok hareketi */}
      <Dialog open={!!movOpen} onOpenChange={(o) => !o && setMovOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{movOpen?.kind === "in" ? "Stok Girişi" : "Stok Çıkışı"}</DialogTitle>
            <DialogDescription>{movOpen?.product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-qty">Miktar ({movOpen?.product.unit})</Label>
              <Input id="m-qty" autoFocus inputMode="decimal" value={movQty} onChange={(e) => setMovQty(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-note">Not</Label>
              <Input id="m-note" value={movNote} onChange={(e) => setMovNote(e.target.value)} placeholder="Opsiyonel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovOpen(null)}>İptal</Button>
            <Button onClick={saveMovement} disabled={!movQty.trim() || pending}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme onayı */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ürün silinsin mi?</DialogTitle>
            <DialogDescription>
              <b>{confirmDel?.name}</b> ve tüm stok hareketleri kalıcı olarak silinecek.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Vazgeç</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const p = confirmDel;
                setConfirmDel(null);
                if (p) run(() => deleteProduct(p.id), "Ürün silindi");
              }}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
