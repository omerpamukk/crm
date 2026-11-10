"use client";

import { CreditCard } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { StatusBadge } from "@/components/shared/status";
import { formatDate, formatPrice } from "@/lib/format";

import type { SettingsData } from "./settings-view";

const PLAN_LABEL: Record<string, string> = { trial: "Deneme", temel: "Temel paket", pro: "Pro paket" };
const STATUS: Record<string, { label: string; variant: "positive" | "info" | "warning" | "danger" }> = {
  active: { label: "Aktif", variant: "positive" },
  trial: { label: "Deneme", variant: "info" },
  suspended: { label: "Askıda", variant: "warning" },
  cancelled: { label: "İptal edildi", variant: "danger" },
};

/** Abonelik: salt okunur özet. Paket değişikliği hizmet sağlayıcıdan istenir. */
export function SubscriptionSection({
  sub,
  daysLeft,
}: {
  sub: SettingsData["subscription"];
  daysLeft: number | null;
}) {
  if (!sub) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Abonelik bilgisi bulunamadı"
        description="Hesabınıza tanımlı bir paket görünmüyor. Hizmet sağlayıcınızla (ajansınız) iletişime geçin."
      />
    );
  }
  const status = STATUS[sub.status] ?? STATUS.active;

  return (
    <div className="space-y-4">
      <ListGroup title="Paketiniz" aria-label="Abonelik">
        <ListRow
          title="Paket"
          trailing={<span className="text-[0.9375rem]">{PLAN_LABEL[sub.plan] ?? sub.plan}</span>}
        />
        <ListRow title="Durum" trailing={<StatusBadge variant={status.variant}>{status.label}</StatusBadge>} />
        <ListRow
          title="Dönem ücreti"
          trailing={<span className="text-[0.9375rem] tabular-nums">{sub.price ? formatPrice(sub.price) : "Ücretsiz"}</span>}
        />
        <ListRow
          title="Başlangıç"
          trailing={<span className="text-[0.9375rem] tabular-nums">{sub.started_at ? formatDate(sub.started_at) : "—"}</span>}
        />
        <ListRow
          title="Bitiş"
          trailing={<span className="text-[0.9375rem] tabular-nums">{sub.expires_at ? formatDate(sub.expires_at) : "Süresiz"}</span>}
        />
        {daysLeft !== null && (
          <ListRow
            title="Kalan süre"
            trailing={
              daysLeft < 15 ? (
                <StatusBadge variant="danger">{Math.max(daysLeft, 0)} gün</StatusBadge>
              ) : (
                <span className="text-[0.9375rem] tabular-nums">{daysLeft} gün</span>
              )
            }
          />
        )}
      </ListGroup>
      <p className="px-1 text-subhead text-label-2">
        Paket değişikliği için hizmet sağlayıcınızla (ajansınız) iletişime geçin.
      </p>
    </div>
  );
}
