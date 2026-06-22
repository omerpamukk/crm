"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, CalendarDays, Package, Tag, Cake } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
  customerStatusLabel,
  customerStatusVariant,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Customer } from "@/types/database";

type ApptRow = {
  id: string;
  starts_at: string;
  status: string | null;
  service: { name: string } | null;
};
type PkgRow = {
  id: string;
  service_name: string | null;
  remaining_sessions: number | null;
  total_sessions: number | null;
  purchased_at: string | null;
  price: number | null;
};

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [packages, setPackages] = useState<PkgRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const supabase = createClient();

    (async () => {
      setLoading(true);
      const [apptRes, pkgRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, starts_at, status, service:services(name)")
          .eq("customer_id", customer.id)
          .order("starts_at", { ascending: false }),
        supabase
          .from("packages")
          .select(
            "id, service_name, remaining_sessions, total_sessions, purchased_at, price"
          )
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setAppts((apptRes.data ?? []) as unknown as ApptRow[]);
      setPackages((pkgRes.data ?? []) as unknown as PkgRow[]);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [open, customer.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {customer.full_name}
            <Badge variant={customerStatusVariant(customer.status)}>
              {customerStatusLabel(customer.status)}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* İletişim bilgileri */}
          <div className="space-y-2 text-sm">
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                {customer.email}
              </div>
            )}
            {customer.birthday && (
              <div className="flex items-center gap-2">
                <Cake className="size-4 text-muted-foreground" />
                {formatDate(customer.birthday)}
              </div>
            )}
            {customer.tags && customer.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {customer.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {customer.note && (
              <p className="rounded-md bg-muted/50 p-2 text-muted-foreground">
                {customer.note}
              </p>
            )}
          </div>

          <Separator />

          {/* Geçmiş: Randevular */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4 text-primary" />
              Randevular
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : appts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bu müşteriye ait randevu yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {appts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{formatDateTime(a.starts_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.service?.name ?? "Hizmet belirtilmedi"}
                      </p>
                    </div>
                    <Badge variant={appointmentStatusVariant(a.status)}>
                      {appointmentStatusLabel(a.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Geçmiş: Paketler */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4 text-primary" />
              Paketler
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : packages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bu müşteriye ait paket yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {packages.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {p.service_name ?? "Paket"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.remaining_sessions ?? "—"} / {p.total_sessions ?? "—"}{" "}
                        seans · {formatDate(p.purchased_at)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPrice(p.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
