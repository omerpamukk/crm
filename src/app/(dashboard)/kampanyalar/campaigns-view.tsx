"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone, Plus, Link2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { AUDIENCES, audienceLabel, personalize, smsParts, type AudienceKey } from "@/lib/campaigns/audience";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { PageHeader } from "@/components/shared/page-header";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { StatusBadge } from "@/components/shared/status";
import { formatMoney } from "@/components/shared/money";

import { previewAudience, sendCampaign, type AudiencePreview } from "./actions";
import { MAX_BODY } from "./schema";

export type CampaignRow = {
  id: string;
  created_at: string;
  name: string;
  audience: string;
  body: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: "sending" | "sent" | "failed";
  sent_at: string | null;
  booked: number;
  revenue: number;
};

const NUM = new Intl.NumberFormat("tr-TR");

const STARTERS: Record<AudienceKey, string> = {
  gelmeyen_30: "Merhaba {ad}, sizi özledik! Bu ay gelirseniz size özel %15 indirim var. Randevu için bu mesajı yanıtlayabilir ya da bizi arayabilirsiniz.",
  geri_kazan: "Merhaba {ad}, bakım zamanınız geldi. Size uygun bir saat ayıralım mı? Randevu için bizi arayabilirsiniz.",
  dogum_gunu: "Doğum gününüz kutlu olsun {ad}! Bu ay boyunca size özel %20 hediye indiriminiz var.",
  excel: "Merhaba {ad}, ",
  hepsi: "Merhaba {ad}, ",
};

export function CampaignsView({
  campaigns,
  ready,
  smsConnected,
  loadFailed,
}: {
  campaigns: CampaignRow[];
  /** 0037 çalıştırıldı mı. */
  ready: boolean;
  smsConnected: boolean;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [localOpen, setLocalOpen] = useState(false);
  const [session, setSession] = useState(0);
  const open = localOpen || params.get("yeni") === "1";
  function setOpen(v: boolean) {
    if (v) setSession((s) => s + 1);
    setLocalOpen(v);
  }

  const totals = useMemo(() => {
    const sent = campaigns.filter((c) => c.sent_at);
    return {
      count: sent.length,
      reached: sent.reduce((s, c) => s + c.sent_count, 0),
      booked: sent.reduce((s, c) => s + c.booked, 0),
      revenue: sent.reduce((s, c) => s + c.revenue, 0),
    };
  }, [campaigns]);

  const canCreate = ready && smsConnected;
  const primary = canCreate ? (
    <ToolbarAction prominent icon={Plus} label="Yeni kampanya" onClick={() => setOpen(true)} />
  ) : undefined;

  let body: React.ReactNode;
  if (loadFailed) {
    body = <ErrorState onRetry={() => router.refresh()} />;
  } else if (!ready) {
    body = (
      <EmptyState
        icon={Megaphone}
        title="Kampanyalar henüz hazır değil"
        description="Sistem güncellemesi tamamlanınca buradan seçtiğiniz müşteri grubuna toplu SMS gönderebileceksiniz."
      />
    );
  } else if (!smsConnected) {
    body = (
      <EmptyState
        icon={Link2}
        title="Önce SMS bağlantısını kurun"
        description="Kampanya göndermek için Netgsm hesabınızın bilgilerini Ayarlar → Bağlantılar'a girin."
        action={
          <Link href="/ayarlar?bolum=baglantilar" className={cn(buttonVariants())}>
            Bağlantılara git
          </Link>
        }
      />
    );
  } else if (campaigns.length === 0) {
    body = (
      <EmptyState
        icon={Megaphone}
        title="Henüz kampanya yok"
        description="Örneğin bir aydır gelmeyen müşterilere tek seferde indirim mesajı gönderin; kaçının randevu aldığını burada görün."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Yeni kampanya
          </Button>
        }
      />
    );
  } else {
    body = (
      <ListGroup title="Gönderilenler" detail={`${campaigns.length} kampanya`}>
        {campaigns.map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            subtitle={`${audienceLabel(c.audience)} · ${formatDateTime(c.sent_at ?? c.created_at)}`}
            meta={<span className="text-label-2" title={c.body}>{c.body}</span>}
            trailing={<CampaignOutcome c={c} />}
          />
        ))}
      </ListGroup>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kampanyalar"
        description="Seçtiğiniz müşteri grubuna tek seferde SMS gönderin, kaçının geri geldiğini görün."
        primary={primary}
      />

      {ready && !loadFailed && campaigns.length > 0 && (
        <MetricStrip aria-label="Kampanya özeti">
          <Metric label="Kampanya" value={NUM.format(totals.count)} />
          <Metric label="Ulaşan kişi" value={NUM.format(totals.reached)} />
          <Metric label="Randevu alan" value={NUM.format(totals.booked)} context="14 gün içinde" />
          <Metric label="Gelen ödeme" value={formatMoney(totals.revenue)} context="14 gün içinde" />
        </MetricStrip>
      )}

      {body}

      {canCreate && (
        <CampaignSheet
          key={session}
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v && params.get("yeni")) router.replace("/kampanyalar");
          }}
          onSent={() => router.refresh()}
        />
      )}
    </div>
  );
}

