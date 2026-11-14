"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquareText, Phone, Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { markFeedbackHandled, saveGoogleReviewUrl, setReviewRequests } from "./actions";

export type FeedbackRow = {
  id: string;
  created_at: string;
  rating: number | null;
  comment: string | null;
  wants_call: boolean;
  answered_at: string | null;
  google_clicked_at: string | null;
  handled_at: string | null;
  customer_id: string | null;
  name: string;
  phone: string | null;
};

const NUM = new Intl.NumberFormat("tr-TR");
type Filter = "hepsi" | "dusuk";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} puan`} title={`${n} puan`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          strokeWidth={1.5}
          className={cn("size-3.5", i <= n ? "fill-[color:var(--warning-dot)] text-warning-dot" : "text-label-3")}
        />
      ))}
    </span>
  );
}

export function ReviewsView({
  ready,
  loadFailed,
  rows,
  enabled,
  googleUrl,
  canSettings,
  smsConnected,
}: {
  ready: boolean;
  loadFailed: boolean;
  rows: FeedbackRow[];
  enabled: boolean;
  googleUrl: string;
  canSettings: boolean;
  smsConnected: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [url, setUrl] = useState(googleUrl);
  const [filter, setFilter] = useState<Filter>("hepsi");
  const [pending, start] = useTransition();

  const answered = rows.filter((r) => r.answered_at);
  const low = answered.filter((r) => (r.rating ?? 5) <= 3);
  const open = low.filter((r) => !r.handled_at);
  const avg = answered.length ? answered.reduce((s, r) => s + (r.rating ?? 0), 0) / answered.length : null;
  const shown = filter === "dusuk" ? low : answered;

  function toggle(v: boolean) {
    setOn(v);
    start(async () => {
      const res = await setReviewRequests(v);
      if (res.error) {
        setOn(!v);
        toast.error(res.error);
        return;
      }
      toast.success(v ? "Yorum isteme açıldı" : "Yorum isteme kapatıldı");
      router.refresh();
    });
  }

  function saveUrl() {
    start(async () => {
      const res = await saveGoogleReviewUrl(url);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Google bağlantısı kaydedildi");
        router.refresh();
      }
    });
  }

  function handled(id: string) {
    start(async () => {
      const res = await markFeedbackHandled(id);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  const header = (
    <PageHeader
      title="Yorumlar"
      description="İlk kez gelen müşteriye akşam kısa bir puanlama mesajı gider; memnun olmayanı Google'a yazmadan önce görürsünüz."
    />
  );

  if (loadFailed) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState onRetry={() => router.refresh()} />
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          icon={MessageSquareText}
          title="Yorumlar henüz hazır değil"
          description="Sistem güncellemesi tamamlanınca buradan yorum istemeyi açabileceksiniz."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      {canSettings && (
        <section aria-label="Yorum isteme ayarı" className="space-y-2">
          <h2 className="section-title mx-1">Ayar</h2>
          <div className="surface divide-y divide-separator">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-medium text-label">Yorum isteme</p>
                <p className="text-subhead text-label-2">
                  {smsConnected
                    ? "Yalnızca ilk kez gelen müşteriye, ziyaret günü akşam bir kez SMS gider."
                    : "SMS bağlantısı kurulunca mesajlar gitmeye başlar."}
                </p>
              </div>
              <Switch checked={on} disabled={pending} onCheckedChange={toggle} label="Yorum isteme" />
            </div>
            <div className="space-y-2 px-4 py-3">
              <Label htmlFor="g-url">Google yorum bağlantısı</Label>
              <div className="flex gap-2">
                <Input
                  id="g-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://g.page/r/…/review"
                  inputMode="url"
                  className="h-11 md:h-9"
                />
                <Button variant="secondary" disabled={pending || url === googleUrl} onClick={saveUrl}>
                  Kaydet
                </Button>
              </div>
              <p className="text-footnote text-label-2">
                Google işletme profilinizde &quot;Yorum iste&quot; bölümündeki bağlantı. Puanı ne olursa olsun herkese gösterilir;
                Google yalnızca memnun müşteriden yorum istemeyi yasaklar.
              </p>
            </div>
            {!smsConnected && (
              <div className="px-4 py-3">
                <Link href="/ayarlar?bolum=baglantilar" className={cn(buttonVariants({ variant: "plain", size: "sm" }), "px-0")}>
                  SMS bağlantısını kur
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <MetricStrip aria-label="Yorum özeti">
          <Metric label="Ortalama puan" value={avg == null ? "—" : avg.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} />
          <Metric label="Cevaplayan" value={NUM.format(answered.length)} context={`${NUM.format(rows.length)} istekten`} />
          <Metric label="Google'a giden" value={NUM.format(rows.filter((r) => r.google_clicked_at).length)} />
          <Metric label="İlgilenilecek" value={NUM.format(open.length)} tone={open.length > 0 ? "danger" : "default"} />
        </MetricStrip>
      )}

      {answered.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="Henüz değerlendirme yok"
          description={
            on
              ? "İlk kez gelen müşteriler akşam puan verdikçe burada görünür."
              : canSettings
                ? "Yukarıdan yorum istemeyi açın; ilk kez gelen müşterilere akşam kısa bir mesaj gider."
                : "Yorum isteme açıldığında müşterilerin puanları burada görünür."
          }
        />
      ) : (
        <div className="space-y-3">
          <SegmentedControl
            aria-label="Gösterilen değerlendirmeler"
            size="touch"
            value={filter}
            onValueChange={setFilter}
            items={[
              { value: "hepsi", label: "Tümü", count: answered.length },
              { value: "dusuk", label: "1–3 puan", count: low.length },
            ]}
          />
          <ListGroup title="Değerlendirmeler">
            {shown.length === 0 ? (
              <li className="px-4 py-6 text-center text-subhead text-label-2">Düşük puan yok.</li>
            ) : (
              shown.map((r) => {
                const isLow = (r.rating ?? 5) <= 3;
                return (
                  <ListRow
                    key={r.id}
                    href={r.customer_id ? `/musteriler/${r.customer_id}` : undefined}
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{r.name}</span>
                        <Stars n={r.rating ?? 0} />
                      </span>
                    }
                    subtitle={r.comment ?? formatDateTime(r.answered_at)}
                    meta={
                      isLow && r.wants_call && !r.handled_at ? (
                        <StatusBadge variant="danger">Aranmak istiyor{r.phone ? ` · ${r.phone}` : ""}</StatusBadge>
                      ) : r.google_clicked_at ? (
                        <span className="text-footnote text-label-2">Google&apos;a yönlendi</span>
                      ) : undefined
                    }
                    trailing={
                      isLow && !r.handled_at ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pending}
                          onClick={(e) => {
                            e.preventDefault();
                            handled(r.id);
                          }}
                        >
                          <Phone />
                          İlgilenildi
                        </Button>
                      ) : undefined
                    }
                  />
                );
              })
            )}
          </ListGroup>
        </div>
      )}
    </div>
  );
}
