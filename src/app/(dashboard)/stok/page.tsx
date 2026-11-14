import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability, requireModule } from "@/lib/supabase/guard";

import { StockView, type StockProduct, type StockMovement } from "./stock-view";

export const metadata = { title: "Stok" };

type MovRow = {
  id: string;
  created_at: string;
  product_id: string;
  kind: StockMovement["kind"];
  qty: number;
  note: string | null;
  product: { name: string; unit: string } | { name: string; unit: string }[] | null;
};

export default async function StokPage() {
  await requireCapability("tahsilat");
  await requireModule("stok");
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <StockView products={[]} movements={[]} loadFailed />;

  const [productsRes, movementsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, category, unit, stock_qty, critical_level, cost_price, sale_price, is_active")
      .eq("business_id", businessId)
      .order("name"),
    supabase
      .from("stock_movements")
      .select("id, created_at, product_id, kind, qty, note, product:products(name, unit)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const products = ((productsRes.data ?? []) as StockProduct[]).map((p) => ({
    ...p,
    stock_qty: Number(p.stock_qty) || 0,
    critical_level: Number(p.critical_level) || 0,
    cost_price: p.cost_price != null ? Number(p.cost_price) : null,
    sale_price: p.sale_price != null ? Number(p.sale_price) : null,
  }));

  const movements: StockMovement[] = ((movementsRes.data ?? []) as unknown as MovRow[]).map((m) => {
    const prod = Array.isArray(m.product) ? (m.product[0] ?? null) : m.product;
    return {
      id: m.id,
      createdAt: m.created_at,
      productId: m.product_id,
      productName: prod?.name ?? "Silinmiş ürün",
      unit: prod?.unit ?? "adet",
      kind: m.kind,
      qty: Number(m.qty) || 0,
      note: m.note,
    };
  });

  return <StockView products={products} movements={movements} loadFailed={Boolean(productsRes.error || movementsRes.error)} />;
}
