"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, UserRound, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Building2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { SubscriptionStatus } from "@/types/database";

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

const STATUS_META: Record<SubscriptionStatus, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-positive/12 text-positive" },
  trial: { label: "Deneme", cls: "bg-primary/10 text-primary" },
  suspended: { label: "Askıda", cls: "bg-warning/15 text-amber-700" },
  cancelled: { label: "İptal", cls: "bg-danger/12 text-danger" },
};
const PLAN_META: Record<string, { label: string; cls: string }> = {
  trial: { label: "Deneme", cls: "bg-muted text-muted-foreground" },
  temel: { label: "Temel", cls: "bg-sky-100 text-sky-700" },
  pro: { label: "Pro", cls: "bg-gradient-to-br from-primary to-violet-500 text-white" },
};
const SECTOR_LABEL: Record<string, string> = {
  guzellik_salonu: "Güzellik Salonu",
  klinik: "Klinik",
  kuafor: "Kuaför",
  berber: "Berber",
  spa: "Spa & Masaj",
  dovme: "Dövme & Piercing",
  estetik: "Estetik Merkezi",
  dis: "Diş Kliniği",
  diger: "Diğer",
};
function sectorLabel(s: string | null): string {
  if (!s) return "—";
  if (SECTOR_LABEL[s]) return SECTOR_LABEL[s];
  return s.split(/[_\s]+/).map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1)).join(" ");
}

const AVATAR_TONES = [
  "bg-primary/10 text-primary",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-sky-100 text-sky-600",
  "bg-violet-100 text-violet-600",
  "bg-rose-100 text-rose-600",
];
function avatarTone(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h];
}

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
      <button onClick={() => toggleSort(k)} className={cn("flex items-center gap-1 text-left uppercase tracking-wide transition-colors hover:text-foreground", active && "text-foreground")}>
        {label}<Icon className={cn("size-3", active ? "text-primary" : "text-muted-foreground/50")} />
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
      {/* Arama + filtre */}
      <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma adı veya sektör ara…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="trial">Deneme</option>
          <option value="suspended">Askıda</option>
          <option value="cancelled">İptal</option>
          <option value="expired">Süresi Doldu</option>
        </select>
        <span className="hidden shrink-0 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground sm:block">{filtered.length} firma</span>
      </div>

      <div className="hidden grid-cols-[2.2fr_1.2fr_0.7fr_0.7fr_0.9fr_1fr_1fr_auto] gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
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
          <Building2 className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Eşleşen firma yok.</p>
        </div>
      ) : (
        <ul className="divide-y">
          {filtered.map((b) => {
            const meta = STATUS_META[b.status];
            const plan = PLAN_META[b.plan] ?? { label: b.plan, cls: "bg-muted text-muted-foreground" };
            return (
              <li key={b.id}>
                <Link href={`/admin/firma/${b.id}`} className="grid grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/40 lg:grid-cols-[2.2fr_1.2fr_0.7fr_0.7fr_0.9fr_1fr_1fr_auto] lg:gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold", avatarTone(b.id))}>{b.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">{b.name}<span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", plan.cls)}>{plan.label}</span></p>
                      <p className="text-xs text-muted-foreground">Oluşturma: {b.createdLabel}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground"><span className="lg:hidden">Sektör: </span>{sectorLabel(b.sector)}</span>
                  <span className="flex items-center gap-1 text-sm tabular-nums"><Users className="size-3.5 text-muted-foreground lg:hidden" />{b.userCount}</span>
                  <span className="flex items-center gap-1 text-sm tabular-nums"><UserRound className="size-3.5 text-muted-foreground lg:hidden" />{b.custCount}</span>
                  <span className="text-sm font-medium tabular-nums">{b.price > 0 ? formatPrice(b.price) : <span className="text-muted-foreground">—</span>}</span>
                  <span>{b.expired ? <span className="inline-flex rounded-full bg-danger/12 px-2 py-0.5 text-xs font-medium text-danger">Süresi Doldu</span> : <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", meta.cls)}>{meta.label}</span>}</span>
                  <span className="text-sm text-muted-foreground">{b.lastActivityLabel}</span>
                  <ChevronRight className="hidden size-4 text-muted-foreground lg:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
