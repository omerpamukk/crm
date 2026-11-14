"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { updatePublicProfile } from "./actions";

export type ProfileForm = { enabled: boolean; slug: string; about: string };

/** Herkese açık işletme sayfası: adres, kısa tanıtım, aç/kapa. */
export function ProfileSection({ initial }: { initial: ProfileForm }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [slug, setSlug] = useState(initial.slug);
  const [about, setAbout] = useState(initial.about);
  const [pending, start] = useTransition();
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const link = slug ? `${origin}/isletme/${slug}` : "";

  function save() {
    start(async () => {
      const res = await updatePublicProfile({ enabled, slug, about });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(enabled ? "Sayfanız yayında" : "Sayfa ayarı kaydedildi");
      router.refresh();
    });
  }

  return (
    <section aria-label="Herkese açık sayfa" className="space-y-2">
      <h2 className="section-title mx-1">Herkese açık sayfa</h2>
      <div className="surface divide-y divide-separator">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-medium text-label">Sayfa yayında</p>
            <p className="text-subhead text-label-2">Hizmetleriniz, fiyatlarınız, çalışma saatleriniz ve müşteri puanınız tek sayfada; Instagram bio&apos;nuza koyun.</p>
          </div>
          <Switch checked={enabled} disabled={pending} onCheckedChange={setEnabled} label="Sayfa yayında" />
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pf-slug">Sayfa adresi</Label>
            <Input
              id="pf-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="defne-guzellik"
              className="h-11 md:h-9"
            />
            {link && <p className="truncate text-footnote text-label-2" title={link}>{link}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-about">Kısa tanıtım (isteğe bağlı)</Label>
            <Textarea id="pf-about" value={about} maxLength={600} rows={3} onChange={(e) => setAbout(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={save}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
            {initial.enabled && initial.slug && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${origin}/isletme/${initial.slug}`);
                    toast.success("Bağlantı kopyalandı");
                  }}
                >
                  <Copy />
                  Bağlantıyı kopyala
                </Button>
                <a
                  href={`/isletme/${initial.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold text-primary-text hover:bg-hover"
                >
                  <ExternalLink className="size-3.5" />
                  Sayfayı aç
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
