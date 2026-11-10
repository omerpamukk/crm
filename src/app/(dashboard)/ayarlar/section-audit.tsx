"use client";

import { Download, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { StatusDot } from "@/components/shared/status";
import { formatDateTime } from "@/lib/format";
import { zonedParts } from "@/lib/zaman";

import type { SettingsData } from "./settings-view";

/** Denetim kaydı etiketleri (0017_business_audit.sql). */
const ACTION_LABEL: Record<string, string> = { ekle: "ekledi", guncelle: "güncelledi", sil: "sildi" };
const ENTITY_LABEL: Record<string, string> = {
  musteri: "müşteri",
  odeme: "ödeme",
  gider: "gider",
  paket: "paket",
  randevu: "randevu",
  personel: "personel",
  ayarlar: "ayarları",
};
const ACTION_VARIANT: Record<string, "positive" | "info" | "danger"> = {
  ekle: "positive",
  guncelle: "info",
  sil: "danger",
};

type Log = SettingsData["auditLog"];

function exportCsv(rows: Log) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = ["Tarih", "Kullanıcı", "İşlem", "Kayıt", "Özet"].join(";");
  const body = rows
    .map((r) =>
      [
        formatDateTime(r.created_at),
        r.actor_label,
        ACTION_LABEL[r.action] ?? r.action,
        ENTITY_LABEL[r.entity] ?? r.entity,
        r.summary ?? "",
      ]
        .map(esc)
        .join(";")
    )
    .join("\n");
  const p = zonedParts(Date.now());
  const day = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  const blob = new Blob([`﻿${head}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `islem-kayitlari-${day}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** İşlem kayıtları: kim, neyi, ne zaman yaptı. Son 50 kayıt. */
export function AuditSection({ log }: { log: Log }) {
  if (log.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Henüz işlem kaydı yok"
        description="Müşteri, ödeme ve ayar değişiklikleri yapıldıkça burada listelenir."
      />
    );
  }
  return (
    <ListGroup
      title="İşlem kayıtları"
      detail="Son 50 kayıt"
      action={
        <Button variant="secondary" size="sm" onClick={() => exportCsv(log)}>
          <Download />
          CSV indir
        </Button>
      }
    >
      {log.map((l) => (
        <ListRow
          key={l.id}
          title={
            <span className="whitespace-normal">
              {l.actor_label} {ENTITY_LABEL[l.entity] ?? l.entity} {ACTION_LABEL[l.action] ?? l.action}
            </span>
          }
          subtitle={l.summary ?? undefined}
          meta={
            <span className="inline-flex items-center gap-2 text-label-2 tabular-nums">
              <StatusDot variant={ACTION_VARIANT[l.action] ?? "neutral"}>{formatDateTime(l.created_at)}</StatusDot>
            </span>
          }
        />
      ))}
    </ListGroup>
  );
}
