"use client";

import { ShoppingBag, Wallet } from "lucide-react";

import { formatDate, formatPrice } from "@/lib/format";
import {
  paymentMethodLabel,
  paymentMethodVariant,
  paymentStatusLabel,
  paymentStatusVariant,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SaleRow = {
  id: string;
  date: string;
  customer: string;
  item: string;
  amount: number;
  kind: "Paket" | "Hizmet";
  status: string | null; // paket için payment_status; hizmet için null
};

export type PaymentRow = {
  id: string;
  created_at: string;
  customer: string;
  amount: number | null;
  method: string;
  related_type: string | null;
  note: string | null;
};

const RELATED_LABEL: Record<string, string> = {
  paket: "Paket",
  randevu: "Randevu",
  diger: "Diğer",
};

export function SalesTabs({
  sales,
  payments,
}: {
  sales: SaleRow[];
  payments: PaymentRow[];
}) {
  return (
    <Tabs defaultValue="satislar" className="space-y-4">
      <TabsList>
        <TabsTrigger value="satislar" className="gap-1.5">
          <ShoppingBag className="size-4" />
          Satışlar ({sales.length})
        </TabsTrigger>
        <TabsTrigger value="tahsilatlar" className="gap-1.5">
          <Wallet className="size-4" />
          Tahsilatlar ({payments.length})
        </TabsTrigger>
      </TabsList>

      {/* SATIŞLAR */}
      <TabsContent value="satislar">
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Kalem</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Henüz satış yok. Paket sat ya da fiyatlı bir randevuyu tamamla.
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(s.date)}</TableCell>
                    <TableCell className="font-medium">{s.customer}</TableCell>
                    <TableCell>{s.item}</TableCell>
                    <TableCell>
                      <Badge variant={s.kind === "Paket" ? "info" : "secondary"}>{s.kind}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPrice(s.amount)}</TableCell>
                    <TableCell>
                      {s.status ? (
                        <Badge variant={paymentStatusVariant(s.status)}>{paymentStatusLabel(s.status)}</Badge>
                      ) : (
                        <Badge variant="positive">Tamamlandı</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* TAHSİLATLAR */}
      <TabsContent value="tahsilatlar">
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Yöntem</TableHead>
                <TableHead>İlişkili</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Henüz tahsilat kaydı yok. &quot;Ödeme al&quot; ile ekle.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                    <TableCell className="font-medium">{p.customer}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-positive">{formatPrice(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={paymentMethodVariant(p.method)}>{paymentMethodLabel(p.method)}</Badge>
                    </TableCell>
                    <TableCell>{p.related_type ? RELATED_LABEL[p.related_type] ?? "—" : "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{p.note ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
