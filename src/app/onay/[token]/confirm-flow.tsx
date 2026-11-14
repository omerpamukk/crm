"use client";

import { useState, useTransition } from "react";
import { CalendarCheck2, CalendarX2, Phone } from "lucide-react";

import { safeTimeZone } from "@/lib/zaman";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthCard } from "@/app/(auth)/auth-shell";

import { respondAppointment } from "./actions";

export type ConfirmInfo = {
  valid: boolean;
  business_name?: string;
  business_phone?: string | null;
  timezone?: string | null;
  starts_at?: string;
  service?: string | null;
  first_name?: string | null;
  status?: string;
  confirmed?: boolean;
  declined?: boolean;
  past?: boolean;
};

/**
 * Hatırlatmadaki link: müşteri "Geliyorum" ya da "Gelemiyorum" der.
 * Gelemiyorum randevuyu iptal eder (önce onay sorulur) ve işletmeye
 * bildirim düşer; saat başkasına verilebilir.
 */
export function ConfirmFlow({ token, info }: { token: string; info: ConfirmInfo }) {
  const [state, setState] = useState<"ask" | "coming" | "declined">(
    info.declined || info.status === "cancelled" ? "declined" : info.confirmed ? "coming" : "ask"
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, start] = useTransition();

  const when = info.starts_at
    ? new Date(info.starts_at).toLocaleString("tr-TR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: safeTimeZone(info.timezone),
      })
    : "";
  const detail = [when, info.service].filter(Boolean).join(" · ");
  const call = info.business_phone ? (
    <a
      href={`tel:${info.business_phone.replace(/\s/g, "")}`}
      className="focus-ring pressable inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-fill px-5 text-[0.9375rem] font-semibold text-label hover:bg-fill-2"
    >
      <Phone aria-hidden className="size-4" />
      İşletmeyi ara
    </a>
  ) : null;

  function respond(coming: boolean) {
    setError(null);
    start(async () => {
      const res = await respondAppointment(token, coming);
      setConfirmCancel(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setState(coming ? "coming" : "declined");
    });
  }

  if (state === "coming") {
    return (
      <AuthCard icon={CalendarCheck2} title="Görüşmek üzere" description={`${info.business_name} randevunuz onaylandı. ${detail}`}>
        {call}
      </AuthCard>
    );
  }
  if (state === "declined") {
    return (
      <AuthCard
        icon={CalendarX2}
        title="Randevunuz iptal edildi"
        description={`${info.business_name} bilgilendirildi. Yeni bir saat için işletmeyi arayabilirsiniz.`}
      >
        {call}
      </AuthCard>
    );
  }
  if (info.past || info.status !== "planned") {
    return (
      <AuthCard icon={CalendarCheck2} title="Bu randevu değiştirilemiyor" description="Randevu saati geçmiş ya da işletme tarafından güncellenmiş.">
        {call}
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`${info.first_name ? `${info.first_name}, ` : ""}randevunuza gelebilecek misiniz?`} description={`${info.business_name} · ${detail}`}>
      <div className="space-y-3">
        {error && <p className="text-center text-subhead text-danger-text">{error}</p>}
        <Button size="lg" className="w-full" disabled={pending} onClick={() => respond(true)}>
          Geliyorum
        </Button>
        <Button size="lg" variant="secondary" className="w-full" disabled={pending} onClick={() => setConfirmCancel(true)}>
          Gelemiyorum
        </Button>
      </div>
      <Dialog open={confirmCancel} onOpenChange={(v) => !pending && setConfirmCancel(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu iptal edilsin mi?</DialogTitle>
            <DialogDescription>{detail}. İptal edilen saat başka birine verilebilir.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" disabled={pending} onClick={() => setConfirmCancel(false)}>
              Vazgeç
            </Button>
            <Button variant="destructive-solid" disabled={pending} onClick={() => respond(false)}>
              {pending ? "İptal ediliyor…" : "İptal et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthCard>
  );
}
