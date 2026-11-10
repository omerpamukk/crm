"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AppointmentForm,
  type CustomerOption,
  type ServiceOption,
  type StaffOption,
  type PackageOption,
} from "./appointment-form";

/**
 * "Yeni randevu" düğmesi + formu (telefonda alt sayfa, masaüstünde sağ panel).
 * Dışa açık API'si (ad ve prop'lar) değişmedi.
 */
export function NewAppointmentButton({
  customers,
  services,
  staff,
  packages,
}: {
  customers: CustomerOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  packages: PackageOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button disabled={customers.length === 0}>
          <Plus />
          Yeni randevu
        </Button>
      </SheetTrigger>
      <SheetContent side="auto">
        <SheetHeader>
          <SheetTitle>Yeni randevu</SheetTitle>
          <SheetDescription>Müşteri, hizmet ve saati seçin.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-5">
          <AppointmentForm
            customers={customers}
            services={services}
            staff={staff}
            packages={packages}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
