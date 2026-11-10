"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CustomerCreateSheet } from "./customer-sheets";

/** "Yeni müşteri" düğmesi ve formu (Genel Bakış gibi başka sayfalarda kullanılır). */
export function NewCustomerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Yeni müşteri
      </Button>
      <CustomerCreateSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
