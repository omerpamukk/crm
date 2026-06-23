"use client";

import { useMemo, useState } from "react";
import { Search, Download, Users, UserX, Archive, UserPlus } from "lucide-react";

import { customerStatusLabel, customerStatusVariant } from "@/lib/constants";
import { formatPrice, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { CustomerRowActions } from "./customer-row-actions";
import { CustomerInlineForm } from "./customer-inline-form";
import { CustomerDetailSheet } from "./customer-detail-sheet";

export type EnrichedCustomer = Customer & {
  service: string | null;
  remaining: number | null;
  total: number | null;
  totalValue: number;
  lastContactAt: string | null;
  lastContactType: string | null;
  nextApptAt: string | null;
};

const DAY = 86_400_000;
const INTERACTION_LABEL: Record<string, string> = {
  mesaj: "Mesaj",
  arama: "Arama",
  randevu_olusturuldu: "Randevu",
  randevu_tamamlandi: "Seans",
  not: "Not",
  asama_degisikligi: "Aşama",
};

function relTime(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const days = Math.floor((nowMs - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  return `${Math.floor(days / 30)} ay önce`;
}

function groupOf(c: EnrichedCustomer): "aktif" | "pasif" | "arsiv" {
  if (c.status === "archived") return "arsiv";
  if (c.status === "passive") return "pasif";
  return "aktif";
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function CustomersView({
  customers,
  services,
  tags,
}: {
  customers: EnrichedCustomer[];
  services: string[];
  tags: string[];
}) {
  const [nowMs] = useState(() => Date.now());
  const [addOpen, setAddOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<EnrichedCustomer | null>(null);
  const [tab, setTab] = useState<"aktif" | "pasif" | "arsiv">("aktif");
  const [q, setQ] = useState("");
  const [service, setService] = useState("all");
  const [kalan, setKalan] = useState("all");
  const [deger, setDeger] = useState("all");
  const [iletisim, setIletisim] = useState("all");
  const [tag, setTag] = useState("all");

  const counts = useMemo(() => {
    const x = { aktif: 0, pasif: 0, arsiv: 0 };
    for (const c of customers) x[groupOf(c)]++;
    return x;
  }, [customers]);

  // Hizmet filtresi: müşterilerde gerçekten var olan hizmetlerden üret
  const serviceOptions = useMemo(
    () =>
      [...new Set(customers.map((c) => c.service).filter((s): s is string => !!s))].sort(
        (a, b) => a.localeCompare(b, "tr")
      ),
    [customers]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return customers.filter((c) => {
      if (groupOf(c) !== tab) return false;
      if (s) {
        const hay = `${c.full_name} ${c.phone ?? ""} ${c.email ?? ""}`.toLocaleLowerCase("tr");
        if (!hay.includes(s)) return false;
      }
      if (service !== "all" && c.service !== service) return false;
      if (kalan !== "all") {
        const r = c.remaining ?? -1;
        if (kalan === "var" && !(r > 0)) return false;
        if (kalan === "az" && !(r > 0 && r <= 2)) return false;
        if (kalan === "bitti" && !(c.total != null && r === 0)) return false;
      }
      if (deger !== "all") {
        const v = c.totalValue;
        if (deger === "low" && !(v < 5000)) return false;
        if (deger === "mid" && !(v >= 5000 && v < 15000)) return false;
        if (deger === "high" && !(v >= 15000)) return false;
      }
      if (iletisim !== "all") {
        const d = c.lastContactAt
          ? Math.floor((nowMs - new Date(c.lastContactAt).getTime()) / DAY)
          : null;
        if (iletisim === "today" && d !== 0) return false;
        if (iletisim === "week" && !(d !== null && d <= 7)) return false;
        if (iletisim === "month" && !(d !== null && d <= 30)) return false;
        if (iletisim === "none" && d !== null) return false;
      }
      if (tag !== "all" && !(c.tags ?? []).includes(tag)) return false;
      return true;
    });
  }, [customers, tab, q, service, kalan, deger, iletisim, tag, nowMs]);

  function exportCsv() {
    const headers = ["Ad Soyad", "Telefon", "E-posta", "Hizmet", "Kalan Seans", "Toplam Değer", "Son İletişim", "Durum"];
    const lines = filtered.map((c) =>
      [
        c.full_name,
        c.phone ?? "",
        c.email ?? "",
        c.service ?? "",
        c.remaining != null && c.total != null ? `${c.total - c.remaining}/${c.total}` : "",
        c.totalValue,
        relTime(c.lastContactAt, nowMs),
        customerStatusLabel(c.status),
      ].map(csvCell).join(",")
    );
    const csv = "﻿" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `musteriler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const TABS = [
    { key: "aktif" as const, label: "Aktif Müşteriler", icon: Users, count: counts.aktif },
    { key: "pasif" as const, label: "Pasif", icon: UserX, count: counts.pasif },
    { key: "arsiv" as const, label: "Arşiv", icon: Archive, count: counts.arsiv },
  ];

  return (
    <div className="space-y-4">
      {/* Sekmeler */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/[0.06] text-primary"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-4" />
              {t.label}
              <Badge variant={active ? "info" : "secondary"}>{t.count}</Badge>
            </button>
          );
        })}
      </div>

      {/* Filtre çubuğu */}
      <div className="space-y-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Hizmet" value={service} onChange={setService} options={[{ v: "all", l: "Tümü" }, ...serviceOptions.map((s) => ({ v: s, l: s }))]} />
          <FilterSelect label="Kalan Seans" value={kalan} onChange={setKalan} options={[{ v: "all", l: "Tümü" }, { v: "var", l: "Seansı var" }, { v: "az", l: "Az kaldı (≤2)" }, { v: "bitti", l: "Paketi bitti" }]} />
          <FilterSelect label="Değer" value={deger} onChange={setDeger} options={[{ v: "all", l: "Tümü" }, { v: "low", l: "< ₺5.000" }, { v: "mid", l: "₺5.000–15.000" }, { v: "high", l: "₺15.000+" }]} />
          <FilterSelect label="Son İletişim" value={iletisim} onChange={setIletisim} options={[{ v: "all", l: "Tümü" }, { v: "today", l: "Bugün" }, { v: "week", l: "Son 7 gün" }, { v: "month", l: "Son 30 gün" }, { v: "none", l: "Hiç" }]} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Müşteri, telefon, e-posta ara..." className="pl-8" />
          </div>
          {tags.length > 0 && (
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Etiketler</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" className="gap-1.5" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" />
            Dışa Aktar
          </Button>
          <Button className="gap-1.5" onClick={() => setAddOpen((o) => !o)}>
            <UserPlus className="size-4" />
            Yeni Müşteri
          </Button>
        </div>
      </div>

      {/* Sayfa içi ekleme formu */}
      {addOpen && (
        <CustomerInlineForm services={services} onClose={() => setAddOpen(false)} />
      )}

      {/* Tablo */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Müşteri</TableHead>
              <TableHead>Hizmet</TableHead>
              <TableHead>Kalan Seans</TableHead>
              <TableHead>Sıradaki Randevu</TableHead>
              <TableHead className="text-right">Toplam Değer</TableHead>
              <TableHead>Son İletişim</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  Bu filtrelerle eşleşen müşteri yok.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const done = c.total != null && c.remaining != null ? c.total - c.remaining : null;
                const finished = c.total != null && c.remaining === 0;
                const low = c.remaining != null && c.remaining > 0 && c.remaining <= 2;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {c.full_name.slice(0, 2).toLocaleUpperCase("tr")}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailCustomer(c)}
                            className="block max-w-full truncate text-left font-medium leading-tight hover:text-primary hover:underline"
                          >
                            {c.full_name}
                          </button>
                          <p className="truncate text-xs text-muted-foreground">{c.phone ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{c.service ?? "—"}</p>
                      {(c.tags ?? []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags!.slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {done != null && c.total != null ? (
                        <div className="min-w-28">
                          <div className="flex items-center justify-between text-xs">
                            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <span
                                className={cn("block h-full rounded-full", finished ? "bg-positive" : low ? "bg-warning" : "bg-primary")}
                                style={{ width: `${c.total ? (done / c.total) * 100 : 0}%` }}
                              />
                            </span>
                            <span className="ml-2 font-medium tabular-nums">{done}/{c.total}</span>
                          </div>
                          <p className={cn("mt-1 text-xs", finished ? "text-amber-600" : "text-muted-foreground")}>
                            {finished ? "⚠ Paket bitti" : `${c.remaining} seans kaldı`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.nextApptAt ? formatDateTime(c.nextApptAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-positive">
                      {c.totalValue > 0 ? formatPrice(c.totalValue) : "—"}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{relTime(c.lastContactAt, nowMs)}</p>
                      {c.lastContactType && (
                        <p className="text-xs text-muted-foreground">
                          {INTERACTION_LABEL[c.lastContactType] ?? c.lastContactType}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customerStatusVariant(c.status)}>
                        {customerStatusLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <CustomerRowActions customer={c} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} müşteri gösteriliyor
      </p>

      {detailCustomer && (
        <CustomerDetailSheet
          customer={detailCustomer}
          open
          onOpenChange={(o) => !o && setDetailCustomer(null)}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
