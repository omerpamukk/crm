"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ExternalToast, type ToasterProps } from "sonner"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react"

/**
 * Bildirim (toast) — cam kapsül, alt ortada; aşağı ya da yana fırlatınca
 * kapanır (sonner). Telefonda sekme çubuğunun üstünde durur.
 *
 * Kullanım: `toast.success("Kaydedildi")`, `toast.error("…")` (sonner) ya da
 * geri alınabilir eylemler için `toastUndo("Zeynep geldi", () => geriAl())`.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-center"
      offset={{ bottom: "var(--toast-bottom, 24px)" }}
      mobileOffset={{ bottom: "var(--toast-bottom, 96px)", left: "16px", right: "16px" }}
      gap={8}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[18px] text-positive-text" />,
        info: <InfoIcon className="size-[18px] text-primary-text" />,
        warning: <TriangleAlertIcon className="size-[18px] text-warning-text" />,
        error: <CircleAlertIcon className="size-[18px] text-danger-text" />,
        loading: <Loader2Icon className="size-[18px] animate-spin text-label-2" />,
      }}
      style={{ "--width": "400px" } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "glass-strong flex w-full items-center gap-2.5 rounded-[22px] py-2.5 pr-2.5 pl-4 text-[0.875rem] leading-[1.1875rem] text-label",
          content: "min-w-0 flex-1",
          title: "font-medium",
          description: "mt-0.5 text-[0.8125rem] text-label-2",
          icon: "flex shrink-0 items-center",
          actionButton:
            "pressable inline-flex h-8 shrink-0 items-center rounded-full bg-primary-soft px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-primary-text hover:bg-[color:var(--primary-soft-2)]",
          cancelButton:
            "pressable inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[0.8125rem] font-semibold whitespace-nowrap text-label-2 hover:bg-hover",
          closeButton: "text-label-2",
        },
      }}
      {...props}
    />
  )
}

/** Geri alınabilir eylemin bildirimi: "… · Geri al". */
function toastUndo(
  message: string,
  onUndo: () => void,
  options?: Omit<ExternalToast, "action">
) {
  return toast.success(message, {
    duration: 6000,
    ...options,
    action: { label: "Geri al", onClick: onUndo },
  })
}

export { Toaster, toastUndo }
