"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AppointmentForm,
  type CustomerOption,
  type ServiceOption,
  type StaffOption,
} from "./appointment-form";

export function NewAppointmentButton({
  customers,
  services,
  staff,
}: {
  customers: CustomerOption[];
  services: ServiceOption[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={customers.length === 0}>
          <Plus className="size-4" />
          Yeni randevu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni randevu</DialogTitle>
        </DialogHeader>
        <AppointmentForm
          customers={customers}
          services={services}
          staff={staff}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
