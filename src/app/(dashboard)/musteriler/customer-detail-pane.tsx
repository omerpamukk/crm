"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CalendarPlus, ChevronRight, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toastUndo } from "@/components/ui/sonner";
import { GeldiButton } from "@/components/shared/geldi-button";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Money } from "@/components/shared/money";
import { PackageProgress } from "@/components/shared/package-progress";
import { StatusBadge } from "@/components/shared/status";
import { formatTime } from "@/lib/format";
import { markArrived, undoArrived } from "../randevular/actions";

import { CustomerActions } from "./customer-actions";
import {
  INTERACTION_LABEL,
  apptWhen,
  relTime,
  telHref,
  waLink,
  type CustomerAbilities,
  type EnrichedCustomer,
} from "./customer-types";

/**
 * Müşteri ayrıntısı (liste yanındaki bölme ve dar ekranlardaki sağ panel).
 * Üstte hızlı eylemler; altında durum: sıradaki randevu, paket, hesap, iletişim.
 */
export function CustomerPane({
  customer: c,
  abilities,
  canArrive,
  nowMs,
  onBook,
  onPay,
  onDeleted,
}: {
  customer: EnrichedCustomer;
  abilities: CustomerAbilities;
  canArrive: boolean;
  nowMs: number;
  onBook: () => void;
  onPay: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const next = c.nextAppt;
  const when = next ? apptWhen(next.startsAt, nowMs) : null;
  const arrived = next?.status === "arrived";
  const showArrive = !!next && when?.today && canArrive && (next.status === "planned" || arrived);

  async function arrive() {
    if (!next) return;
    const res = await markArrived(next.id);
    if (res.error) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    router.refresh();
    toastUndo(`${c.full_name} geldi`, () => {
      void undoArrived(next.id).then((r) => {
        if (r.error) toast.error(r.error);
        else router.refresh();
      });
    });
  }

  async function undo() {
    if (!next) return;
    const res = await undoArrived(next.id);
    if (res.error) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    router.refresh();
  }

  const tags = c.tags ?? [];
  const sub = c.service ?? "Paket yok";

  return (
    <div className="space-y-5">
      <div className="relative flex flex-col items-center gap-1 px-1 pt-1 text-center">
        {abilities.manage && (
          <div className="absolute top-0 right-0">
            <CustomerActions customer={c} onDeleted={onDeleted} />
          </div>
        )}
        <Avatar name={c.full_name} size="xl" />
        <h2 className="mt-2 max-w-full truncate text-title-3 font-semibold" title={c.full_name}>
          {c.full_name}
        </h2>
        <p className="flex max-w-full min-w-0 items-center justify-center gap-1.5 text-subhead text-label-2">
          <span className="truncate">{sub}</span>
          {tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="tag">
              {t}
            </Badge>
          ))}
        </p>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(4.25rem, 1fr))" }}
      >
        {abilities.book && <QuickButton icon={CalendarPlus} label="Randevu" onClick={onBook} />}
        {abilities.pay && <QuickButton icon={Banknote} label="Ödeme al" onClick={onPay} />}
        {c.phone && <QuickButton icon={MessageCircle} label="WhatsApp" href={waLink(c.phone)} external />}
        {c.phone && <QuickButton icon={Phone} label="Ara" href={telHref(c.phone)} />}
      </div>

      {c.openDebt > 0 && (
        <div role="status" className="surface flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Money amount={c.openDebt} overdue={c.overdue} tone="debt" className="text-[0.9375rem]" />
            <p className="text-subhead text-label-2">{c.overdue ? "Gecikmiş borç" : "Açık borç"}</p>
          </div>
          {abilities.pay && (
            <Button variant="tinted" size="sm" onClick={onPay}>
              Ödeme al
            </Button>
          )}
        </div>
      )}

      <ListGroup title="Sıradaki randevu" inset={16}>
        <ListRow
          title={next && when ? `${when.day} ${when.time}` : "Planlı randevu yok"}
          subtitle={
            next
              ? [next.serviceName, next.staffName].filter(Boolean).join(" · ") || undefined
              : abilities.book
                ? "Randevu düğmesiyle yeni randevu verin"
                : undefined
          }
          trailing={
            showArrive ? (
              <GeldiButton
                size="sm"
                arrived={arrived}
                customerName={c.full_name}
                onArrive={arrive}
                onUndo={undo}
              />
            ) : arrived && next?.arrivedAt ? (
              <StatusBadge variant="positive">Geldi · {formatTime(next.arrivedAt)}</StatusBadge>
            ) : null
          }
        />
      </ListGroup>

      <ListGroup title="Paket">
        {c.total != null && c.remaining != null ? (
          <li className="px-4 py-3">
            <PackageProgress
              label={c.service ?? "Paket"}
              used={Math.max(c.total - c.remaining, 0)}
              total={c.total}
              className="max-w-none"
            />
          </li>
        ) : (
          <ListRow title="Paket yok" subtitle="Bu müşterinin satın aldığı paket görünmüyor" />
        )}
      </ListGroup>

      <ListGroup title="Hesap">
        <InfoRow label="Açık borç">
          {c.openDebt > 0 ? <Money amount={c.openDebt} tone="debt" /> : <span className="text-label-2">Yok</span>}
        </InfoRow>
        <InfoRow label="Toplam ödeme">
          <Money amount={c.totalValue} />
        </InfoRow>
      </ListGroup>

      <ListGroup title="İletişim">
        <InfoRow label="Telefon">
          {c.phone ? (
            <a href={telHref(c.phone)} className="focus-ring rounded text-primary-text tabular-nums">
              {c.phone}
            </a>
          ) : (
            <span className="text-label-2">Yok</span>
          )}
        </InfoRow>
        <InfoRow label="E-posta">
          {c.email ? (
            <a href={`mailto:${c.email}`} className="focus-ring block min-w-0 truncate rounded text-primary-text" title={c.email}>
              {c.email}
            </a>
          ) : (
            <span className="text-label-2">Yok</span>
          )}
        </InfoRow>
        <InfoRow label="Son iletişim">
          <span className="truncate">
            {c.lastContactAt
              ? `${relTime(c.lastContactAt, nowMs)}${c.lastContactType ? ` · ${INTERACTION_LABEL[c.lastContactType] ?? ""}` : ""}`
              : "Hiç"}
          </span>
        </InfoRow>
      </ListGroup>

      <Button asChild variant="plain" className="w-full">
        <Link href={`/musteriler/${c.id}`}>
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
