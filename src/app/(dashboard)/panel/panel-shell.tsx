"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, Plus } from "lucide-react";

import { useUrlState } from "@/lib/use-url-state";
import { PageHeader } from "@/components/shared/page-header";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  AppointmentForm,
  type CustomerOption as ApptCustomer,
  type PackageOption as ApptPackage,
  type ServiceOption,
  type StaffOption,
} from "../randevular/appointment-form";
import {
  PaymentForm,
  type CustomerOption as PayCustomer,
  type PackageOption as PayPackage,
} from "../tahsilat/payment-form";
import { PERIODS, type PeriodKey } from "./dates";

type PanelActions = {
  openAppointment: () => void;
  /** `customerId` verilirse ödeme formu o müşteriyle açılır. */
  openPayment: (customerId?: string) => void;
};

const Ctx = React.createContext<PanelActions | null>(null);

/** Panel içindeki "Yeni randevu" ve "Ödeme al" formlarını açar (yetki yoksa null). */
export function usePanelActions() {
  return React.useContext(Ctx);
}

export type PanelFormData = {
  customers: { id: string; full_name: string; is_lead: boolean }[];
  services: ServiceOption[];
  staff: StaffOption[];
  packages: (ApptPackage & PayPackage)[];
};

/**
 * Sayfa iskeleti: başlık (eyebrow, "Genel Bakış", dönem seçici), araç çubuğu
 * (arama · Ödeme al · Yeni randevu) ve bu iki eylemin açtığı formlar.
 * Sayfanın geri kalanı `children` olarak gelir ve eylemleri bağlamdan alır.
 */
export function PanelShell({
  eyebrow,
  canCreateAppointment,
  canCollect,
  canSearch,
  form,
  children,
}: {
  eyebrow: string;
  canCreateAppointment: boolean;
  canCollect: boolean;
  canSearch: boolean;
  form: PanelFormData;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [dRaw, setD] = useUrlState("d", "ay");
  const period = (PERIODS.find((p) => p.key === dRaw)?.key ?? "ay") as PeriodKey;
  const [q, setQ] = React.useState("");
  const [apptOpen, setApptOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payCustomer, setPayCustomer] = React.useState<string | undefined>();

  const actions = React.useMemo<PanelActions>(
    () => ({
      openAppointment: () => setApptOpen(true),
      openPayment: (customerId) => {
        setPayCustomer(customerId);
        setPayOpen(true);
      },
    }),
    []
  );

  const apptCustomers: ApptCustomer[] = form.customers.map((c) => ({ id: c.id, full_name: c.full_name }));
  const payCustomers: PayCustomer[] = form.customers
    .filter((c) => !c.is_lead)
    .map((c) => ({ id: c.id, full_name: c.full_name }));

  return (
    <Ctx.Provider value={actions}>
      <div className="space-y-8">
        <PageHeader
          eyebrow={eyebrow}
          title="Genel Bakış"
          context={
            <SegmentedControl
              aria-label="Dönem"
              fullWidth
              size="md"
              items={PERIODS.map((p) => ({ value: p.key, label: p.label }))}
              value={period}
              onValueChange={(v) => setD(v)}
            />
          }
          search={
            canSearch ? (
              <SearchField
                variant="glass"
                value={q}
                onValueChange={setQ}
                placeholder="Müşteri ara"
                className="w-[13.75rem] lg:w-[16.25rem]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) {
                    router.push(`/musteriler?q=${encodeURIComponent(q.trim())}`);
                  }
                }}
              />
            ) : undefined
          }
          secondary={
            canCollect ? (
              <ToolbarAction icon={Banknote} label="Ödeme al" mobile="label" onClick={() => actions.openPayment()} />
            ) : undefined
          }
          primary={
            canCreateAppointment ? (
              <ToolbarAction prominent icon={Plus} label="Yeni randevu" onClick={() => actions.openAppointment()} />
            ) : undefined
          }
        />
        {children}
      </div>

      {canCreateAppointment && (
        <Sheet open={apptOpen} onOpenChange={setApptOpen}>
          <SheetContent side="auto">
            <SheetHeader>
              <SheetTitle>Yeni randevu</SheetTitle>
              <SheetDescription>Müşteri, hizmet ve saati seçin.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <AppointmentForm
                customers={apptCustomers}
                services={form.services}
                staff={form.staff}
                packages={form.packages}
                onSuccess={() => {
                  setApptOpen(false);
                  router.refresh();
                }}
                onCancel={() => setApptOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {canCollect && (
        <Sheet open={payOpen} onOpenChange={setPayOpen}>
          <SheetContent side="auto">
            <SheetHeader>
              <SheetTitle>Ödeme al</SheetTitle>
              <SheetDescription>Müşteriyi seçin, tutarı ve ödeme yöntemini girin.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <PaymentForm
                key={payCustomer ?? "yeni"}
                customers={payCustomers}
                packages={form.packages}
                initial={payCustomer ? { customer_id: payCustomer } : undefined}
                onSuccess={() => {
                  setPayOpen(false);
                  router.refresh();
                }}
                onCancel={() => setPayOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </Ctx.Provider>
  );
}
