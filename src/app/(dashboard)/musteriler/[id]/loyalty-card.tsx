"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { loyaltySentence, type LoyaltyProgress } from "@/lib/loyalty";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status";

import { redeemLoyalty } from "./loyalty-actions";

/**
 * Sadakat kartı: damga kartı gibi N kutu; dolu kutu = ziyaret. Hak dolunca
 * "Hediye verildi" ile sayaç sıfırlanır (önce onay sorulur).
 */
export function LoyaltyCard({
  customerId,
  progress,
  reward,
  canRedeem,
}: {
  customerId: string;
  progress: LoyaltyProgress;
  reward: string | null;
  canRedeem: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const gift = reward?.trim() || "hediye";

  function redeem() {
    start(async () => {
      const res = await redeemLoyalty(customerId);
      setOpen(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Hediye verildi; kart sıfırlandı");
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="loyalty-title" className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="loyalty-title" className="text-headline">
            Sadakat kartı
          </h2>
          <span className="tabular-nums text-subhead text-label-2">
            {progress.count}/{progress.target}
          </span>
          {progress.eligible && <StatusBadge variant="positive">Hediye hakkı var</StatusBadge>}
        </div>
        <ol aria-label={`${progress.count} / ${progress.target} ziyaret`} className="flex flex-wrap gap-1.5">
          {Array.from({ length: progress.target }, (_, i) => (
            <li
              key={i}
              aria-hidden
              className={cn(
                "grid size-6 place-items-center rounded-full",
                i < progress.count ? "bg-primary-fill text-on-primary-fill" : "bg-fill"
              )}
            >
              {i === progress.target - 1 && <Gift className={cn("size-3.5", i < progress.count ? "" : "text-label-3")} />}
            </li>
          ))}
        </ol>
        <p className="text-[0.9375rem] text-label-2">{loyaltySentence(progress, reward)}</p>
      </div>
      {progress.eligible && canRedeem && (
        <Button className="shrink-0" onClick={() => setOpen(true)}>
          <Gift />
          Hediye verildi
        </Button>
      )}
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hediye verildi mi?</DialogTitle>
            <DialogDescription>{gift} verildi olarak kaydedilir ve kart sıfırdan başlar.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button disabled={pending} onClick={redeem}>
              {pending ? "Kaydediliyor…" : "Evet, verildi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
