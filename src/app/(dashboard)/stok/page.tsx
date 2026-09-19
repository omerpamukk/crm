import { createClient } from "@/lib/supabase/server";

import { StockView, type StockProduct, type StockMovement } from "./stock-view";

export const metadata = { title: "Stok" };

export default async function StokPage() {
  const supabase = await createClient();

  const [productsRes, movementsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, category, unit, stock_qty, critical_level, cost_price, sale_price, is_active")
      .order("name"),
    supabase
      .from("stock_movements")
      .select("id, created_at, product_id, kind, qty, note, product:products(name, unit)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const products = (productsRes.data ?? []) as StockProduct[];

  type MovRow = {
    id: string; created_at: string; product_id: string;
    kind: StockMovement["kind"]; qty: number; note: string | null;
    product: { name: string; unit: string } | null;
  };

  const movements: StockMovement[] = ((movementsRes.data ?? []) as unknown as MovRow[]).map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    productId: m.product_id,
    productName: m.product?.name ?? "—",
    unit: m.product?.unit ?? "adet",
    kind: m.kind,
    qty: m.qty,
    note: m.note,
  }));

  return <StockView products={products} movements={movements} />;
}
