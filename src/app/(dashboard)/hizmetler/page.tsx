import { Scissors } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import type { Service } from "@/types/database";
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

import { NewServiceButton } from "./new-service-button";
import { ServiceRowActions } from "./service-row-actions";

export const metadata = { title: "Hizmetler" };

export default async function HizmetlerPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  const services = (data ?? []) as Service[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hizmetler"
        description="Sunduğun hizmetleri, sürelerini ve fiyatlarını yönet."
      >
        <NewServiceButton />
      </PageHeader>

      {services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Henüz hizmet yok"
          description="Sunduğun hizmetleri ekle; randevu oluştururken bu listeden seçebileceksin."
          action={<NewServiceButton />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Hizmet</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Süre</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
