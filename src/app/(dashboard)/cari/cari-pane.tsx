"use client";

import Link from "next/link";
import { Banknote, ChevronRight, MessageCircle, Phone, ReceiptText } from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { formatMoney, Money } from "@/components/shared/money";

import { telHref, waLink, type CariRow } from "./cari-types";

/**
 * Müşteri hesabı ayrıntısı (liste yanındaki bölme ve dar ekranlardaki panel):
 * üstte hızlı eylemler, altında bakiye özeti ve hareket dökümü.
 */
export function CariPane({
  row: r,
  canPay,
  onPay,
}: {
  row: CariRow;
  canPay: boolean;
  onPay: () => void;
}) {
  const wa =
    r.balance > 0
      ? waLink(
          r.phone,
          `Merhaba ${r.name}, ${formatMoney(r.balance)} tutarındaki ödemenizle ilgili bir hatırlatma yapmak istedik. Ayrıntılar için bize ulaşabilirsiniz.`
        )
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-1 px-1 pt-1 text-center">
        <Avatar name={r.name} size="xl" />
        <h2 className="mt-2 max-w-full truncate text-title-3 font-semibold" title={r.name}>
          {r.name}
        </h2>
        <p className="max-w-full truncate text-subhead text-label-2">{r.phone ?? "Telefon yok"}</p>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(4.25rem, 1fr))" }}>
        {canPay && <QuickButton icon={Banknote} label="Ödeme al" onClick={onPay} />}
        {wa && <QuickButton icon={MessageCircle} label="Hatırlat" href={wa} external />}
        {r.phone && <QuickButton icon={Phone} label="Ara" href={telHref(r.phone)} />}
      </div>

      {r.balance > 0 ? (
        <div role="status" className="surface flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Money amount={r.balance} overdue={r.overdue} tone="debt" className="text-[0.9375rem]" />
            <p className="text-subhead text-label-2">{r.overdue ? "Gecikmiş borç" : "Açık borç"}</p>
          </div>
          {canPay && (
            <Button variant="tinted" size="sm" onClick={onPay}>
              Ödeme al
            </Button>
          )}
        </div>
      ) : (
        <p role="status" className="surface px-4 py-3 text-[0.9375rem] text-label-2">
          {r.balance < 0 ? `Müşterinin ${formatMoney(Math.abs(r.balance))} avansı var.` : "Müşterinin açık borcu yok."}
        </p>
      )}

      <ListGroup title="Hesap özeti">
        <InfoRow label="Toplam satış">
          <Money amount={r.charges} />
        </InfoRow>
        <InfoRow label="Tahsil edilen">
          <Money amount={r.payments} />
        </InfoRow>
        <InfoRow label="Son ödeme">
          <span className="tabular-nums">{r.lastPaymentAt ? formatDate(r.lastPaymentAt) : "Yok"}</span>
        </InfoRow>
      </ListGroup>

      <ListGroup title="Hareketler" detail={r.movements.length >= 30 ? "Son 30 hareket" : undefined}>
        {r.movements.length === 0 ? (
          <ListRow title="Henüz hareket yok" subtitle="Satış ve ödemeler burada listelenir" />
        ) : (
          r.movements.map((m) => (
            <ListRow
              key={m.id}
              leading={<ReceiptText aria-hidden className="size-[18px] text-label-3" />}
              title={m.title}
              subtitle={[m.kind === "paket" ? "Paket satışı" : m.kind === "hizmet" ? "Hizmet" : m.detail ? `Ödeme · ${m.detail}` : "Ödeme", formatDate(m.date)].join(" · ")}
              trailing={
                m.kind === "odeme" ? (
                  <span className="text-[0.9375rem] font-semibold whitespace-nowrap text-positive-text tabular-nums">
                    −{formatMoney(m.amount)}
                  </span>
                ) : (
                  <Money amount={m.amount} className="text-[0.9375rem]" />
                )
              }
            />
          ))
        )}
      </ListGroup>

      <Button asChild variant="plain" className="w-full">
        <Link href={`/musteriler/${r.id}`}>
          Müşteri kartı
          <ChevronRight />
        </Link>
      </Button>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-4 px-4 py-2 text-[0.9375rem]">
      <span className="shrink-0 text-label-2">{label}</span>
      <span className="flex min-w-0 justify-end">{children}</span>
    </li>
  );
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
  href,
  external,
}: {
  icon: typeof Phone;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}) {
  const cls = cn("h-auto flex-col gap-1 rounded-2xl px-1 py-2.5 text-[0.75rem]");
  if (href) {
    return (
      <Button asChild variant="secondary" className={cls}>
        <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <Icon className="size-5" />
          {label}
        </a>
      </Button>
    );
  }
  return (
    <Button variant="secondary" className={cls} onClick={onClick}>
      <Icon className="size-5" />
      {label}
    </Button>
  );
}
