"use client";

import { useMemo, useState } from "react";
import { Star, Send, Eye, MessageSquare, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  reply?: string;
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-label={`${rating} yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

export function ReviewsView({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<"all" | "unanswered">("all");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const unanswered = reviews.filter((r) => !r.reply).length;
    return { total, avg: avg.toFixed(1), unanswered };
  }, [reviews]);

  const visible = filter === "all" ? reviews : reviews.filter((r) => !r.reply);

  function submitReply(id: string) {
    const clean = draft.trim();
    if (!clean) return;
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reply: clean } : r)));
    setReplyFor(null);
    setDraft("");
    toast.success("Yanıt kaydedildi (demo) — Google bağlandığında yayınlanacak.");
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ortalama Puan" value={stats.avg} icon={Star} hint="Son 12 ayın ortalaması" />
        <StatCard label="Toplam Yorum" value={String(stats.total)} icon={MessageSquare} />
        <StatCard label="Yanıtlanmamış" value={String(stats.unanswered)} icon={Send} />
        <StatCard label="Harita Görüntülenme" value="4.2K" icon={Eye} hint="Bu ay" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="section-title">Yorumlar</p>
              <Badge variant="secondary">{visible.length}</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", "unanswered"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "Tümü" : "Yanıtlanmamış"}
                </Button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Bu filtrede yorum yok.
            </p>
          ) : (
            <ul className="row-list">
              {visible.map((r) => (
                <li key={r.id} className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {r.author.slice(0, 2).toLocaleUpperCase("tr")}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-tight">{r.author}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                    </div>
                    <Stars rating={r.rating} />
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">{r.text}</p>

                  {r.reply ? (
                    <div className="rounded-[var(--radius-md)] border-l-2 border-l-primary bg-muted/40 px-3.5 py-2.5">
                      <p className="section-label">İşletme yanıtı</p>
                      <p className="mt-1 text-sm text-muted-foreground">{r.reply}</p>
                    </div>
                  ) : replyFor === r.id ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        rows={3}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Yanıtını yaz…"
                        className="focus-ring w-full resize-none rounded-[var(--radius-md)] border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => submitReply(r.id)}>
                          <Send className="size-3.5" />
                          Yanıtla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReplyFor(null);
                            setDraft("");
                          }}
                        >
                          Vazgeç
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyFor(r.id);
                        setDraft("");
                      }}
                    >
                      <Send className="size-3.5" />
                      Yanıtla
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="icon-chip">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Hizmet sonrası otomatik yorum isteği</p>
              <p className="text-[0.8125rem] text-muted-foreground">
                Randevu tamamlanınca müşteriye Google yorum linki gönderilsin.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => toast.info("Google İşletme Profili bağlandığında etkinleşir.")}
          >
            Kur
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
