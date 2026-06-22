"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, Mail } from "lucide-react";

import { CUSTOMER_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "@/types/database";

import { CustomerRowActions } from "./customer-row-actions";
import { updateCustomerStatus } from "./actions";

const STATUS_VALUES = CUSTOMER_STATUSES.map((s) => s.value) as readonly string[];

/** Bilinmeyen/boş durumları ilk sütuna (Yeni) toplar. */
function normalizeStatus(status: string | null): string {
  return status && STATUS_VALUES.includes(status)
    ? status
    : CUSTOMER_STATUSES[0].value;
}

export function CustomerBoard({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Customer[]>(customers);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);

  // Server verisi değişince (ekleme/düzenleme/silme sonrası) panoyu senkronla.
  // (Render sırasında prop değişimine uyum — React'in önerdiği desen.)
  const [prevCustomers, setPrevCustomers] = useState(customers);
  if (prevCustomers !== customers) {
    setPrevCustomers(customers);
    setItems(customers);
  }

  async function moveTo(customerId: string, status: string) {
    const current = items.find((c) => c.id === customerId);
    if (!current || normalizeStatus(current.status) === status) return;

    // İyimser güncelleme
    setItems((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status } : c))
    );

    const result = await updateCustomerStatus(customerId, status);
    if (result.error) {
      toast.error(result.error);
      setItems(customers); // geri al
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CUSTOMER_STATUSES.map((col) => {
        const colItems = items.filter(
          (c) => normalizeStatus(c.status) === col.value
        );
        const isOver = overStatus === col.value;

        return (
          <div
            key={col.value}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStatus(col.value);
            }}
            onDragLeave={() => setOverStatus((s) => (s === col.value ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setOverStatus(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) moveTo(id, col.value);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/40 transition-colors",
              isOver && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary">{colItems.length}</Badge>
            </div>

            <div className="flex-1 space-y-2 p-2">
              {colItems.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Buraya sürükleyin
                </p>
              ) : (
                colItems.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", c.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingId(c.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "cursor-grab rounded-md border bg-card p-3 shadow-sm active:cursor-grabbing",
                      draggingId === c.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-tight">
                        {c.full_name}
                      </span>
                      <CustomerRowActions customer={c} />
                    </div>

                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {c.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3" />
                          {c.phone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3" />
                          {c.email}
                        </div>
                      )}
                    </div>

                    {c.tags && c.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
