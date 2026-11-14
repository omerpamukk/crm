"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Banknote,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  ChevronLeft,
  FileText,
  MessageCircle,
  Package as PackageIcon,
  Phone,
  Plus,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  appointmentStatusLabel,
  appointmentStatusVariant,
  customerStatusLabel,
  customerStatusVariant,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusVariant,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { zonedParts, zonedWallToUtcMs } from "@/lib/zaman";
import type { Customer, Interaction, Package, Payment } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastUndo } from "@/components/ui/sonner";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { GeldiButton } from "@/components/shared/geldi-button";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import type { Rhythm } from "@/lib/customer-rhythm";

import { RhythmCard } from "./rhythm-card";
import { LoyaltyCard } from "./loyalty-card";
import type { LoyaltyProgress } from "@/lib/loyalty";
import { formatMoney, Money } from "@/components/shared/money";
import { PackageProgress } from "@/components/shared/package-progress";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, StatusDot } from "@/components/shared/status";

import { markArrived, undoArrived } from "../../randevular/actions";
import { addCustomerNote } from "../interaction-actions";
import { CustomerActions } from "../customer-actions";
import { AppointmentSheet, PaymentSheet } from "../customer-sheets";
import {
  DAY,
  INTERACTION_LABEL,
  apptWhen,
  telHref,
  waLink,
  type CustomerAbilities,
} from "../customer-types";

export type ApptItem = {
  id: string;
  starts_at: string;
  status: string | null;
  price: number | null;
  package_id: string | null;
  arrived_at: string | null;
  service: { name: string; duration_min: number | null; price: number | null } | null;
  staff_member: { full_name: string } | null;
};

const INTERACTION_ICON: Record<string, LucideIcon> = {
  mesaj: MessageCircle,
  arama: Phone,
  randevu_olusturuldu: Calendar,
  randevu_tamamlandi: CalendarCheck,
  not: FileText,
  asama_degisikligi: ArrowRightLeft,
};

const HISTORY_LIMIT = 6;
const NOTE_LIMIT = 4;

