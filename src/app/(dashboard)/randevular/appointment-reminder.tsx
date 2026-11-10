"use client";

import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";

/** Telefonu 90 ön ekiyle normalize eder. */
function waLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("90")
    ? digits
    : digits.startsWith("0")
      ? `90${digits.slice(1)}`
      : `90${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/**
 * Müşteriye WhatsApp'tan randevu hatırlatması gönderir (hazır mesajla wa.me açar).
 * Telefon yoksa pasif görünür. `iconOnly`: tablo satırında yalnızca simge
 * (ekran okuyucu adı ve ipucu yine "Hatırlat").
 */
export function AppointmentReminder({
  phone,
  customerName,
  startsAt,
  serviceName,
  iconOnly = false,
  className,
}: {
  phone: string | null;
  customerName: string;
  startsAt: string;
  serviceName: string | null;
  iconOnly?: boolean;
  className?: string;
}) {
  const when = formatDateTime(startsAt);
  const firstName = customerName.split(" ")[0] || customerName;
  const svc = serviceName ? ` ${serviceName}` : "";
  const text = `Merhaba ${firstName}, ${when} tarihli${svc} randevunuzu hatırlatmak isteriz. Görüşmek üzere!`;
  const size = iconOnly ? "icon-sm" : "lg";

  if (!phone) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          buttonVariants({ variant: "secondary", size }),
          "pointer-events-none opacity-45",
          className
        )}
        title="Telefon numarası yok"
      >
        <MessageCircle />
        <span className={iconOnly ? "sr-only" : undefined}>Hatırlat</span>
      </span>
    );
  }

  return (
    <a
      href={waLink(phone, text)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: iconOnly ? "ghost" : "secondary", size }),
        "text-positive-text",
        className
      )}
      title={`${customerName}: WhatsApp'tan hatırlat`}
    >
      <MessageCircle />
      <span className={iconOnly ? "sr-only" : undefined}>Hatırlat</span>
    </a>
  );
}
