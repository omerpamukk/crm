"use client";

import { useMemo, useState } from "react";
import { Boxes, Coins, AlertTriangle, ShoppingCart, Plus, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

type Status = "Yeterli" | "Az" | "Kritik";
type Product = { id: string; name: string; code: string; category: string; stock: number; value: number; status: Status };

const PRODUCTS: Product[] = [
  { id: "1", name: "Cilt Bakım Kremi", code: "CBK001", category: "güzellik", stock: 7, value: 630, status: "Yeterli" },
  { id: "2", name: "Dezenfektan 1L", code: "DZN001", category: "genel", stock: 10, value: 250, status: "Yeterli" },
  { id: "3", name: "Lazer Jel", code: "LZJ001", category: "güzellik", stock: 1, value: 120, status: "Kritik" },
  { id: "4", name: "Havlu (10'lu paket)", code: "HVL001", category: "temizlik", stock: 4, value: 200, status: "Az" },
  { id: "5", name: "Tek Kullanımlık Eldiven", code: "ELD001", category: "genel", stock: 24, value: 480, status: "Yeterli" },
  { id: "6", name: "Saç Maskesi", code: "SCM001", category: "güzellik", stock: 2, value: 360, status: "Kritik" },
  { id: "7", name: "Peeling Solüsyonu", code: "PLS001", category: "güzellik", stock: 6, value: 540, status: "Az" },
];

const KPIS = [
  { label: "Toplam Ürün", value: "23", icon: Boxes, tone: "bg-primary/10 text-primary", bar: "border-l-primary", sub: "8 kategori", subTone: "text-muted-foreground" },
  { label: "Stok Değeri", value: "₺11.050", icon: Coins, tone: "bg-positive/10 text-positive", bar: "border-l-positive", sub: "+₺420", subTone: "text-positive", up: true },
  { label: "Kritik Stok", value: "3", icon: AlertTriangle, tone: "bg-danger/10 text-danger", bar: "border-l-danger", sub: "Sipariş gerekiyor", subTone: "text-danger" },
  { label: "Bu Ay Tüketim", value: "₺300", icon: ShoppingCart, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", sub: "-₺80", subTone: "text-danger", down: true },
];

const STATUS_TONE: Record<Status, string> = {
  Yeterli: "bg-positive/12 text-positive",
  Az: "bg-warning/12 text-amber-600",
  Kritik: "bg-danger/12 text-danger",
};

const CAT_TONE: Record<string, string> = {
  güzellik: "bg-pink-100 text-pink-700",
  genel: "bg-blue-100 text-blue-700",
  temizlik: "bg-green-100 text-green-700",
};

export default function StokPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");

  const categories = [...new Set(PRODUCTS.map((p) => p.category))];

  const filtered = useMemo(
    () =>
      PRODUCTS.filter(
        (p) =>
          (cat === "all" || p.category === cat) &&
          (status === "all" || p.status === status) &&
          (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase()))
      ),
    [q, cat, status]
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Stok Yönetimi" description="Ürün stoklarını, kritik seviyeleri ve tüketimi takip et.">
        <Button onClick={() => toast.info("Ürün ekleme yakında.")}>
          <Plus className="size-4" />
          Ürün Ekle
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => {
          return (
            <div key={k.label} className="surface p-5">
                              <p className="section-label">{k.label}</p>
                              <p className="metric-value mt-2">{k.value}</p>
                              <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", k.subTone)}>
                  {k.up && <TrendingUp className="size-3" />}
                  {k.down && <TrendingDown className="size-3" />}
                  {k.sub}
                </p>
                            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {/* Filtreler */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ürün ara..."
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="all">Tüm Kategoriler</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="all">Tüm Durumlar</option>
              <option value="Yeterli">Yeterli</option>
              <option value="Az">Az</option>
              <option value="Kritik">Kritik</option>
            </select>
          </div>

          {/* Tablo */}
          <div className="overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[2fr_1fr_0.8fr_0.8fr_0.9fr_auto] gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Ürün</span><span>Kategori</span><span>Stok</span><span>Değer</span><span>Durum</span><span className="text-right">İşlem</span>
            </div>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sonuç bulunamadı.</p>
            ) : (
              <ul className="divide-y">
                {filtered.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[2fr_1fr_0.8fr_0.8fr_0.9fr_auto] sm:items-center sm:gap-3",
                      p.status === "Kritik" && "bg-danger/[0.04]"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.code}</p>
                    </div>
                    <span><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", CAT_TONE[p.category] ?? "bg-muted text-muted-foreground")}>{p.category}</span></span>
                    <span className={cn("text-sm font-medium", p.status === "Kritik" && "text-danger")}>{p.stock} adet</span>
                    <span className="text-sm text-muted-foreground">₺{p.value.toLocaleString("tr-TR")}</span>
                    <span><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[p.status])}>{p.status}</span></span>
                    <span className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => toast.info(`“${p.name}” düzenleme yakında.`)}><Pencil className="size-3.5" />Düzenle</Button>
                      {p.status === "Kritik" && (
                        <Button size="sm" className="bg-danger text-white hover:bg-danger/90" onClick={() => toast.success(`“${p.name}” siparişi oluşturuldu (demo).`)}>
                          <ShoppingCart className="size-3.5" />Sipariş
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