function CampaignOutcome({ c }: { c: CampaignRow }) {
  if (c.status === "sending") return <StatusBadge variant="info">Gönderiliyor</StatusBadge>;
  if (c.status === "failed") return <StatusBadge variant="danger">Gönderilemedi</StatusBadge>;
  return (
    <span className="flex flex-col items-end">
      <span className="tabular-nums text-label">{NUM.format(c.sent_count)} kişi</span>
      <span className={cn("text-footnote tabular-nums", c.booked > 0 ? "text-positive-text" : "text-label-2")}>
        {NUM.format(c.booked)} randevu
      </span>
    </span>
  );
}

function CampaignSheet({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const [audience, setAudience] = useState<AudienceKey | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, startPreview] = useTransition();
  const [sending, startSend] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function pick(key: AudienceKey) {
    setAudience(key);
    setPreview(null);
    setPreviewError(null);
    if (!text.trim() || Object.values(STARTERS).includes(text)) setText(STARTERS[key]);
    startPreview(async () => {
      const res = await previewAudience(key);
      if (res.error) setPreviewError(res.error);
      else setPreview(res.preview ?? null);
    });
  }

  const sample = personalize(text, preview?.sample[0] ?? "Ayşe Yılmaz");
  const parts = smsParts(sample);
  const tooShort = text.trim().length < 10;
  const canSend = !!audience && !!preview && preview.count > 0 && !tooShort && !loading && !sending;

  function send() {
    if (!audience) return;
    startSend(async () => {
      const res = await sendCampaign({ name, audience, body: text });
      setConfirm(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.failed
          ? `${NUM.format(res.sent ?? 0)} kişiye gönderildi, ${NUM.format(res.failed)} kişiye ulaşılamadı`
          : `${NUM.format(res.sent ?? 0)} kişiye gönderildi`
      );
      onOpenChange(false);
      onSent();
    });
  }

  return (
    <>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Yeni kampanya"
        description="Yalnızca kampanya mesajı izni olan müşterilere gider."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button disabled={!canSend} onClick={() => setConfirm(true)}>
              Gönder
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[0.8125rem] font-semibold text-label">Kimlere gitsin?</legend>
            <div role="radiogroup" className="surface-flat inset-rows overflow-clip rounded-xl bg-fill">
              {AUDIENCES.map((a) => {
                const on = audience === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(a.key)}
                    className="focus-ring hover-tint flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left focus-visible:outline-offset-[-3px]"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border-2",
                        on ? "border-primary-fill" : "border-label-3"
                      )}
                    >
                      {on && <span className="size-2.5 rounded-full bg-primary-fill" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium text-label">{a.label}</span>
                      <span className="block truncate text-subhead text-label-2">{a.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <AudienceSummary loading={loading} preview={preview} error={previewError} picked={!!audience} />
          </fieldset>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="c-body">Mesaj</Label>
              <span className={cn("text-footnote tabular-nums", text.length > MAX_BODY ? "text-danger-text" : "text-label-2")}>
                {[...text].length}/{MAX_BODY} · yaklaşık {parts} SMS
              </span>
            </div>
            <Textarea
              id="c-body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_BODY}
              rows={5}
              placeholder="Merhaba {ad}, …"
            />
            <p className="text-footnote text-label-2">
              <span className="font-semibold">{"{ad}"}</span> yazdığınız yere müşterinin adı gelir.
            </p>
            {text.trim() && (
              <div className="rounded-xl bg-fill p-3">
                <p className="mb-1 text-footnote font-semibold text-label-2">Önizleme</p>
                <p className="text-[0.9375rem] whitespace-pre-wrap text-label">{sample}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-name">Kampanya adı (isteğe bağlı)</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Örn. Kasım geri kazanım" />
          </div>
        </div>
      </FormSheet>

      <Dialog open={confirm} onOpenChange={(v) => !sending && setConfirm(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{NUM.format(preview?.count ?? 0)} kişiye SMS gönderilsin mi?</DialogTitle>
            <DialogDescription>
              {audience ? audienceLabel(audience) : ""} · kişi başı yaklaşık {parts} SMS. Gönderilen mesaj geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" disabled={sending} onClick={() => setConfirm(false)}>
              Vazgeç
            </Button>
            <Button disabled={sending} onClick={send}>
              {sending ? "Gönderiliyor…" : "Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AudienceSummary({
  loading,
  preview,
  error,
  picked,
}: {
  loading: boolean;
  preview: AudiencePreview | null;
  error: string | null;
  picked: boolean;
}) {
  if (!picked) return null;
  if (loading) return <p className="text-subhead text-label-2">Hesaplanıyor…</p>;
  if (error) return <p className="text-subhead text-danger-text">{error}</p>;
  if (!preview) return null;
  const skipped = preview.noConsent + preview.noPhone;
  if (preview.count === 0) {
    return (
      <p className="text-subhead text-label-2">
        Bu grupta gönderilebilecek kimse yok.
        {preview.noConsent > 0 && ` ${NUM.format(preview.noConsent)} kişinin kampanya izni kapalı; müşteri kartından açabilirsiniz.`}
      </p>
    );
  }
  return (
    <p className="text-subhead text-label-2">
      <span className="font-semibold text-label">{NUM.format(preview.count)} kişiye</span> gidecek
      {preview.sample.length > 0 && ` (${preview.sample.join(", ")}${preview.count > preview.sample.length ? "…" : ""})`}.
      {skipped > 0 && ` ${NUM.format(skipped)} kişi izni ya da telefonu olmadığı için atlanacak.`}
    </p>
  );
}
