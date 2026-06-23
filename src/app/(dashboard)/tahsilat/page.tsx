import { Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { paymentMethodLabel, paymentMethodVariant } from "@/lib/constants";
import type { Payment } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { NewPaymentButton } from "./new-payment-button";

type PaymentRow = Payment & { customer: { full_name: string } | null };

const RELATED_LABEL: Record<string, string> = {
  paket: "Paket",
  randevu: "Randevu",
  diger: "Diğer",
};

export default async function TahsilatPage() {
  const supabase = await createClient();

  const [paymentsRes, customersRes, packagesRes] = await Promise.all([
    supabase
      .from("payments")
      .select("*, customer:customers(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, full_name")
      .eq("is_lead", false)
      .order("full_name"),
    supabase.from("packages").select("id, customer_id, service_name"),
  ]);

  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];
  const customers = customersRes.data ?? [];
  const packages = packagesRes.data ?? [];

  // Bu ay / bu hafta toplamları
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  let monthTotal = 0;
  let weekTotal = 0;
  for (const p of payments) {
    const t = new Date(p.created_at).getTime();
    if (t >= startOfMonth.getTime()) monthTotal += p.amount ?? 0;
    if (t >= startOfWeek.getTime()) weekTotal += p.amount ?? 0;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tahsilat"
        description="Tüm ödeme/gelir kayıtların ve dönemsel tahsilat özetin."
      >
        <NewPaymentButton customers={customers} packages={packages} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
        <Card className="border-l-4 border-l-positive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay Toplam Tahsilat
            </CardTitle>
            <Wallet className="size-4 text-positive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-positive">
              {formatPrice(monthTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Hafta
            </CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(weekTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Henüz tahsilat kaydı yok"
          description="“Ödeme al” ile ilk tahsilatını kaydet; pakete bağlarsan paketin ödeme durumu otomatik güncellenir."
          action={
            customers.length > 0 ? (
              <NewPaymentButton customers={customers} packages={packages} />
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Yöntem</TableHead>
                <TableHead>İlişkili</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.customer?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium text-positive">
                    {formatPrice(p.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={paymentMethodVariant(p.method)}>
                      {paymentMethodLabel(p.method)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.related_type ? RELATED_LABEL[p.related_type] ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {p.note ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
