"use client";

import { Banknote, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PackageHandlers = {
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Paket satırı menüsü: Ödeme al (borç varsa), Düzenle, Sil.
 * Sil onayı ve formlar çağıran görünümdedir (`PackagesView`).
 */
export function PackageRowActions({
  customerName,
  hasDebt,
  handlers,
}: {
  customerName: string;
  hasDebt: boolean;
  handlers: PackageHandlers;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`${customerName} paketi işlemleri`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasDebt && (
          <DropdownMenuItem onClick={handlers.onPay}>
            <Banknote />
            Ödeme al
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handlers.onEdit}>
          <Pencil />
          Düzenle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handlers.onDelete}>
          <Trash2 />
          Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
