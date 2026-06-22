import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import type { Package } from "@/types/database";
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

type PackageRow = Package & {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Paketler</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {packages.length} kayıt
          </p>
        </div>
        <NewPackageButton customers={customers} />
      </div>

      {customers.length === 0 && (
        <p className="rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">
          Paket oluşturabilmek için önce en az bir müşteri eklemelisiniz.
        </p>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Müşteri</TableHead>
              <TableHead>Paket</TableHead>
              <TableHead>Kalan / Toplam</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Satın alma</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Henüz paket yok. “Yeni paket” ile ekleyin.
                </TableCell>
              </TableRow>
            ) : (
              packages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.customer?.full_name ?? "—"}
                  </TableCell>
                  <TableCell>{p.service_name ?? "—"}</TableCell>
                  <TableCell>
                    {p.remaining_sessions ?? "—"} / {p.total_sessions ?? "—"}
                  </TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.purchased_at)}
                  </TableCell>
                  <TableCell>
                    <PackageRowActions pkg={p} customers={customers} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