export function Customer360View({
  customer,
  appointments,
  packages,
  payments,
  interactions,
  services,
  staff,
  assigneeName,
  abilities,
  canArrive,
  loadFailed,
  balance,
  rhythm = null,
  loyalty = null,
}: {
  customer: Customer;
  appointments: ApptItem[];
  packages: Package[];
  payments: Payment[];
  interactions: Interaction[];
  services: { id: string; name: string; price: number | null }[];
  staff: { id: string; full_name: string }[];
  assigneeName: string | null;
  abilities: CustomerAbilities;
  canArrive: boolean;
  loadFailed: boolean;
  /** Açık borç: customer_balances tek kaynağından (0031). */
  balance: number;
  /** Ziyaret ritmi ve müşteri puanı (0035); lead'lerde yok. */
  rhythm?: Rhythm | null;
  /** Sadakat kartı (0040); kapalıysa yok. */
  loyalty?: { progress: LoyaltyProgress; reward: string | null } | null;
}) {
  const router = useRouter();
  const [nowMs] = useState(() => Date.now());
  const [apptOpen, setApptOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [allHistory, setAllHistory] = useState(false);
  const [allNotes, setAllNotes] = useState(false);

  const showMoney = abilities.pay;
  const tr = zonedParts(nowMs); // gün başlangıcı İstanbul saatine göre
  const startOfToday = new Date(zonedWallToUtcMs(tr.y, tr.m, tr.d, 0, 0));

  const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const openDebt = Math.max(balance, 0);

  // Yaklaşan: bugünden itibaren planlı ya da gelmiş (bugün gelen müşteri de görünür).
  const upcoming = appointments
    .filter(
      (a) =>
        new Date(a.starts_at).getTime() >= startOfToday.getTime() &&
        (a.status === "planned" || a.status === "arrived")
    )
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const upcomingIds = new Set(upcoming.map((a) => a.id));
  const history = appointments.filter((a) => !upcomingIds.has(a.id));
  const shownHistory = allHistory ? history : history.slice(0, HISTORY_LIMIT);

  const lastVisit = customer.last_visit_at;
  const daysSinceVisit = lastVisit ? Math.floor((nowMs - new Date(lastVisit).getTime()) / DAY) : null;

  const notes = interactions.filter((i) => i.type === "not");
  const contacts = interactions.filter((i) => i.type !== "not");
  const shownNotes = allNotes ? notes : notes.slice(0, NOTE_LIMIT);

  const pkgOpts = packages.map((p) => ({
    id: p.id,
    customer_id: p.customer_id,
    service_name: p.service_name,
    remaining_sessions: p.remaining_sessions,
  }));

  function submitNote(e: React.FormEvent) {
    e.preventDefault();
    const v = note.trim();
    if (!v) return;
    startTransition(async () => {
      const res = await addCustomerNote(customer.id, v);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Not eklendi");
        setNote("");
        router.refresh();
      }
    });
  }

  async function arrive(a: ApptItem) {
    const res = await markArrived(a.id);
    if (res.error) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    router.refresh();
    toastUndo(`${customer.full_name} geldi`, () => {
      void undoArrived(a.id).then((r) => {
        if (r.error) toast.error(r.error);
        else router.refresh();
      });
    });
  }

  async function undo(a: ApptItem) {
    const res = await undoArrived(a.id);
    if (res.error) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    router.refresh();
  }

  const header = (
    <PageHeader
      eyebrow={
        <Link href="/musteriler" className="focus-ring inline-flex items-center gap-0.5 rounded">
          <ChevronLeft aria-hidden className="size-3.5" />
          Müşteriler
        </Link>
      }
      title={customer.full_name}
      description={customer.is_lead ? "Henüz müşteriye dönüşmemiş bir lead" : undefined}
      secondary={
        abilities.pay ? <ToolbarAction icon={Banknote} label="Ödeme al" onClick={() => setPayOpen(true)} /> : undefined
      }
      primary={
        abilities.book ? (
          <ToolbarAction prominent icon={Plus} label="Yeni randevu" onClick={() => setApptOpen(true)} />
        ) : undefined
      }
    />
  );

  if (loadFailed) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState
          title="Müşteri bilgileri yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Biraz sonra tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      {/* Kimlik: avatar, durum, iletişim, hızlı eylemler */}
      <section aria-label="Müşteri bilgileri" className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar name={customer.full_name} size="xl" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {customer.is_lead ? (
                <Badge variant="warning">Lead</Badge>
              ) : (
                <StatusDot variant={customerStatusVariant(customer.status)}>{customerStatusLabel(customer.status)}</StatusDot>
              )}
              {(customer.tags ?? []).map((t) => (
                <Badge key={t} variant="tag">
                  {t}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem] text-label-2">
              {customer.phone && (
                <a href={telHref(customer.phone)} className="focus-ring rounded whitespace-nowrap text-primary-text tabular-nums">
                  {customer.phone}
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="focus-ring max-w-full truncate rounded text-primary-text"
                  title={customer.email}
                >
                  {customer.email}
                </a>
              )}
              {customer.source && <span className="whitespace-nowrap">Geldiği yer: {customer.source}</span>}
              {assigneeName && <span className="whitespace-nowrap">Sorumlu: {assigneeName}</span>}
              {customer.birthday && <span className="whitespace-nowrap">Doğum günü: {formatDate(customer.birthday)}</span>}
            </div>
            {customer.note && <p className="max-w-2xl text-[0.9375rem] text-label-2w">{customer.note}</p>}
          </div>
          {abilities.manage && (
            <CustomerActions customer={customer} onDeleted={() => router.push("/musteriler")} className="shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {abilities.pay && (
            <Button variant="tinted" className="md:hidden" onClick={() => setPayOpen(true)}>
              <Banknote />
              Ödeme al
            </Button>
          )}
          {customer.phone && (
            <>
              <Button asChild variant="secondary">
                <a href={waLink(customer.phone)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href={telHref(customer.phone)}>
                  <Phone />
                  Ara
                </a>
              </Button>
            </>
          )}
        </div>
      </section>

      <MetricStrip aria-label="Müşteri özeti">
        {showMoney && <Metric label="Toplam ödeme" value={formatMoney(totalPaid)} context="şimdiye kadar" />}
        {showMoney && (
          <Metric
            label="Açık borç"
            value={formatMoney(openDebt)}
            tone={openDebt > 0 ? "danger" : "default"}
            context={openDebt > 0 ? "tahsil edilecek" : "borç yok"}
          />
        )}
        <Metric label="Randevu" value={String(appointments.length)} context="toplam" />
        <Metric
          label="Son ziyaret"
          value={lastVisit ? formatDate(lastVisit) : "Henüz yok"}
          context={daysSinceVisit !== null ? (daysSinceVisit <= 0 ? "bugün" : `${daysSinceVisit} gün önce`) : undefined}
        />
      </MetricStrip>

      {rhythm && <RhythmCard rhythm={rhythm} />}
      {loyalty && (
        <LoyaltyCard customerId={customer.id} progress={loyalty.progress} reward={loyalty.reward} canRedeem={abilities.manage} />
      )}

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-8">
          <ListGroup title="Yaklaşan randevular" detail={upcoming.length ? `${upcoming.length} randevu` : undefined}>
            {upcoming.length === 0 ? (
              <li>
                <EmptyState
                  variant="inline"
                  icon={CalendarPlus}
                  title="Yaklaşan randevu yok"
                  description="Bu müşteriye yeni bir randevu verebilirsiniz."
                  action={
                    abilities.book ? (
                      <Button onClick={() => setApptOpen(true)}>
                        <Plus />
                        Yeni randevu
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            ) : (
              upcoming.map((a) => {
                const w = apptWhen(a.starts_at, nowMs);
                const arrived = a.status === "arrived";
                const canMark = canArrive && w.today;
                return (
                  <ListRow
                    key={a.id}
                    title={`${w.day} ${w.time}`}
                    subtitle={[a.service?.name, a.staff_member?.full_name].filter(Boolean).join(" · ") || "Hizmet belirtilmedi"}
                    trailing={
                      canMark ? (
                        <GeldiButton
                          size="sm"
                          arrived={arrived}
                          customerName={customer.full_name}
                          onArrive={() => arrive(a)}
                          onUndo={() => undo(a)}
                        />
                      ) : arrived ? (
                        <StatusBadge variant="positive">Geldi{a.arrived_at ? ` · ${formatTime(a.arrived_at)}` : ""}</StatusBadge>
                      ) : null
                    }
                  />
                );
              })
            )}
          </ListGroup>

          <ListGroup
            title="Randevu geçmişi"
            detail={history.length ? `${history.length} randevu` : undefined}
            footer={
              history.length > HISTORY_LIMIT ? (
                <Button variant="plain" size="sm" className="-mx-2" onClick={() => setAllHistory((v) => !v)}>
                  {allHistory ? "Daha az göster" : `Tümünü göster (${history.length})`}
                </Button>
              ) : undefined
            }
          >
            {history.length === 0 ? (
              <li>
                <EmptyState variant="inline" icon={Calendar} title="Henüz geçmiş randevu yok" />
              </li>
            ) : (
              shownHistory.map((a) => (
                <ListRow
                  key={a.id}
                  title={formatDateTime(a.starts_at)}
                  subtitle={
                    [a.service?.name, a.service?.duration_min ? `${a.service.duration_min} dk` : null, a.staff_member?.full_name]
                      .filter(Boolean)
                      .join(" · ") || "Hizmet belirtilmedi"
                  }
                  trailing={
                    <>
                      {showMoney && a.price != null && <Money amount={a.price} tone="muted" />}
                      <StatusBadge variant={appointmentStatusVariant(a.status)}>{appointmentStatusLabel(a.status)}</StatusBadge>
                    </>
                  }
                />
              ))
            )}
          </ListGroup>

          <ListGroup title="Notlar" detail={notes.length ? `${notes.length} not` : undefined}>
            <li className="p-3">
              <form onSubmit={submitNote} className="flex gap-2">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Not yazın"
                  aria-label="Yeni not"
                />
                <Button type="submit" variant="tinted" disabled={pending || !note.trim()}>
                  Not ekle
                </Button>
              </form>
            </li>
            {shownNotes.map((n) => (
              <ListRow
                key={n.id}
                leading={<StickyNote aria-hidden className="size-5 text-label-2" />}
                title={<span className="whitespace-normal">{n.note}</span>}
                trailing={<span className="text-subhead text-label-2">{formatDate(n.created_at)}</span>}
                className="items-start"
              />
            ))}
            {notes.length > NOTE_LIMIT && (
              <li className="px-4 py-1">
                <Button variant="plain" size="sm" className="-mx-2" onClick={() => setAllNotes((v) => !v)}>
                  {allNotes ? "Daha az göster" : `Tüm notlar (${notes.length})`}
                </Button>
              </li>
            )}
          </ListGroup>
        </div>

        <div className="min-w-0 space-y-8">
          <ListGroup title="Paketler" detail={packages.length ? `${packages.length} paket` : undefined}>
            {packages.length === 0 ? (
              <li>
                <EmptyState
                  variant="inline"
                  icon={PackageIcon}
                  title="Paket yok"
                  description="Bu müşterinin satın aldığı paket görünmüyor."
                  action={
                    abilities.pay ? (
                      <Button asChild variant="secondary">
                        <Link href="/paketler">Paketler</Link>
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            ) : (
              packages.map((p) => {
                const total = p.total_sessions ?? 0;
                const left = p.remaining_sessions ?? 0;
                const debt = Math.max((p.price ?? 0) - (p.paid_amount ?? 0), 0);
                return (
                  <li key={p.id} className="space-y-2 px-4 py-3">
                    <PackageProgress
                      label={<span className="font-semibold">{p.service_name ?? "Paket"}</span>}
                      used={Math.max(total - left, 0)}
                      total={total}
                      className="max-w-none"
                    />
                    <div className="flex items-center justify-between gap-3 text-subhead text-label-2">
                      <span className="truncate">{formatDate(p.purchased_at)}</span>
                      {showMoney && (
                        <span className="flex shrink-0 items-center gap-2">
                          <Money amount={p.price ?? 0} tone="muted" />
                          {debt > 0 ? (
                            <Money amount={debt} tone="debt" suffix="kaldı" />
                          ) : (
                            <StatusBadge variant={paymentStatusVariant(p.payment_status)}>
                              {paymentStatusLabel(p.payment_status)}
                            </StatusBadge>
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ListGroup>

          {showMoney && (
            <ListGroup
              title="Ödemeler"
              detail={openDebt > 0 ? undefined : payments.length ? `${payments.length} ödeme` : undefined}
              action={openDebt > 0 ? <Money amount={openDebt} tone="debt" suffix="açık borç" /> : undefined}
            >
              {payments.length === 0 ? (
                <li>
                  <EmptyState
                    variant="inline"
                    icon={Banknote}
                    title="Henüz ödeme yok"
                    description={openDebt > 0 ? "Açık borç için ödeme alabilirsiniz." : undefined}
                    action={
                      <Button onClick={() => setPayOpen(true)}>
                        <Banknote />
                        Ödeme al
                      </Button>
                    }
                  />
                </li>
              ) : (
                payments.map((p) => (
                  <ListRow
                    key={p.id}
                    title={formatDate(p.created_at)}
                    subtitle={`${paymentMethodLabel(p.method)}${p.note ? ` · ${p.note}` : ""}`}
                    trailing={<Money amount={p.amount} />}
                  />
                ))
              )}
            </ListGroup>
          )}

          <ListGroup title="İletişim geçmişi" detail={contacts.length ? `${contacts.length} kayıt` : undefined}>
            {contacts.length === 0 ? (
              <li>
                <EmptyState
                  variant="inline"
                  icon={MessageCircle}
                  title="Henüz iletişim kaydı yok"
                  description="Mesaj, arama ve randevu hareketleri burada listelenir."
                />
              </li>
            ) : (
              contacts.slice(0, 12).map((it) => {
                const Icon = INTERACTION_ICON[it.type] ?? FileText;
                return (
                  <ListRow
                    key={it.id}
                    leading={<Icon aria-hidden className="size-5 text-label-2" />}
                    title={INTERACTION_LABEL[it.type] ?? "Hareket"}
                    subtitle={it.note ?? undefined}
                    trailing={<span className="text-subhead text-label-2">{formatDateTime(it.created_at)}</span>}
                  />
                );
              })
            )}
          </ListGroup>
        </div>
      </div>

      <AppointmentSheet
        customer={customer}
        open={apptOpen}
        onOpenChange={setApptOpen}
        services={services}
        staff={staff}
        packages={pkgOpts}
      />
      <PaymentSheet customer={customer} open={payOpen} onOpenChange={setPayOpen} packages={pkgOpts} />
    </div>
  );
}
