"use client";

import { useState } from "react";
import {
  Mail,
  MessageSquareText,
  MousePointerClick,
  Coins,
  Plus,
  Send,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KPIS: { label: string; value: string; icon: LucideIcon; tone: string; bar: string; sub: string }[] = [
  { label: "Gönderilen E-posta", value: "4.280", icon: Mail, tone: "bg-blue-100 text-blue-600", bar: "border-l-blue-400", sub: "↗ %42 açılma" },
  { label: "Gönderilen SMS", value: "1.120", icon: MessageSquareText, tone: "bg-amber-100 text-amber-600", bar: "border-l-amber-400", sub: "↗ %91 teslim" },
  { label: "Tıklama Oranı", value: "%18.4", icon: MousePointerClick, tone: "bg-positive/10 text-positive", bar: "border-l-positive", sub: "↗ +2.1%" },
  { label: "Kampanya Geliri", value: "₺28.400", icon: Coins, tone: "bg-pink-100 text-pink-600", bar: "border-l-pink-400", sub: "↗ Bu ay" },
];

const EMAIL = [
  { name: "Mayıs Bülteni", sent: "1.284", rate: "%44", status: "Tamamlandı", tone: "positive" },
  { name: "Yaz Kampanyası", sent: "980", rate: "%38", status: "Devam ediyor", tone: "warning" },
  { name: "Yeni Üyelere Hoşgeldin", sent: "Otomatik", rate: "%67", status: "Aktif", tone: "info" },
  { name: "Doğum Günü Tebriği", sent: "Otomatik", rate: "%72", status: "Aktif", tone: "info" },
];

const SMS = [
  { name: "Hafta Sonu %20 İndirim", sent: "420", rate: "%12", status: "Tamamlandı", tone: "positive" },
  { name: "Yeni Ürün Duyurusu", sent: "380", rate: "%8", status: "Tamamlandı", tone: "positive" },
  { name: "Randevu Hatırlatma", sent: "Otomatik", rate: "—", status: "Aktif", tone: "info" },
];

const STATUS_TONE: Record<string, string> = {
  positive: "bg-positive/12 text-positive",
  warning: "bg-warning/12 text-amber-600",
  info: "bg-primary/10 text-primary",
};

const AUDIENCES = ["Tüm Aktif Müşteriler (892)", "Tüm Müşteriler (1.284)", "Pasif Müşteriler (210)", "Doğum Günü Bu Ay (37)"];

function CampaignTable({
  rows,
  metric,
}: {
  rows: { name: string; sent: string; rate: string; status: string; tone: string }[];
  metric: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr] gap-2 border-b bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Kampanya</span>
        <span>Gönderildi</span>
        <span>{metric}</span>
        <span>Durum</span>
      </div>
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.name} className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr] items-center gap-2 px-4 py-2.5 text-sm">
            <span className="truncate font-medium">{r.name}</span>
            <span className="text-muted-foreground">{r.sent}</span>
            <span className="font-medium tabular-nums">{r.rate}</span>
            <span>
              <span className={cn("inline-flex rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium", STATUS_TONE[r.tone])}>
                {r.status}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CampaignsView() {
  const [msg, setMsg] = useState("");
  const [audience, setAudience] = useState(AUDIENCES[0]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="surface p-5">
            <p className="section-label">{k.label}</p>
            <p className="metric-value mt-2">{k.value}</p>
            <p className="mt-1.5 text-xs font-medium text-positive">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-blue-600" />
              E-posta Kampanyaları
            </CardTitle>
            <Button size="sm" onClick={() => toast.info("Yeni e-posta kampanyası yakında.")}>
              <Plus className="size-4" />
              Yeni
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <CampaignTable rows={EMAIL} metric="Açılma" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="size-4 text-amber-600" />
              SMS Kampanyaları
            </CardTitle>
            <Button size="sm" onClick={() => toast.info("Yeni SMS kampanyası yakında.")}>
              <Plus className="size-4" />
              Yeni
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <CampaignTable rows={SMS} metric="Tıklama" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="size-4 text-primary" />
            Hızlı SMS Gönder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="aud">Hedef Kitle</label>
              <select
                id="aud"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="smsmsg">Mesaj</label>
              <span className={cn("text-xs", msg.length > 160 ? "text-danger" : "text-muted-foreground")}>
                {msg.length}/160
              </span>
            </div>
            <textarea
              id="smsmsg"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="SMS mesajınızı yazın... (max 160 karakter)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button
            className="w-full"
            disabled={!msg.trim()}
            onClick={() => {
              toast.success(`SMS gönderildi (demo) — ${audience}`);
              setMsg("");
            }}
          >
            <Send className="size-4" />
            SMS Gönder
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
