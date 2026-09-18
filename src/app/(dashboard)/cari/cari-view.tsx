"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MessageCircle, Phone, Banknote } from "lucide-react";

import { formatPrice, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CariRow = {
  id: string;
  name: string;
  phone: string | null;
  charges: number;
  payments: number;
  balance: number;
  lastPaymentAt: string | null;
  overdue: boolean;
};

function waLink(phone: string | null, msg: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let p = digits;
  if (p.startsWith("0")) p = "90" + p.slice(1);
  else if (!p.startsWith("90")) p = "90" + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}

type TabKey = "all" | "overdue" | "debtor" | "credit" | "closed";

function statusOf(r: CariRow): Exclude<TabKey, "all"> {
  if (r.balance > 0) return r.overdue ? "overdue" : "debtor";
  if (r.balance < 0) return "credit";
  return "closed";
}

export function CariView({ rows }: { rows: CariRow[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const x = { all: rows.length, overdue: 0, debtor: 0, credit: 0, closed: 0 };
    for (const r of rows) x[statusOf(r)]++;
    return x;
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return rows.filter((r) => {
      if (tab !== "all" && statusOf(r) !== tab) return false;
      if (s && !`${r.name} ${r.phone ?? ""}`.toLocaleLowerCase("tr").includes(s)) return false;
      return true;
    });
  }, [rows, tab, q]);

  const TABS: { key: TabKey; label: string; count: number; tone?: string }[] = [
    { key: "all", label: "Tümü", count: counts.all },
    { key: "overdue", label: "Gecikmiş", count: counts.overdue, tone: "text-danger" },
    { key: "debtor", label: "Borçlu", count: counts.debtor },
    { key: "credit", label: "Alacaklı", count: counts.credit },
    { key: "closed", label: "Kapalı", count: counts.closed },
  ];

  return (
    <div className="space-y-4">
      {/* Sekmeler */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                active ? "border-primary/40 bg-primary/[0.06] text-primary" : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn(!active && t.tone)}>{t.label}</span>
              <Badge variant={t.key === "overdue" && t.count > 0 ? "danger" : active ? "info" : "secondary"}>{t.count}</Badge>
            </button>
          );
        })}
      </div>

      {/* Arama */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Müşteri veya telefon ara..." className="pl-8" />
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Müşteri</TableHead>
              <TableHead className="text-right">Borçlandırma</TableHead>
              <TableHead className="text-right">Tahsilat</TableHead>
              <TableHead className="text-right">Bakiye</TableHead>
              <TableHead>Son Ödeme</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Bu filtrelerle eşleşen kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const st = statusOf(r);
                const wa = r.balance > 0 ? waLink(r.phone, `Merhaba ${r.name}, ${formatPrice(r.balance)} tutarındaki ödemenizle ilgili bir hatırlatma yapmak istedik. Detaylar için bize ulaşabilirsiniz.`) : null;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {r.name.slice(0, 2).toLocaleUpperCase("tr")}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/musteriler/${r.id}`} className="block truncate font-medium leading-tight hover:text-primary hover:underline">{r.name}</Link>
                          <p className="truncate text-xs text-muted-foreground">{r.phone ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(r.charges)}</TableCell>
                    <TableCell className="text-right tabular-nums text-positive">{formatPrice(r.payments)}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", r.balance > 0 && "text-danger", r.balance < 0 && "text-primary")}>
                      {formatPrice(Math.abs(r.balance))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.lastPaymentAt ? formatDate(r.lastPaymentAt) : "—"}
                    </TableCell>
                    <TableCell>
                      {st === "overdue" ? <Badge variant="danger">Gecikmiş</Badge>
                        : st === "debtor" ? <Badge variant="warning">Borçlu</Badge>
                        : st === "credit" ? <Badge variant="info">Alacaklı</Badge>
                        : <Badge variant="positive">Kapalı</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer" title="Ödeme hatırlat (WhatsApp)" className="flex size-7 items-center justify-center rounded-md bg-positive/10 text-positive transition-colors hover:bg-positive/20">
                            <MessageCircle className="size-3.5" />
                          </a>
                        )}
                        {r.phone && (
                          <a href={`tel:${r.phone}`} title="Ara" className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20">
                            <Phone className="size-3.5" />
                          </a>
                        )}
                        <Link href="/tahsilat" title="Tahsilat ekle" className={cn(buttonVariants({ size: "icon-sm", variant: "outline" }))}>
                          <Banknote className="size-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Bakiye = (paket alımları + pakete bağlı olmayan tamamlanmış randevular) − toplam tahsilat ·
        &quot;Gecikmiş&quot;: 30 günden eski ödenmemiş bakiye · &quot;Alacaklı&quot;: avans/fazla ödeme.
      </p>
    </div>
  );
}
