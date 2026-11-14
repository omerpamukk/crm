"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

import { updateLogo } from "./actions";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX = 2 * 1024 * 1024;

/**
 * İşletme logosu: kenar çubuğunda ve herkese açık sayfada görünür.
 * PNG, JPG ya da WEBP; en fazla 2 MB. Kare ve şeffaf zeminli logo en iyi sonucu verir.
 */
export function LogoSection({ businessId, businessName, logoUrl }: { businessId: string; businessName: string; logoUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const busy = uploading || pending;
  const initial = businessName.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?";

  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    const ext = TYPES[file.type];
    if (!ext) {
      toast.error("PNG, JPG ya da WEBP dosyası seçin.");
      return;
    }
    if (file.size > MAX) {
      toast.error("Logo en fazla 2 MB olabilir.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${businessId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("business-logos").upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        console.error("logo upload:", error);
        toast.error("Logo yüklenemedi. Biraz sonra tekrar deneyin.");
        return;
      }
      const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
      start(async () => {
        const res = await updateLogo(data.publicUrl);
        if (res.error) toast.error(res.error);
        else {
          toast.success("Logo güncellendi");
          router.refresh();
        }
      });
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    start(async () => {
      const res = await updateLogo(null);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Logo kaldırıldı");
        router.refresh();
      }
    });
  }

  return (
    <section aria-label="Logo" className="space-y-2">
      <h2 className="section-title mx-1">Logo</h2>
      <div className="surface flex items-center gap-4 p-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-separator">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${businessName} logosu`} className="size-full object-contain p-1" />
          ) : (
            <span aria-hidden className="text-title-2 font-bold text-black/70">
              {initial}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-subhead text-label-2">Kenar çubuğunda ve herkese açık sayfanızda görünür. PNG, JPG ya da WEBP, en fazla 2 MB.</p>
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="logo-file" onChange={(e) => void onFile(e.target.files?.[0])} />
            <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>
              <ImageUp />
              {busy ? "Yükleniyor…" : logoUrl ? "Değiştir" : "Logo yükle"}
            </Button>
            {logoUrl && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={remove}>
                Kaldır
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
