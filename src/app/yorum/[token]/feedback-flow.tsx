"use client";

import { useState, useTransition } from "react";
import { CircleCheck, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AuthCard } from "@/app/(auth)/auth-shell";

import { markGoogleClick, submitFeedback } from "./actions";

export type FeedbackInfo = {
  valid: boolean;
  business_name?: string;
  google_url?: string | null;
  first_name?: string | null;
  answered?: boolean;
  rating?: number | null;
};

const LABELS = ["", "Çok kötü", "Kötü", "Orta", "İyi", "Çok iyi"];

/**
 * Ziyaret sonrası değerlendirme. Google yorum düğmesi puandan bağımsız
 * olarak herkese gösterilir (Google yalnızca memnun müşteriden yorum
 * istemeyi yasaklar). Düşük puanda ek olarak işletmeye yazma kutusu çıkar.
 */
export function FeedbackFlow({ token, info }: { token: string; info: FeedbackInfo }) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [wantsCall, setWantsCall] = useState(false);
  const [done, setDone] = useState(Boolean(info.answered));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = info.business_name ?? "İşletme";
  const low = rating > 0 && rating <= 3;

  const google = info.google_url ? (
    <a
      href={info.google_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => void markGoogleClick(token)}
      className="focus-ring pressable inline-flex h-11 w-full items-center justify-center rounded-full bg-fill px-5 text-[0.9375rem] font-semibold text-label hover:bg-fill-2"
    >
      Google&apos;da yorum yaz
    </a>
  ) : null;

  if (done) {
    return (
      <AuthCard
        icon={CircleCheck}
        title="Teşekkür ederiz"
        description={
          low || (info.rating != null && info.rating <= 3)
            ? `Görüşünüz ${name} ekibine iletildi. ${google ? "Dilerseniz Google'da da paylaşabilirsiniz." : ""}`
            : `Görüşünüz bizim için değerli. ${google ? "Deneyiminizi Google'da da paylaşır mısınız?" : ""}`
        }
      >
        {google}
      </AuthCard>
    );
  }

  function send() {
    setError(null);
    start(async () => {
      const res = await submitFeedback({ token, rating, comment, wantsCall });
      if (res.error) {
        setError(res.error);
        if (res.error.includes("daha önce")) setDone(true);
        return;
      }
      setDone(true);
    });
  }

  return (
    <AuthCard
      title={`${info.first_name ? `${info.first_name}, ` : ""}ziyaretiniz nasıldı?`}
      description={`${name} için 1 dakikanızı ayırır mısınız?`}
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Puan" className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} — ${LABELS[n]}`}
              onClick={() => setRating(n)}
              className="focus-ring pressable grid size-12 place-items-center rounded-full"
            >
              <Star
                aria-hidden
                className={cn("size-9", n <= rating ? "fill-[color:var(--warning-dot)] text-warning-dot" : "text-label-3")}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        <p className="h-5 text-center text-subhead text-label-2">{rating ? LABELS[rating] : "Puan seçin"}</p>

        {rating > 0 && (
          <div className="space-y-2 text-left">
            <Label htmlFor="fb-comment">{low ? "Ne olduğunu bize yazın, düzeltelim" : "Eklemek istediğiniz bir şey var mı? (isteğe bağlı)"}</Label>
            <Textarea id="fb-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} />
            {low && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[0.9375rem] text-label">Beni arayın</span>
                <Switch checked={wantsCall} onCheckedChange={setWantsCall} label="Beni arayın" />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-center text-subhead text-danger-text">{error}</p>}

        <Button size="lg" className="w-full" disabled={!rating || pending} onClick={send}>
          {pending ? "Gönderiliyor…" : "Gönder"}
        </Button>
        {google}
      </div>
    </AuthCard>
  );
}
