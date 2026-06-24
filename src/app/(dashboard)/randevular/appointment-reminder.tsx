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
 * Telefon yoksa pasif görünür.
 */
export function AppointmentReminder({
  phone,
  customerName,
  startsAt,
  serviceName,
}: {
  phone: string | null;
  customerName: string;
  startsAt: string;
  serviceName: string | null;
}) {
  const when = formatDateTime(startsAt);
  const firstName = customerName.split(" ")[0] || customerName;
  const svc = serviceName ? ` ${serviceName}` : "";
  const text = `Merhaba ${firstName}, ${when} tarihli${svc} randevunuzu hatırlatmak isteriz. Görüşmek üzere! 🌸`;

  if (!phone) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "pointer-events-none gap-1.5 text-muted-foreground/50"
        )}
        title="Telefon numarası yok"
      >
        <MessageCircle className="size-4" />
        Hatırlat
      </span>
    );
  }

  return (
    <a
      href={waLink(phone, text)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "gap-1.5 text-positive hover:bg-positive/10 hover:text-positive"
      )}
      title="WhatsApp'tan hatırlat"
    >
      <MessageCircle className="size-4" />
      Hatırlat
    </a>
  );
}
