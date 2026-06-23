import { Package } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import {
  derivePaymentStatus,
  paymentStatusLabel,
  paymentStatusVariant,
} from "@/lib/constants";
import type { Package as PackageType } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { NewPackageButton } from "./new-package-button";
import { PackageRowActions } from "./package-row-actions";

type PackageRow = PackageType & {
  customer: { full_name: string } | null;
};

export default async function PaketlerPage() {
  const supabase = await createClient();

  const [packagesRes, customersRes] = await Promise.all([
    supabase
      .from("packages")
      .select("*, customer:customers(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id, full_name").order("full_name"),
  ]);

  const packages = (packagesRes.data ?? []) as unknown as PackageRow[];
  const customers = customersRes.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paketler"
        description="Müşterilere tanımlı seans paketlerini ve kalan haklarını takip et."
      >
        <NewPackageButton customers={customers} />
      </PageHeader>

      {customers.length === 0 && packages.length === 0 && (
        <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
          Paket oluşturabilmek için önce en az bir müşteri eklemelisiniz.
        </p>
      )}

      {packages.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Henüz paket yok"
          description="Müşterilere seans paketleri tanımla; kalan seansları buradan takip edebilirsin."
          action={
            customers.length > 0 ? (
              <NewPackageButton customers={customers} />
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Müşteri</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Kalan / Toplam</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead>Ödeme</TableHead>
                <TableHead>Kalan Borç</TableHead>
                <TableHead>Satın alma</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.customer?.full_name ?? "—"}
                  </TableCell>
                  <TableCell>{p.service_name ?? "—"}</TableCell>
                  <TableCell>
                    {p.remaining_sessions ?? "—"} / {p.total_sessions ?? "—"}
                  </TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    {(() => {
                      const st = derivePaymentStatus(p.price, p.paid_amount);
                      return (
                        <Badge variant={paymentStatusVariant(st)}>
                          {paymentStatusLabel(st)}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {p.price != null && p.price - (p.paid_amount ?? 0) > 0 ? (
                      <span className="font-medium text-danger">
                        {formatPrice(p.price - (p.paid_amount ?? 0))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.purchased_at)}
                  </TableCell>
                  <TableCell>
                    <PackageRowActions pkg={p} customers={customers} />
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
