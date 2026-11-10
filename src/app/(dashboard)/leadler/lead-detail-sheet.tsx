"use client";

import Link from "next/link";
import { ChevronRight, MessageCircle, Pencil, Phone, UserCheck } from "lucide-react";

import type { Customer, PipelineStage } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSheet } from "@/components/shared/form-sheet";
import { ListGroup } from "@/components/shared/list-group";
import { formatDate } from "@/lib/format";
import { telHref, waLink } from "../musteriler/customer-types";

import { stageIdOf } from "./lead-types";

/**
 * Lead ayrıntısı: hızlı iletişim, aşama değiştirme ve "Müşteriye çevir".
 * Telefonda alt sayfa, masaüstünde sağ panel.
 */
export function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  stages,
  assignee,
  onMove,
  onEdit,
  onConvert,
}: {
  lead: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  assignee: string | null;
  onMove: (leadId: string, toStageId: string) => void;
  onEdit: (lead: Customer) => void;
  onConvert: (lead: Customer) => void;
}) {
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={lead?.full_name ?? "Lead"} description="Lead ayrıntısı">
      {lead && (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-1 text-center">
            <Avatar name={lead.full_name} size="xl" />
            <h3 className="mt-2 max-w-full truncate text-title-3 font-semibold" title={lead.full_name}>
              {lead.full_name}
            </h3>
            {lead.source && <Badge variant="outline">{lead.source}</Badge>}
          </div>

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(5.5rem, 1fr))" }}
          >
            {lead.phone && (
              <Button asChild variant="secondary" className="h-auto flex-col gap-1 rounded-2xl px-1 py-2.5 text-[0.75rem]">
                <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-5" />
                  WhatsApp
                </a>
              </Button>
            )}
            {lead.phone && (
              <Button asChild variant="secondary" className="h-auto flex-col gap-1 rounded-2xl px-1 py-2.5 text-[0.75rem]">
                <a href={telHref(lead.phone)}>
                  <Phone className="size-5" />
                  Ara
                </a>
              </Button>
            )}
            <Button
              variant="secondary"
              className="h-auto flex-col gap-1 rounded-2xl px-1 py-2.5 text-[0.75rem]"
              onClick={() => onEdit(lead)}
            >
              <Pencil className="size-5" />
              Düzenle
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-stage">Aşama</Label>
            <Select
              value={stageIdOf(lead, stages) ?? undefined}
              onValueChange={(v) => onMove(lead.id, v)}
            >
              <SelectTrigger id="lead-stage" className="w-full">
                <SelectValue placeholder="Aşama seçin" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ListGroup title="Bilgiler">
            <Info label="Telefon" value={lead.phone} />
            <Info label="E-posta" value={lead.email} />
            <Info label="İlgilenen" value={assignee} />
            <Info label="Eklenme" value={formatDate(lead.created_at)} />
            {lead.note && (
              <li className="px-4 py-3 text-[0.9375rem]">
                <span className="block text-subhead text-label-2">Not</span>
                <span className="mt-0.5 block break-words whitespace-pre-wrap">{lead.note}</span>
              </li>
            )}
          </ListGroup>

          <Button className="w-full" size="lg" onClick={() => onConvert(lead)}>
            <UserCheck />
            Müşteriye çevir
          </Button>

          <Button asChild variant="plain" className="w-full">
            <Link href={`/musteriler/${lead.id}`}>
              Geçmişi gör
              <ChevronRight />
            </Link>
          </Button>
        </div>
      )}
    </FormSheet>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-4 px-4 py-2 text-[0.9375rem]">
      <span className="shrink-0 text-label-2">{label}</span>
      <span className="min-w-0 truncate text-right" title={value ?? undefined}>
        {value || <span className="text-label-2">Yok</span>}
      </span>
    </li>
  );
}
