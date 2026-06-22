import Link from "next/link";
import { Search, List, LayoutGrid } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { customerStatusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CustomerBoard } from "./customer-board";

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view } = await searchParams;
  const isBoard = view === "board";
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const { data } = await query;
  const customers = (data ?? []) as Customer[];

  const qs = q ? `&q=${encodeURIComponent(q)}` : "";
  const tableHref = q ? `/musteriler?q=${encodeURIComponent(q)}` : "/musteriler";
  const boardHref = `/musteriler?view=board${qs}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Müşteriler</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {customers.length} kayıt
          </p>
        </div>
        <NewCustomerButton />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex max-w-sm flex-1 gap-2">
          {isBoard && <input type="hidden" name="view" value="board" />}
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

        {/* Görünüm geçişi: Tablo / Pano */}
        <div className="flex items-center rounded-md border p-0.5">
          <Link
            href={tableHref}
            className={cn(
              buttonVariants({
                variant: isBoard ? "ghost" : "secondary",
                size: "sm",
              }),
              "gap-1.5"
            )}
          >
            <List className="size-4" />
            Tablo
          </Link>
          <Link
            href={boardHref}
            className={cn(
              buttonVariants({
                variant: isBoard ? "secondary" : "ghost",
                size: "sm",
              }),
              "gap-1.5"
            )}
          >
            <LayoutGrid className="size-4" />
            Pano
          </Link>
        </div>
      </div>

      {isBoard ? (
        <CustomerBoard customers={customers} />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
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
                    {q
                      ? "Aramanızla eşleşen müşteri bulunamadı."
                      : "Henüz müşteri yok. “Yeni müşteri” ile ekleyin."}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
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
      )}
    </div>
  );
}
