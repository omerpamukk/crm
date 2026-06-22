"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Eye, CircleDot } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CUSTOMER_STATUSES } from "@/lib/constants";
import type { Customer } from "@/types/database";

import { CustomerForm } from "./customer-form";
import { CustomerDetailSheet } from "./customer-detail-sheet";
import { deleteCustomer, updateCustomerStatus } from "./actions";

export function CustomerRowActions({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteCustomer(customer.id);
    setDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Müşteri silindi");
    setDeleteOpen(false);
    router.refresh();
  }

  async function handleStatusChange(status: string) {
    if (status === customer.status) return;
    const result = await updateCustomerStatus(customer.id, status);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Durum güncellendi");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">İşlemler</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Eye className="size-4" />
            Detay
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Düzenle
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CircleDot className="size-4" />
              Durum değiştir
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {CUSTOMER_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  disabled={s.value === customer.status}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomerDetailSheet
        customer={customer}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Düzenleme */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Müşteriyi düzenle</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onSuccess={() => {
              setEditOpen(false);
              router.refresh();
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Silme onayı */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşteriyi sil</DialogTitle>
            <DialogDescription>
              <strong>{customer.full_name}</strong> kalıcı olarak silinecek. Bu
              işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
