"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronRight, MessageCircle, TrendingUp } from "lucide-react";

import { useUrlState } from "@/lib/use-url-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { FormSheet } from "@/components/shared/form-sheet";
import { AppointmentSheet } from "../musteriler/customer-sheets";
import type { PackageOption, ServiceOption, StaffOption } from "../musteriler/customer-types";

export type OppItem = {
  key: string;
  customerId: string | null;
  name: string;
  phone: string | null;
  subtitle: string;
  /** Yalnızca borç satırlarında dolu. */
  amount: number | null;
  /** WhatsApp için hazır mesaj; göndermeden önce düzenlenebilir. */
  message: string;
};

export type OppCategory = {
  key: string;
  title: string;
  hint: string;
  /** Gerçek toplam (liste kısaltılmış olsa bile). */
  count: number;
  items: OppItem[];
  /** İlgili sayfaya bağlantı (yetki yoksa null). */
  link: { href: string; label: string } | null;
};

const PREVIEW = 5;
const SUMMARY_KEYS = ["paket", "gelmeyen", "dogumgunu"] as const;

function waHref(phone: string, text: string): string {
  const d = phone.replace(/\D/g, "");
  const n = d.startsWith("90") ? d : d.startsWith("0") ? `90${d.slice(1)}` : `90${d}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function OpportunitiesView({
  categories,
  canBook,
  services,
  staff,
  packages,
  loadFailed,
}: {
  categories: OppCategory[];
  canBook: boolean;
  services: ServiceOption[];
  staff: StaffOption[];
  packages: PackageOption[];
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [grupRaw, setGrup] = useUrlState("grup", "");
  const grup = categories.some((c) => c.key === grupRaw) ? grupRaw : "";

  const [wa, setWa] = useState<{ item: OppItem; open: boolean } | null>(null);
  const [waText, setWaText] = useState("");
  const [book, setBook] = useState<{ item: OppItem; open: boolean } | null>(null);

  const total = categories.reduce((s, c) => s + c.count, 0);
  const byKey = (k: string) => categories.find((c) => c.key === k);
  const filtered = grup ? categories.filter((c) => c.key === grup) : categories.filter((c) => c.count > 0);

  function openWa(item: OppItem) {
    setWaText(item.message);
    setWa({ item, open: true });
  }

  const header = (
    <PageHeader
      title="Gelir Fırsatları"
      description="Paketi biten, uzun süredir gelmeyen ve doğum günü yaklaşan müşteriler. Birine ulaşmak için mesaj yazın ya da randevu verin."
    />
  );

  if (loadFailed) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState title="Gelir Fırsatları yüklenemedi" onRetry={() => router.refresh()} />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          icon={TrendingUp}
          title="Şu an açık fırsat yok"
          description="Müşteri, paket ve randevu bilgileriniz arttıkça fırsatlar burada kendiliğinden listelenir."
          action={
            <Button asChild variant="secondary">
              <Link href="/musteriler">Müşteriler</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const activeCat = grup ? byKey(grup) : null;

  return (
    <div className="min-w-0 space-y-8">
      {header}

      <MetricStrip aria-label="Fırsat özeti">
        {SUMMARY_KEYS.map((k) => {
          const c = byKey(k);
          if (!c) return null;
          return (
            <Metric
              key={k}
              label={c.title}
              value={c.count.toLocaleString("tr-TR")}
              href={`/firsatlar?grup=${c.key}`}
            />
          );
        })}
      </MetricStrip>

      {activeCat && (
        <FilterBar
          tokens={[{ key: "grup", label: activeCat.title, title: `Grup: ${activeCat.title}`, onRemove: () => setGrup("") }]}
          onClearAll={() => setGrup("")}
          result={`${activeCat.count.toLocaleString("tr-TR")} kişi`}
        />
      )}

      <div className={grup ? "grid gap-5" : "grid gap-5 lg:grid-cols-2 lg:items-start"}>
        {filtered.map((c) => {
          const rows = grup ? c.items : c.items.slice(0, PREVIEW);
          const more = c.count - rows.length;
          return (
            <ListGroup
              key={c.key}
              title={c.title}
              detail={`${c.count.toLocaleString("tr-TR")} kişi`}
              inset={64}
              footer={
                (more > 0 || c.link) && (
                  <>
                    {more > 0 ? (
                      <button
                        type="button"
                        onClick={() => setGrup(c.key)}
                        className="focus-ring -mx-2 min-h-11 rounded-lg px-2 font-semibold text-primary-text hover:bg-hover"
                      >
                        {more.toLocaleString("tr-TR")} kişi daha · Tümünü gör
                      </button>
                    ) : (
                      <span />
                    )}
                    {c.link && (
                      <Link
                        href={c.link.href}
                        className="focus-ring -mx-2 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 font-semibold text-primary-text hover:bg-hover"
                      >
                        {c.link.label}
                        <ChevronRight aria-hidden className="size-4" />
                      </Link>
                    )}
                  </>
                )
              }
            >
              {rows.length === 0 ? (
                <li className="px-4 py-8 text-center text-subhead text-label-2">
                  Bu grupta şu an kimse yok.
                </li>
              ) : (
                rows.map((item) => (
                  <ListRow
                    key={item.key}
                    leading={<Avatar name={item.name} />}
                    title={
                      item.customerId ? (
                        <Link
                          href={`/musteriler/${item.customerId}`}
                          className="focus-ring -mx-1 rounded px-1 hover:underline"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )
                    }
                    subtitle={item.subtitle}
                    meta={item.amount != null ? <Money amount={item.amount} tone="debt" /> : undefined}
                    trailing={
                      <span className="flex items-center gap-1">
                        {item.phone && (
                          <Button
                            variant="tinted"
                            size="icon-sm"
                            className="max-md:size-11"
                            aria-label={`${item.name} için WhatsApp mesajı`}
                            onClick={() => openWa(item)}
                          >
                            <MessageCircle />
                          </Button>
                        )}
                        {canBook && item.customerId && (
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            className="max-md:size-11"
                            aria-label={`${item.name} için randevu`}
                            onClick={() => setBook({ item, open: true })}
                          >
                            <CalendarPlus />
                          </Button>
                        )}
                      </span>
                    }
                  />
                ))
              )}
            </ListGroup>
          );
        })}
      </div>

      {/* WhatsApp mesajı */}
      <FormSheet
        open={!!wa?.open}
        onOpenChange={(o) => setWa((w) => (w ? { ...w, open: o } : w))}
        title="WhatsApp mesajı"
        description={wa?.item.name}
      >
        {wa && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opp-msg">Mesaj</Label>
              <Textarea
                id="opp-msg"
                rows={6}
                value={waText}
                onChange={(e) => setWaText(e.target.value)}
              />
              <p className="text-subhead text-label-2">
                Göndermeden önce metni değiştirebilirsiniz. WhatsApp açılır, göndermeyi siz onaylarsınız.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setWa((w) => (w ? { ...w, open: false } : w))}>
                Vazgeç
              </Button>
              <Button asChild disabled={!waText.trim()}>
                <a
                  href={wa.item.phone ? waHref(wa.item.phone, waText) : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWa((w) => (w ? { ...w, open: false } : w))}
                >
                  <MessageCircle />
                  WhatsApp’ta aç
                </a>
              </Button>
            </div>
          </div>
        )}
      </FormSheet>

      {/* Randevu */}
      {book && book.item.customerId && (
        <AppointmentSheet
          customer={{ id: book.item.customerId, full_name: book.item.name }}
          open={book.open}
          onOpenChange={(o) => setBook((b) => (b ? { ...b, open: o } : b))}
          services={services}
          staff={staff}
          packages={packages}
        />
      )}
    </div>
  );
}
