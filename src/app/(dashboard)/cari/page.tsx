import {
  Scale,
  TrendingDown,
  Banknote,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  name: string;
  charges: number;
  payments: number;
  balance: number;
};

export default async function CariPage() {
  const supabase = await createClient();

  const [customersRes, packagesRes, apptRes, paymentsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name")
      .eq("is_lead", false)
      .order("full_name"),
    supabase.from("packages").select("customer_id, price"),
    supabase
      .from("appointments")
      .select("customer_id, price, package_id")
      .eq("status", "completed")
      .not("price", "is", null),
    supabase.from("payments").select("customer_id, amount"),
  ]);

  const customers = (customersRes.data ?? []) as {
    id: string;
    full_name: string;
  }[];

  // Müşteri bazında borçlandırma ve tahsilat birikimi
  const charges = new Map<string, number>();
  const payments = new Map<string, number>();

  const addCharge = (id: string | null, amount: number) => {
    if (!id || !amount) return;
    charges.set(id, (charges.get(id) ?? 0) + amount);
  };

  // 1) Paket alımları → borçlandırma
  for (const p of (packagesRes.data ?? []) as {
    customer_id: string | null;
    price: number | null;
  }[]) {
    addCharge(p.customer_id, p.price ?? 0);
  }

  // 2) Pakete bağlı OLMAYAN tamamlanmış randevular → borçlandırma
  //    (pakete bağlı randevu zaten paket fiyatında sayıldı, çift saymayalım)
  for (const a of (apptRes.data ?? []) as {
    customer_id: string | null;
    price: number | null;
    package_id: string | null;
  }[]) {
    if (a.package_id) continue;
    addCharge(a.customer_id, a.price ?? 0);
  }

  // 3) Tüm tahsilatlar
  for (const pay of (paymentsRes.data ?? []) as {
    customer_id: string | null;
    amount: number | null;
  }[]) {
    if (!pay.customer_id) continue;
    payments.set(
      pay.customer_id,
      (payments.get(pay.customer_id) ?? 0) + (pay.amount ?? 0)
    );
  }

  const rows: Row[] = customers
    .map((c) => {
      const ch = charges.get(c.id) ?? 0;
      const pa = payments.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.full_name,
        charges: ch,
        payments: pa,
        balance: ch - pa,
      };
    })
    .filter((r) => r.charges !== 0 || r.payments !== 0)
    .sort((a, b) => b.balance - a.balance);

  const totalCharges = rows.reduce((s, r) => s + r.charges, 0);
  const totalPayments = rows.reduce((s, r) => s + r.payments, 0);
  const totalReceivable = rows.reduce(
    (s, r) => (r.balance > 0 ? s + r.balance : s),
    0
  );
  const debtorCount = rows.filter((r) => r.balance > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cari Hesap"
        description="Müşteri bazında borçlandırma, tahsilat ve kalan bakiye takibi."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Henüz cari hareket yok"
          description="Paket sattıkça, randevu tamamlandıkça ve tahsilat girdikçe müşterilerin bakiyeleri burada otomatik hesaplanacak."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Borçlandırma
                </CardTitle>
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingDown className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(totalCharges)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-positive">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Tahsilat
                </CardTitle>
                <span className="flex size-9 items-center justify-center rounded-lg bg-positive/10 text-positive">
                  <Banknote className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-positive">
                  {formatPrice(totalPayments)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-danger">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Alacak
                </CardTitle>
                <span className="flex size-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
                  <Wallet className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-danger">
                  {formatPrice(totalReceivable)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {debtorCount} borçlu müşteri
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Müşteri</TableHead>
                  <TableHead className="text-right">Borçlandırma</TableHead>
                  <TableHead className="text-right">Tahsilat</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="text-right">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const owes = r.balance > 0;
                  const credit = r.balance < 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(r.charges)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-positive">
                        {formatPrice(r.payments)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          owes && "text-danger",
                          credit && "text-primary"
                        )}
                      >
                        {formatPrice(Math.abs(r.balance))}
                      </TableCell>
                      <TableCell className="text-right">
                        {owes ? (
                          <Badge variant="danger">Borçlu</Badge>
                        ) : credit ? (
                          <Badge variant="info">Alacaklı</Badge>
                        ) : (
                          <Badge variant="positive">Kapalı</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Bakiye = (paket alımları + pakete bağlı olmayan tamamlanmış
            randevular) − toplam tahsilat. &quot;Alacaklı&quot;, müşterinin fazla/avans
            ödemesi olduğunu gösterir.
          </p>
        </>
      )}
    </div>
  );
}
