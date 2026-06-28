"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, UserRound, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/database";

export type FirmRow = {
  id: string;
  name: string;
  sector: string | null;
  createdLabel: string;
  userCount: number;
  custCount: number;
  status: SubscriptionStatus;
  plan: string;
  lastActivityLabel: string;
};

const STATUS_META: Record<SubscriptionStatus, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-positive/12 text-positive" },
  trial: { label: "Deneme", cls: "bg-primary/10 text-primary" },
  suspended: { label: "Askıda", cls: "bg-warning/15 text-amber-700" },
  cancelled: { label: "İptal", cls: "bg-danger/12 text-danger" },
};
const PLAN_LABEL: Record<string, string> = { trial: "Deneme", temel: "Temel", pro: "Pro" };

export function AdminFirmList({ rows }: { rows: FirmRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (s === "" || r.name.toLocaleLowerCase("tr").includes(s) || (r.sector ?? "").toLocaleLowerCase("tr").includes(s))
    );
  }, [rows, q, status]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
      {/* Arama + filtre */}
      <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
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
        </select>
      </div>

      <div className="hidden grid-cols-[2fr_1fr_0.7fr_0.7fr_1fr_1fr_auto] gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
        <span>Firma</span><span>Sektör</span><span>Kullanıcı</span><span>Müşteri</span><span>Abonelik</span><span>Son Aktivite</span><span />
      </div>
      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Eşleşen firma yok.</p>
      ) : (
        <ul className="divide-y">
          {filtered.map((b) => {
            const meta = STATUS_META[b.status];
            return (
              <li key={b.id}>
                <Link href={`/admin/firma/${b.id}`} className="grid grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/40 lg:grid-cols-[2fr_1fr_0.7fr_0.7fr_1fr_1fr_auto] lg:gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{b.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">{b.name}<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{PLAN_LABEL[b.plan] ?? b.plan}</span></p>
                      <p className="text-xs text-muted-foreground">Oluşturma: {b.createdLabel}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{b.sector ?? "—"}</span>
                  <span className="flex items-center gap-1 text-sm tabular-nums"><Users className="size-3.5 text-muted-foreground lg:hidden" />{b.userCount}</span>
                  <span className="flex items-center gap-1 text-sm tabular-nums"><UserRound className="size-3.5 text-muted-foreground lg:hidden" />{b.custCount}</span>
                  <span><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", meta.cls)}>{meta.label}</span></span>
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
