"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { toastUndo } from "@/components/ui/sonner";
import type { Customer } from "@/types/database";

import { CustomerEditSheet } from "./customer-sheets";
import { deleteCustomer, updateCustomerStatus } from "./actions";

/**
 * Müşteri işlemleri menüsü: Düzenle, Arşivle, Sil. Yalnızca müşteri
 * yönetebilen rollere gösterilir (çağıran karar verir).
 * Silme ve arşivleme önce onay ister; arşivleme "Geri al" ile döner.
 */
export function CustomerActions({
  customer,
  onDeleted,
  className,
}: {
  customer: Customer;
  /** Silinince (örn. ayrıntı sayfasında listeye dön). */
  onDeleted?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const archived = customer.status === "archived";

  async function setStatus(status: string) {
    const res = await updateCustomerStatus(customer.id, status);
    if (res.error) toast.error(res.error);
    else router.refresh();
    return !res.error;
  }

  async function archive() {
    setBusy(true);
    const previous = customer.status ?? "active";
    const ok = await setStatus("archived");
    setBusy(false);
    setArchiveOpen(false);
    if (ok) toastUndo(`${customer.full_name} arşivlendi`, () => void setStatus(previous));
  }

  async function restore() {
    if (await setStatus("active")) {
      toastUndo(`${customer.full_name} arşivden çıkarıldı`, () => void setStatus("archived"));
    }
  }

  async function remove() {
    setBusy(true);
    const res = await deleteCustomer(customer.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${customer.full_name} silindi`);
    setDeleteOpen(false);
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className} aria-label={`${customer.full_name}: diğer işlemler`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Müşteriyi düzenle
          </DropdownMenuItem>
          {archived ? (
            <DropdownMenuItem onClick={() => void restore()}>
              <ArchiveRestore />
              Arşivden çıkar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
              <Archive />
              Arşivle
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Müşteriyi sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomerEditSheet customer={customer} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşteri arşivlensin mi?</DialogTitle>
            <DialogDescription>
              {customer.full_name} listeden kalkar ve Arşiv sekmesine geçer. Kayıtları silinmez; istediğiniz zaman
              arşivden çıkarabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setArchiveOpen(false)}>
              İptal
            </Button>
            <Button onClick={() => void archive()} disabled={busy}>
              {busy ? "Arşivleniyor..." : "Arşivle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşteri silinsin mi?</DialogTitle>
            <DialogDescription>
              {customer.full_name} ve ona bağlı kayıtlar kalıcı olarak silinir. Bu işlem geri alınamaz. Kayıtları
              saklamak istiyorsanız Arşivle’yi seçin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive-solid" onClick={() => void remove()} disabled={busy}>
              {busy ? "Siliniyor..." : "Müşteriyi sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
