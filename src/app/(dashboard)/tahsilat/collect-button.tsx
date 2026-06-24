"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentForm } from "./payment-form";

export function CollectButton({
  customerId,
  customerName,
  packageId,
  serviceName,
  remaining,
}: {
  customerId: string;
  customerName: string;
  packageId: string;
  serviceName: string;
  remaining: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <Banknote className="size-3.5" />
        Tahsil Et
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tahsilat — {customerName}</DialogTitle>
        </DialogHeader>
        <PaymentForm
          customers={[{ id: customerId, full_name: customerName }]}
          packages={[{ id: packageId, customer_id: customerId, service_name: serviceName }]}
          initial={{
            customer_id: customerId,
            package_id: packageId,
            amount: remaining > 0 ? String(remaining) : "",
          }}
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
