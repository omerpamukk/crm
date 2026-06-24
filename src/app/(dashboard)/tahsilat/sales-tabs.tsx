"use client";

import { useMemo, useState } from "react";
import { ShoppingBag, Wallet, Search } from "lucide-react";

import { formatDate, formatPrice } from "@/lib/format";
import {
  paymentMethodLabel,
  paymentMethodVariant,
  paymentStatusLabel,
  paymentStatusVariant,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { CollectButton } from "./collect-button";

export type SaleRow = {
  id: string;
  date: string;
  customerId: string | null;
  customer: string;
  item: string;
  amount: number;
  kind: "Paket" | "Hizmet";
  status: string | null; // paket: payment_status; hizmet: null
  packageId: string | null;
  remaining: number;
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

const RELATED_LABEL: Record<string, string> = { paket: "Paket", randevu: "Randevu", diger: "Diğer" };
const PAGE = 20;

function statusKey(s: SaleRow): string {
  return s.status ?? "tamamlandi";
}

export function SalesTabs({ sales, payments }: { sales: SaleRow[]; payments: PaymentRow[] }) {
  const [q, setQ] = useState("");
  const [durum, setDurum] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return sales.filter((x) => {
      if (durum !== "all" && statusKey(x) !== durum) return false;
      if (s && !`${x.customer} ${x.item}`.toLocaleLowerCase("tr").includes(s)) return false;
      return true;
    });
  }, [sales, q, durum]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  return (
    <Tabs defaultValue="satislar" className="space-y-4">
      <TabsList>
        <TabsTrigger value="satislar" className="gap-1.5">
          <ShoppingBag className="size-4" /> Satışlar ({sales.length})
        </TabsTrigger>
        <TabsTrigger value="tahsilatlar" className="gap-1.5">
          <Wallet className="size-4" /> Tahsilatlar ({payments.length})
        </TabsTrigger>
      </TabsList>

      {/* SATIŞLAR */}
      <TabsContent value="satislar" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Müşteri veya hizmet ara..." className="pl-8" />
          </div>
          <Select value={durum} onValueChange={(v) => { setDurum(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="odendi">Ödendi</SelectItem>
              <SelectItem value="kismi">Kısmi</SelectItem>
              <SelectItem value="odenmedi">Ödenmedi</SelectItem>
              <SelectItem value="tamamlandi">Tamamlandı (hizmet)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Hizmet</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Eşleşen satış yok.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((s, i) => {
                  const collectible = s.kind === "Paket" && s.remaining > 0 && s.customerId && s.packageId;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground tabular-nums">{(safePage - 1) * PAGE + i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {s.customer.slice(0, 2).toLocaleUpperCase("tr")}
                          </span>
                          <span className="truncate font-medium">{s.customer}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span>{s.item}</span>
                        <Badge variant={s.kind === "Paket" ? "info" : "secondary"} className="ml-2 text-[10px]">{s.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatPrice(s.amount)}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(s.date)}</TableCell>
                      <TableCell>
                        {s.status ? (
                          <Badge variant={paymentStatusVariant(s.status)}>{paymentStatusLabel(s.status)}</Badge>
                        ) : (
                          <Badge variant="positive">Tamamlandı</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {collectible ? (
                          <CollectButton
                            customerId={s.customerId!}
                            customerName={s.customer}
                            packageId={s.packageId!}
                            serviceName={s.item}
                            remaining={s.remaining}
                          />
                        ) : (
                          <span className="text-xs text-positive">✓</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > PAGE && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {(safePage - 1) * PAGE + 1}–{Math.min(safePage * PAGE, filtered.length)} / {filtered.length} satış
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Önceki</Button>
              <span className="px-2 tabular-nums">{safePage}/{pageCount}</span>
              <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Sonraki</Button>
            </div>
          </div>
        )}
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
                    <TableCell><Badge variant={paymentMethodVariant(p.method)}>{paymentMethodLabel(p.method)}</Badge></TableCell>
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
