"use client";

import { useRouter } from "next/navigation";

import { FormSheet } from "@/components/shared/form-sheet";

import { PaymentForm, type CustomerOption, type PackageOption } from "./payment-form";

/**
 * "Ödeme al" formu: telefonda alt sayfa, masaüstünde sağ panel.
 * Satışlar, Paketler ve Cari Hesap aynı kabuğu kullanır.
 * `initial` verilirse müşteri (ve varsa paket, tutar) önceden seçilir.
 */
export function PaymentSheet({
  open,
  onOpenChange,
  customers,
  packages,
  initial,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerOption[];
  packages: PackageOption[];
  initial?: { customer_id?: string; package_id?: string; amount?: string };
  description?: string;
}) {
  const router = useRouter();
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ödeme al"
      description={description ?? "Müşteriyi, tutarı ve yöntemi seçin."}
    >
      <PaymentForm
        customers={customers}
        packages={packages}
        initial={initial}
        onSuccess={() => {
          onOpenChange(false);
          router.refresh();
        }}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  );
}
