"use client";

import Link from "next/link";
import { Banknote } from "lucide-react";

import { appointmentStatusLabel, appointmentStatusVariant } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { GeldiButton } from "@/components/shared/geldi-button";
import { Money } from "@/components/shared/money";
import { StatusBadge, StatusIcons } from "@/components/shared/status";

import { fmtTime } from "./dates";
import type { ScheduleAppt } from "./types";

/** "Cilt Bakımı · 7/10 seans · Merve" — boş parçalar atlanır. */
export function apptLine(a: ScheduleAppt): string {
  const parts = [a.service];
  if (a.pkgTotal && a.pkgTotal > 1) {
    parts.push(`${a.pkgUsed ?? 0}/${a.pkgTotal} seans`);
  }
  if (a.staffName) parts.push(a.staffName);
  return parts.join(" · ");
}

/** Etiket çipleri (en çok 2); sığmazsa kısalır. */
export function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <>
      {tags.slice(0, 2).map((t) => (
        <span
          key={t}
          className="max-w-24 shrink-0 truncate rounded-full bg-fill px-2 py-px text-[0.75rem] leading-4 font-medium text-label-2"
          title={t}
        >
          {t}
        </span>
      ))}
    </>
  );
}

/** Sonuçlanmış randevunun durumu: simge + metin (renk tek başına anlam taşımaz). */
export function EndStatus({ a, compact = false }: { a: ScheduleAppt; compact?: boolean }) {
  if (a.status === "arrived") {
    return <StatusBadge variant="positive">Geldi{a.arrivedAt && !compact ? ` · ${fmtTime(a.arrivedAt)}` : ""}</StatusBadge>;
  }
  if (a.status === "cancelled") return <StatusBadge variant="secondary" icon={StatusIcons.cancelled}>İptal edildi</StatusBadge>;
  return <StatusBadge variant={appointmentStatusVariant(a.status)}>{appointmentStatusLabel(a.status)}</StatusBadge>;
}

/**
 * Randevu ayrıntısı (alt sayfa / sağ panel içeriği): bilgiler, Ödeme al ve Geldi.
 * Telefonda satırı kaydırmanın görünür karşılığı de burasıdır.
 */
export function ApptDetail({
  a,
  canPay,
  onArrive,
  onUndo,
  onPay,
}: {
  a: ScheduleAppt;
  canPay: boolean;
  onArrive: () => Promise<unknown>;
  onUndo: () => Promise<unknown>;
  onPay: () => void;
}) {
  const showGeldi = a.canArrive && (a.status === "planned" || a.status === "arrived");
  const rows: [string, React.ReactNode][] = [
    ["Saat", `${fmtTime(a.startsAt)}–${fmtTime(a.endsAt)}`],
    ["Hizmet", a.service],
  ];
  if (a.pkgTotal && a.pkgTotal > 1) rows.push(["Paket", `${a.pkgUsed ?? 0}/${a.pkgTotal} seans`]);
  if (a.staffName) rows.push(["Personel", a.staffName]);
  rows.push(["Durum", <EndStatus key="d" a={a} />]);
  if (a.debt > 0) rows.push([a.debtOverdue ? "Gecikmiş borç" : "Açık borç", <Money key="b" amount={a.debt} tone="debt" />]);

  return (
    <div className="space-y-4 px-4 pb-5">
      <div className="flex items-center gap-3">
        <Avatar name={a.customerName} size="lg" />
        <div className="min-w-0">
          <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[1.0625rem] leading-6 font-semibold">
            <span className="truncate">{a.customerName}</span>
            <TagChips tags={a.tags} />
          </p>
          {a.customerId && (
            <Link href={`/musteriler/${a.customerId}`} className="text-subhead text-primary-text hover:underline">
              Müşteri sayfası
            </Link>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-2 text-[0.9375rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="whitespace-nowrap text-label-2">{k}</dt>
            <dd className="min-w-0 truncate">{v}</dd>
          </div>
        ))}
      </dl>
      {(showGeldi || (canPay && a.customerId)) && (
        <div className="flex gap-2">
          {canPay && a.customerId && (
            <Button variant="secondary" size="lg" className="flex-1" onClick={onPay}>
              <Banknote />
              Ödeme al
            </Button>
          )}
          {showGeldi && (
            <GeldiButton
              size="lg"
              className="flex-1"
              customerName={a.customerName}
              arrived={a.status === "arrived"}
              onArrive={onArrive}
              onUndo={onUndo}
            />
          )}
        </div>
      )}
    </div>
  );
}
