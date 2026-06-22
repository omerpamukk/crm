import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import type { Service } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { NewServiceButton } from "./new-service-button";
import { ServiceRowActions } from "./service-row-actions";

export default async function HizmetlerPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  const services = (data ?? []) as Service[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hizmetler</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {services.length} kayıt
          </p>
        </div>
        <NewServiceButton />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hizmet</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Süre</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Henüz hizmet yok. “Yeni hizmet” ile ekleyin.
                </TableCell>
              </TableRow>
            ) : (
              services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.category ?? "—"}</TableCell>
                  <TableCell>
                    {s.duration_min ? `${s.duration_min} dk` : "—"}
                  </TableCell>
                  <TableCell>{formatPrice(s.price)}</TableCell>
                  <TableCell>
                    <ServiceRowActions service={s} />
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
