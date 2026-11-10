"use client";

import { useRouter } from "next/navigation";

import { FormSheet } from "@/components/shared/form-sheet";
import type { Customer } from "@/types/database";

import { AppointmentForm } from "../randevular/appointment-form";
import { PaymentForm } from "../tahsilat/payment-form";
import { CustomerForm } from "./customer-form";
import { CustomerCreateForm } from "./customer-create-form";
import type { PackageOption, ServiceOption, StaffOption } from "./customer-types";

export function CustomerCreateSheet({
  open,
  onOpenChange,
  services,
  tags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services?: string[];
  tags?: string[];
}) {
  const router = useRouter();
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Yeni müşteri">
      <CustomerCreateForm
        services={services}
        tags={tags}
        onSuccess={() => {
          onOpenChange(false);
          router.refresh();
        }}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  );
}

export function CustomerEditSheet({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Müşteriyi düzenle" description={customer.full_name}>
      <CustomerForm
        customer={customer}
        onSuccess={() => {
          onOpenChange(false);
          router.refresh();
        }}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  );
}

export function AppointmentSheet({
  customer,
  open,
  onOpenChange,
  services,
  staff,
  packages,
}: {
  customer: Pick<Customer, "id" | "full_name">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceOption[];
  staff: StaffOption[];
  packages: PackageOption[];
}) {
  const router = useRouter();
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Yeni randevu" description={customer.full_name}>
      <AppointmentForm
        customers={[{ id: customer.id, full_name: customer.full_name }]}
        services={services}
        staff={staff}
        packages={packages.filter((p) => p.customer_id === customer.id)}
        presetCustomerId={customer.id}
        onSuccess={() => {
          onOpenChange(false);
          router.refresh();
        }}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  );
}

export function PaymentSheet({
  customer,
  open,
  onOpenChange,
  packages,
}: {
  customer: Pick<Customer, "id" | "full_name">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: PackageOption[];
}) {
  const router = useRouter();
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Ödeme al" description={customer.full_name}>
      <PaymentForm
        customers={[{ id: customer.id, full_name: customer.full_name }]}
        packages={packages.filter((p) => p.customer_id === customer.id)}
        initial={{ customer_id: customer.id }}
        onSuccess={() => {
          onOpenChange(false);
          router.refresh();
        }}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  );
}
