"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Building2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { SubscriptionStatus } from "@/types/database";
import { sectorLabel } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge, type StatusVariant } from "@/components/shared/status";

export type FirmRow = {
  id: string;
  name: string;
  sector: string | null;
  createdLabel: string;
  createdMs: number;
  userCount: number;
  custCount: number;
  price: number;
  status: SubscriptionStatus;
  plan: string;
  expired: boolean;
  lastActivityLabel: string;
  lastActivityMs: number;
};

const STATUS_META: Record<SubscriptionStatus, { label: string; variant: StatusVariant }> = {
  active: { label: "Aktif", variant: "positive" },
  trial: { label: "Deneme", variant: "info" },
  suspended: { label: "Askıda", variant: "warning" },
  cancelled: { label: "İptal", variant: "danger" },
};
const PLAN_LABEL: Record<string, string> = { trial: "Deneme", temel: "Temel", pro: "Pro" };

type SortKey = "name" | "userCount" | "custCount" | "price" | "lastActivityMs" | "createdMs";

export function AdminFirmList({ rows }: { rows: FirmRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdMs");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" ? "asc" : "desc"); }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    const out = rows.filter(
      (r) =>
        (status === "all" || (status === "expired" ? r.expired : r.status === status && !r.expired)) &&
        (s === "" || r.name.toLocaleLowerCase("tr").includes(s) || sectorLabel(r.sector).toLocaleLowerCase("tr").includes(s))
    );
    out.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "name") { av = a.name.toLocaleLowerCase("tr"); bv = b.name.toLocaleLowerCase("tr"); }
      else { av = a[sortKey]; bv = b[sortKey]; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, q, status, sortKey, sortDir]);

  const sortHead = (k: SortKey, label: string) => {
    const active = sortKey === k;
    const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
      <button onClick={() => toggleSort(k)} className={cn("flex items-center gap-1 text-left uppercase tracking-wide hover:text-label", active && "text-label")}>
        {label}<Icon className={cn("size-3", active ? "text-primary-text" : "text-label-3")} />
      </button>
    );
  };

  return (
    <div className="surface overflow-clip">
      {/* Arama + filtre */}
      <div className="flex items-center gap-2 border-b border-separator p-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-ctl)] bg-fill px-3">
          <Search aria-hidden className="size-4 shrink-0 text-label-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma ara" aria-label="Firma ara" className="min-w-0 flex-1 bg-transparent text-base text-label outline-none placeholder:text-label-3 md:text-[0.875rem]" />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Durum" className="h-10 w-32 shrink-0 rounded-[var(--radius-ctl)] bg-fill px-2.5 text-[0.875rem] text-label outline-none sm:w-40">
          <option value="all">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="trial">Deneme</option>
          <option value="suspended">Askıda</option>
          <option value="cancelled">İptal</option>
          <option value="expired">Süresi doldu</option>
        </select>
        <span className="hidden shrink-0 text-footnote text-label-2 sm:block">{filtered.length} firma</span>
      </div>

      <div className="hidden grid-cols-[2.2fr_1.2fr_0.7fr_0.7fr_0.9fr_1fr_1fr_auto] gap-3 border-b border-separator px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-label-2 lg:grid">
        {sortHead("name", "Firma")}
        <span>Sektör</span>
        {sortHead("userCount", "Kullanıcı")}
        {sortHead("custCount", "Müşteri")}
        {sortHead("price", "Tutar")}
        <span>Abonelik</span>
        {sortHead("lastActivityMs", "Son Aktivite")}
        <span />
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
          <Building2 aria-hidden className="size-8 text-label-3" />
          <p className="text-subhead text-label-2">Eşleşen firma yok. Aramayı ya da durumu değiştir.</p>
        </div>
      ) : (
        <ul className="inset-rows" style={{ "--row-inset": "64px" } as React.CSSProperties}>
          {filtered.map((b) => {
            const meta = STATUS_META[b.status];
            const plan = PLAN_LABEL[b.plan] ?? b.plan;
            const badge = b.expired ? (
              <StatusBadge variant="danger">Süresi doldu</StatusBadge>
            ) : (
              <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
            );
            return (
              <li key={b.id}>
                {/* Telefon ve tablet: kompakt satır */}
                <Link href={`/admin/firma/${b.id}`} className="focus-ring hover-tint flex min-h-16 items-center gap-3 px-4 py-2.5 lg:hidden">
                  <Avatar name={b.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-label">{b.name}</p>
                    <p className="truncate text-subhead text-label-2">
                      {sectorLabel(b.sector)} · {b.custCount} müşteri · {b.lastActivityLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {badge}
                    <span className="text-footnote tabular-nums text-label-2">{b.price > 0 ? formatPrice(b.price) : plan}</span>
                  </div>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" />
                </Link>
                {/* Geniş ekran: tablo satırı */}
                <Link href={`/admin/firma/${b.id}`} className="focus-ring hover-tint hidden grid-cols-[2.2fr_1.2fr_0.7fr_0.7fr_0.9fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 lg:grid">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={b.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-label">{b.name}</p>
                      <p className="truncate text-footnote text-label-2">{plan} · {b.createdLabel}</p>
                    </div>
                  </div>
                  <span className="truncate text-subhead text-label-2">{sectorLabel(b.sector)}</span>
                  <span className="text-subhead tabular-nums">{b.userCount}</span>
                  <span className="text-subhead tabular-nums">{b.custCount}</span>
                  <span className="text-subhead font-medium tabular-nums">{b.price > 0 ? formatPrice(b.price) : <span className="text-label-2">—</span>}</span>
                  <span>{badge}</span>
                  <span className="text-subhead text-label-2">{b.lastActivityLabel}</span>
                  <ChevronRight aria-hidden className="size-4 text-label-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
