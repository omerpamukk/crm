"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * Form ve ayrıntı panellerinin ortak kabuğu — "form hep aynı yerleşim".
 * Telefonda alt sayfa, masaüstünde sağ panel (`Sheet side="auto"`).
 *
 *   <FormSheet open={open} onOpenChange={setOpen} title="Yeni müşteri"
 *     description="Ad ve telefon yeterli.">
 *     <CustomerForm onSuccess={…} onCancel={() => setOpen(false)} />
 *   </FormSheet>
 *
 * - `title` başlık (eylem adıyla aynı: "Yeni randevu", "Ödeme al").
 *   `description` yoksa başlık ekran okuyucuya açıklama olarak da okunur.
 * - Formun kendi düğmeleri gövdede, `FormActions` ile en altta durur.
 * - Form dışı paneller (ayrıntı, mesaj önizleme) eylemlerini `footer`a
 *   verir: masaüstünde panelin dibine yapışır, telefonda içeriğin altında
 *   durur ve uzun içerikte ekranın altına yapışır. Form gövdedeyse ve
 *   düğmeler `footer`da olacaksa gönder düğmesine `form="<form id>"` verin.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  bodyClassName,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** Alt eylemler (Vazgeç · Kaydet). Verilmezse alt şerit çizilmez. */
  footer?: React.ReactNode
  /** Panelin sınıfı (genişlik vb.). Varsayılan masaüstü genişliği 28rem. */
  className?: string
  /** Gövde kabının sınıfı. */
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="auto" className={cn("sm:max-w-[28rem]", className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>
        <div className={cn("px-4", footer ? "pb-2" : "pb-6", bodyClassName)}>{children}</div>
        {footer && (
          <div className="sheet-footer">
            <FormActions className="pt-0">{footer}</FormActions>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Formun alt eylem satırı: sağa yaslı, birincil düğme en sağda.
 * `start` solda durur (ör. "Kuralı sil"). Düğmeler tek satırdır; dar
 * ekranda satır kırılırsa `start` üstte kalır.
 *
 *   <FormActions start={<Button variant="destructive">Sil</Button>}>
 *     <Button variant="secondary" onClick={onCancel}>Vazgeç</Button>
 *     <Button type="submit">Kaydet</Button>
 *   </FormActions>
 */
export function FormActions({
  start,
  className,
  children,
}: {
  start?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2 pt-2", className)}>
      {start && <div className="mr-auto flex items-center gap-2">{start}</div>}
      {children}
    </div>
  )
}
