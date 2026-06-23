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
  PaymentForm,
  type CustomerOption,
  type PackageOption,
} from "./payment-form";

export function NewPaymentButton({
  customers,
  packages,
}: {
  customers: CustomerOption[];
  packages: PackageOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={customers.length === 0}>
          <Plus className="size-4" />
          Ödeme al
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ödeme al</DialogTitle>
        </DialogHeader>
        <PaymentForm
          customers={customers}
          packages={packages}
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
