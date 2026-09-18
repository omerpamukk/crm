import { UserCog, Phone, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/types/database";
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

import { NewStaffButton } from "./new-staff-button";
import { StaffRowActions } from "./staff-row-actions";

export default async function PersonelPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("*")
    .order("is_active", { ascending: false })
    .order("full_name");
  const staff = (data ?? []) as Staff[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personel"
        description="Çalışanlarını, ünvanlarını ve komisyon oranlarını yönet."
      >
        <NewStaffButton />
      </PageHeader>

      {staff.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Henüz personel yok"
          description="Çalışanlarını ekle; randevu oluştururken personel atayabilir ve performanslarını takip edebilirsin."
          action={<NewStaffButton />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Ad soyad</TableHead>
                <TableHead>Ünvan</TableHead>
                <TableHead>İletişim</TableHead>
                <TableHead className="text-right">Komisyon</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.title ?? "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {s.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="size-3" />
                          {s.phone}
                        </p>
                      )}
                      {s.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="size-3" />
                          {s.email}
                        </p>
                      )}
                      {!s.phone && !s.email && "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.commission_rate > 0 ? `%${s.commission_rate}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "positive" : "secondary"}>
                      {s.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StaffRowActions staff={s} />
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
