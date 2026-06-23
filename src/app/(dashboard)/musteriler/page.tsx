import { Search, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { customerStatusLabel, customerStatusVariant } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Customer } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

import { NewCustomerButton } from "./new-customer-button";
import { CustomerRowActions } from "./customer-row-actions";

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*")
    .eq("is_lead", false)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const { data } = await query;
  const customers = (data ?? []) as Customer[];
  const showEmpty = customers.length === 0 && !q;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteriler"
        description="Dönüşmüş müşteri kayıtlarını yönet ve geçmişlerini takip et."
      >
        <NewCustomerButton />
      </PageHeader>

      {showEmpty ? (
        <EmptyState
          icon={Users}
          title="Henüz müşteri yok"
          description="Lead'ler “Müşteriye dönüştür” ile buraya gelir; ya da doğrudan yeni müşteri ekleyebilirsin."
          action={<NewCustomerButton />}
        />
      ) : (
        <>
          <form className="flex max-w-sm gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Ad, telefon veya e-posta ara..."
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary">
              Ara
            </Button>
          </form>

          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Ad-soyad</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Etiketler</TableHead>
                  <TableHead>Kayıt</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Aramanızla eşleşen müşteri bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.full_name}
                      </TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>{c.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={customerStatusVariant(c.status)}>
                          {customerStatusLabel(c.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.tags?.length
                            ? c.tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                      <TableCell>
                        <CustomerRowActions customer={c} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
