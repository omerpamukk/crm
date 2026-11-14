"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { updateLoyalty } from "./actions";

export type LoyaltyForm = { target: number | null; reward: string; notifyBefore: number | null };

const SELECT =
  "h-11 w-full rounded-[var(--radius-ctl)] border border-transparent bg-fill px-3 text-base text-label outline-none hover:bg-fill-2 focus-visible:border-[color:var(--primary)] focus-visible:shadow-[0_0_0_3px_var(--focus)] md:h-9 md:text-[0.875rem]";

/** Sadakat kartı ayarı: kaçıncı ziyarette ne hediye, isteğe bağlı SMS. */
export function LoyaltySection({ initial }: { initial: LoyaltyForm }) {
  const router = useRouter();
  const [on, setOn] = useState(initial.target !== null);
  const [target, setTarget] = useState(String(initial.target ?? 10));
  const [reward, setReward] = useState(initial.reward);
  const [notify, setNotify] = useState(initial.notifyBefore != null ? String(initial.notifyBefore) : "");
  const [pending, start] = useTransition();

  function save(enabled = on) {
    start(async () => {
      const res = await updateLoyalty({
        target: enabled ? Number(target) : null,
        reward,
        notifyBefore: enabled && notify ? Number(notify) : null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(enabled ? "Sadakat kartı kaydedildi" : "Sadakat kartı kapatıldı");
      router.refresh();
    });
  }

  return (
    <section aria-label="Sadakat kartı" className="space-y-2">
      <h2 className="section-title mx-1">Sadakat kartı</h2>
      <div className="surface divide-y divide-separator">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-medium text-label">Ziyaret kartı</p>
            <p className="text-subhead text-label-2">Müşteri kartında kaçıncı ziyarette olduğu görünür; hak dolunca uyarı çıkar.</p>
          </div>
          <Switch
            checked={on}
            disabled={pending}
            onCheckedChange={(v) => {
              setOn(v);
              if (!v && initial.target !== null) save(false);
            }}
            label="Sadakat kartı"
          />
        </div>
        {on && (
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ly-target">Kaçıncı ziyarette?</Label>
              <Input id="ly-target" type="number" inputMode="numeric" min={2} max={50} value={target} onChange={(e) => setTarget(e.target.value)} className="h-11 md:h-9" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ly-reward">Hediye</Label>
              <Input id="ly-reward" value={reward} maxLength={120} onChange={(e) => setReward(e.target.value)} placeholder="Ör. Ücretsiz fön" className="h-11 md:h-9" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ly-notify">Hediyeye yaklaşınca SMS</Label>
              <select id="ly-notify" value={notify} onChange={(e) => setNotify(e.target.value)} className={SELECT}>
                <option value="">Gönderme</option>
                <option value="1">1 ziyaret kala</option>
                <option value="2">2 ziyaret kala</option>
                <option value="3">3 ziyaret kala</option>
              </select>
              <p className="text-footnote text-label-2">Yalnızca kampanya mesajı izni olan müşterilere, sabah 10:00&apos;da gider.</p>
            </div>
            <div className="sm:col-span-2">
              <Button disabled={pending} onClick={() => save(true)}>
                {pending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
