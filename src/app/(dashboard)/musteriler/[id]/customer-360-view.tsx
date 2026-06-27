"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  CalendarPlus,
  Banknote,
  Package as PackageIcon,
  Wallet,
  CalendarCheck,
  Coins,
  Clock,
  Sparkles,
  ArrowRight,
  UserCircle2,
  Calendar,
  FileText,
  ArrowRightLeft,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatPrice, formatDate, formatDateTime } from "@/lib/format";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
  customerStatusLabel,
  customerStatusVariant,
  paymentStatusLabel,
  paymentStatusVariant,
  paymentMethodLabel,
} from "@/lib/constants";
import type { Customer, Package, Payment, Interaction } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { AppointmentForm } from "../../randevular/appointment-form";
import { PaymentForm } from "../../tahsilat/payment-form";
import { addCustomerNote } from "../interaction-actions";

export type ApptItem = {
  id: string;
  starts_at: string;
  status: string | null;
  price: number | null;
  package_id: string | null;
  service: { name: string; duration_min: number | null; price: number | null } | null;
  staff_member: { full_name: string } | null;
};

const DAY = 86_400_000;

const INTERACTION_META: Record<string, { icon: typeof Calendar; tone: string; label: string }> = {
  mesaj: { icon: MessageCircle, tone: "bg-primary/10 text-primary", label: "Mesaj" },
  arama: { icon: Phone, tone: "bg-sky-100 text-sky-600", label: "Arama" },
  randevu_olusturuldu: { icon: Calendar, tone: "bg-violet-100 text-violet-600", label: "Randevu oluşturuldu" },
  randevu_tamamlandi: { icon: CalendarCheck, tone: "bg-positive/10 text-positive", label: "Randevu tamamlandı" },
  not: { icon: FileText, tone: "bg-amber-100 text-amber-600", label: "Not" },
  asama_degisikligi: { icon: ArrowRightLeft, tone: "bg-muted text-muted-foreground", label: "Aşama değişikliği" },
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

function waLink(phone: string) {
  const d = phone.replace(/\D/g, "");
  const n = d.startsWith("90") ? d : d.startsWith("0") ? `90${d.slice(1)}` : `90${d}`;
  return `https://wa.me/${n}`;
}

export function Customer360View({
  customer,
  appointments,
  packages,
  payments,
  interactions,
  services,
  staff,
  assigneeName,
}: {
  customer: Customer;
  appointments: ApptItem[];
  packages: Package[];
  payments: Payment[];
  interactions: Interaction[];
  services: { id: string; name: string; price: number | null }[];
  staff: { id: string; full_name: string }[];
  assigneeName: string | null;
}) {
  const router = useRouter();
  const [nowMs] = useState(() => Date.now());
  const [apptOpen, setApptOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  // Metrikler
  const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const openDebt = packages.reduce((s, p) => s + Math.max((p.price ?? 0) - (p.paid_amount ?? 0), 0), 0);
  const activePackages = packages.filter((p) => (p.remaining_sessions ?? 0) > 0);
  const upcoming = appointments
    .filter((a) => new Date(a.starts_at).getTime() > nowMs && a.status === "planned")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const nextAppt = upcoming[0] ?? null;
  const lastVisit = customer.last_visit_at;
  const daysSinceVisit = lastVisit ? Math.floor((nowMs - new Date(lastVisit).getTime()) / DAY) : null;

  // Önerilen sonraki aksiyon
  const reco = (() => {
    if (openDebt > 0)
      return { tone: "danger" as const, icon: Wallet, text: `${formatPrice(openDebt)} açık borç var — tahsilat zamanı.`, action: () => setPayOpen(true), actionLabel: "Ödeme Al" };
    if (nextAppt)
      return { tone: "info" as const, icon: CalendarCheck, text: `Sıradaki randevu: ${formatDateTime(nextAppt.starts_at)}${nextAppt.service?.name ? ` · ${nextAppt.service.name}` : ""}.`, action: null, actionLabel: null };
    if (activePackages.some((p) => (p.remaining_sessions ?? 0) <= 2))
      return { tone: "warning" as const, icon: PackageIcon, text: `Paketi bitmek üzere — yenileme teklifi sun.`, action: () => setApptOpen(true), actionLabel: "Randevu Ver" };
    if (daysSinceVisit !== null && daysSinceVisit >= 60)
      return { tone: "warning" as const, icon: Clock, text: `Son ziyaret ${daysSinceVisit} gün önce — geri kazanım için iletişime geç.`, action: customer.phone ? () => window.open(waLink(customer.phone as string), "_blank") : null, actionLabel: customer.phone ? "WhatsApp" : null };
    return { tone: "info" as const, icon: Sparkles, text: `Aktif bir randevu yok — yeni randevu önererek bağı sürdür.`, action: () => setApptOpen(true), actionLabel: "Randevu Ver" };
  })();

  function submitNote() {
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

  const customerOpt = [{ id: customer.id, full_name: customer.full_name }];
  const pkgOpts = packages.map((p) => ({ id: p.id, customer_id: p.customer_id, service_name: p.service_name, remaining_sessions: p.remaining_sessions }));

  const metrics = [
    { label: "Yaşam Boyu Değer", value: formatPrice(totalPaid), icon: Coins, tone: "bg-positive/10 text-positive", bar: "border-l-positive" },
    { label: "Açık Borç", value: formatPrice(openDebt), icon: Wallet, tone: openDebt > 0 ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground", bar: openDebt > 0 ? "border-l-danger" : "border-l-border", accent: openDebt > 0 ? "text-danger" : "" },
    { label: "Toplam Randevu", value: String(appointments.length), icon: CalendarCheck, tone: "bg-primary/10 text-primary", bar: "border-l-primary" },
    { label: "Son Ziyaret", value: lastVisit ? formatDate(lastVisit) : "—", icon: Clock, tone: "bg-sky-100 text-sky-600", bar: "border-l-sky-400", sub: daysSinceVisit !== null ? `${daysSinceVisit} gün önce` : undefined },
  ];

  return (
    <div className="space-y-6">
      <Link href="/musteriler" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Müşteriler
      </Link>

      {/* Profil başlığı */}
      <Card className="card-accent border-l-primary">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-lg font-bold text-white">
              {initials(customer.full_name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{customer.full_name}</h1>
                {customer.is_lead ? (
                  <Badge variant="warning">Lead</Badge>
                ) : (
                  <Badge variant={customerStatusVariant(customer.status)}>{customerStatusLabel(customer.status)}</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {customer.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{customer.phone}</span>}
                {customer.email && <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{customer.email}</span>}
                {customer.source && <span>· {customer.source}</span>}
                {assigneeName && <span className="inline-flex items-center gap-1"><UserCircle2 className="size-3.5" />{assigneeName}</span>}
              </div>
              {customer.tags && customer.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {customer.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              )}
            </div>
          </div>

          {/* Hızlı aksiyonlar */}
          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <>
                <Button variant="outline" size="sm" asChild><a href={waLink(customer.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4 text-positive" />WhatsApp</a></Button>
                <Button variant="outline" size="sm" asChild><a href={`tel:${customer.phone}`}><Phone className="size-4" />Ara</a></Button>
              </>
            )}
            <Button size="sm" onClick={() => setApptOpen(true)}><CalendarPlus className="size-4" />Randevu</Button>
            <Button size="sm" onClick={() => setPayOpen(true)}><Banknote className="size-4" />Ödeme Al</Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrikler */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className={cn("card-accent", m.bar)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{m.label}</span>
                  <span className={cn("flex size-8 items-center justify-center rounded-lg", m.tone)}><Icon className="size-4" /></span>
                </div>
                <p className={cn("mt-2 text-xl font-bold tracking-tight", m.accent)}>{m.value}</p>
                {m.sub && <p className="text-xs text-muted-foreground">{m.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Önerilen aksiyon */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 bg-card p-4 shadow-soft",
        reco.tone === "danger" && "border-l-danger",
        reco.tone === "warning" && "border-l-warning",
        reco.tone === "info" && "border-l-primary"
      )}>
        <div className="flex items-center gap-3">
          <span className={cn("flex size-9 items-center justify-center rounded-lg",
            reco.tone === "danger" ? "bg-danger/10 text-danger" : reco.tone === "warning" ? "bg-warning/12 text-amber-600" : "bg-primary/10 text-primary")}>
            <reco.icon className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Önerilen Sonraki Aksiyon</p>
            <p className="text-sm font-medium">{reco.text}</p>
          </div>
        </div>
        {reco.action && reco.actionLabel && (
          <Button size="sm" onClick={reco.action}>{reco.actionLabel}<ArrowRight className="size-4" /></Button>
        )}
      </div>

      {/* Sekmeler */}
      <Tabs defaultValue="genel">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="genel">Genel</TabsTrigger>
            <TabsTrigger value="randevular">Randevular ({appointments.length})</TabsTrigger>
            <TabsTrigger value="paketler">Paketler ({packages.length})</TabsTrigger>
            <TabsTrigger value="odemeler">Ödemeler ({payments.length})</TabsTrigger>
            <TabsTrigger value="zaman">Zaman Çizelgesi</TabsTrigger>
          </TabsList>
        </div>

        {/* GENEL */}
        <TabsContent value="genel" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 p-5">
                <p className="flex items-center gap-2 font-semibold"><CalendarCheck className="size-4 text-primary" />Sıradaki Randevu</p>
                {nextAppt ? (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">{formatDateTime(nextAppt.starts_at)}</p>
                    <p className="text-sm text-muted-foreground">{nextAppt.service?.name ?? "Hizmet belirtilmedi"}{nextAppt.staff_member?.full_name ? ` · ${nextAppt.staff_member.full_name}` : ""}</p>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Planlı randevu yok.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-5">
                <p className="flex items-center gap-2 font-semibold"><PackageIcon className="size-4 text-primary" />Aktif Paketler</p>
                {activePackages.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Aktif paket yok.</p>
                ) : (
                  <ul className="space-y-2">
                    {activePackages.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                        <span className="font-medium">{p.service_name ?? "Paket"}</span>
                        <span className="text-muted-foreground">{p.remaining_sessions}/{p.total_sessions} seans</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RANDEVULAR */}
        <TabsContent value="randevular" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {appointments.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Henüz randevu yok.</p>
              ) : (
                <ul className="divide-y">
                  {appointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{formatDateTime(a.starts_at)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.service?.name ?? "Hizmet belirtilmedi"}
                          {a.service?.duration_min ? ` · ${a.service.duration_min} dk` : ""}
                          {a.staff_member?.full_name ? ` · ${a.staff_member.full_name}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {a.price != null && <span className="text-sm font-medium tabular-nums">{formatPrice(a.price)}</span>}
                        <Badge variant={appointmentStatusVariant(a.status)}>{appointmentStatusLabel(a.status)}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAKETLER */}
        <TabsContent value="paketler" className="mt-4">
          {packages.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Henüz paket yok.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((p) => {
                const debt = Math.max((p.price ?? 0) - (p.paid_amount ?? 0), 0);
                return (
                  <Card key={p.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{p.service_name ?? "Paket"}</p>
                        <Badge variant={paymentStatusVariant(p.payment_status)}>{paymentStatusLabel(p.payment_status)}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{p.remaining_sessions}/{p.total_sessions} seans kaldı</span>
                        <span>{formatDate(p.purchased_at)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Fiyat: <span className="font-medium text-foreground">{formatPrice(p.price)}</span></span>
                        {debt > 0 ? <span className="font-medium text-danger">Kalan: {formatPrice(debt)}</span> : <span className="font-medium text-positive">Ödendi</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ÖDEMELER */}
        <TabsContent value="odemeler" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Henüz ödeme yok.</p>
              ) : (
                <ul className="divide-y">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{formatDate(p.created_at)}</p>
                        <p className="text-xs text-muted-foreground">{paymentMethodLabel(p.method)}{p.note ? ` · ${p.note}` : ""}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-positive">{formatPrice(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ZAMAN ÇİZELGESİ */}
        <TabsContent value="zaman" className="mt-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              {/* Not ekleme */}
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }}
                  placeholder="Not ekle (Enter ile kaydet)…"
                  className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                />
                <Button onClick={submitNote} disabled={pending || !note.trim()}><Send className="size-4" />Ekle</Button>
              </div>

              {interactions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Henüz etkileşim kaydı yok.</p>
              ) : (
                <ul className="space-y-3">
                  {interactions.map((it) => {
                    const meta = INTERACTION_META[it.type] ?? INTERACTION_META.not;
                    const Icon = meta.icon;
                    return (
                      <li key={it.id} className="flex gap-3">
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}><Icon className="size-4" /></span>
                        <div className="min-w-0 flex-1 border-b pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{meta.label}</span>
                            <span className="text-xs text-muted-foreground">{formatDateTime(it.created_at)}</span>
                          </div>
                          {it.note && <p className="mt-0.5 text-sm text-muted-foreground">{it.note}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Randevu modalı */}
      <Dialog open={apptOpen} onOpenChange={setApptOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Yeni Randevu — {customer.full_name}</DialogTitle></DialogHeader>
          <AppointmentForm
            customers={customerOpt}
            services={services}
            staff={staff}
            packages={pkgOpts}
            presetCustomerId={customer.id}
            onSuccess={() => { setApptOpen(false); router.refresh(); }}
            onCancel={() => setApptOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Ödeme modalı */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Ödeme Al — {customer.full_name}</DialogTitle></DialogHeader>
          <PaymentForm
            customers={customerOpt}
            packages={pkgOpts}
            initial={{ customer_id: customer.id }}
            onSuccess={() => { setPayOpen(false); router.refresh(); }}
            onCancel={() => setPayOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
