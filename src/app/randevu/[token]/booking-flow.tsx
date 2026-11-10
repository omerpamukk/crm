"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarX2, CheckCircle2, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeletons";

import { submitBooking, getBookedSlots } from "./actions";
import {
  addDays,
  dayLabel,
  dayParts,
  isoWeekday,
  nowMinutes,
  slotTimes,
  timeToMinutes,
  toStartsAt,
} from "./booking-time";
import { contactSchema, type ContactInput } from "./schema";

export interface BookingConfig {
  valid: boolean;
  business_name?: string;
  slot_minutes?: number;
  work_days?: number[];
  start_time?: string;
  end_time?: string;
  services?: { id: string; name: string; price: number | null; duration_min: number | null }[];
}

const STEP_TITLES = ["Hizmet seçin", "Gün ve saat seçin", "Bilgileriniz", "Onay"] as const;
const DAYS_AHEAD = 21;

/**
 * Online randevu: müşteri telefondan açar. Tek sütun, büyük dokunma hedefleri.
 * Adımlar: hizmet → gün ve saat → bilgiler → onay. Bütün gün/saat hesabı
 * işletmenin saat diliminde (İstanbul) yapılır; sunucuya gerçek an (ISO)
 * gönderilir.
 */
export function BookingFlow({
  token,
  config,
  today,
}: {
  token: string;
  config: BookingConfig;
  /** Bugünün İstanbul günü ("2026-11-06"); sunucuda hesaplanır. */
  today: string;
}) {
  const services = config.services ?? [];
  const slot = config.slot_minutes ?? 30;
  const startTime = config.start_time ?? "09:00";
  const endTime = config.end_time ?? "18:00";

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Seçilen gündeki dolu saatler: sunucudan gelir, listeden çıkarılır.
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // Gün seçildiği andaki İstanbul saati (bugünün geçmiş saatlerini elemek için).
  const [cutoff, setCutoff] = useState(0);

  const service = services.find((s) => s.id === serviceId) ?? null;

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", phone: "", kvkk: false },
  });

  // Önümüzdeki günlerden çalışma günlerine denk gelenler
  const dates = useMemo(() => {
    const workDays = config.work_days ?? [1, 2, 3, 4, 5];
    const out: string[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const key = addDays(today, i);
      if (workDays.includes(isoWeekday(key))) out.push(key);
    }
    return out;
  }, [config.work_days, today]);

  const times = useMemo(() => slotTimes(startTime, endTime, slot), [startTime, endTime, slot]);

  /** Gün seçimi: dolu saatler o anda getirilir. */
  function pickDate(key: string) {
    setDate(key);
    setTime(null);
    setError(null);
    setBookedSlots([]);
    setCutoff(nowMinutes());
    setLoadingSlots(true);
    getBookedSlots(token, key)
      .then(setBookedSlots)
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }

  const availableTimes = useMemo(
    () =>
      times.filter((t) => {
        if (bookedSlots.includes(t)) return false;
        if (date !== today) return true;
        return timeToMinutes(t) > cutoff;
      }),
    [times, bookedSlots, date, today, cutoff]
  );

  function submit(contact: ContactInput) {
    if (!service || !date || !time) return;
    setError(null);
    const startsAt = toStartsAt(date, time);
    if (!startsAt) {
      setError("Seçtiğiniz saat geçerli değil. Lütfen başka bir saat seçin.");
      return;
    }
    startTransition(async () => {
      const res = await submitBooking({
        token,
        name: contact.name,
        phone: contact.phone,
        serviceId: service.id,
        startsAt,
        kvkk: contact.kvkk,
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const msg = res.error ?? "Randevu oluşturulamadı. Lütfen tekrar deneyin.";
      // Saat başkası tarafından alınmışsa gün ve saat adımına dön.
      if (msg.includes("doldu")) {
        setStep(2);
        pickDate(date);
      }
      setError(msg);
    });
  }

  if (done) {
    const name = getValues("name");
    return (
      <Frame businessName={config.business_name}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 aria-hidden className="size-12 text-positive-text" strokeWidth={1.5} />
          <h2 className="text-title-3 font-semibold">Randevu talebiniz alındı</h2>
          <p className="text-[0.9375rem] text-label-2">
            {service?.name} · {date && dayLabel(date)} · {time}
          </p>
          <p className="max-w-xs text-[0.9375rem] text-label-2">
            İşletme randevunuzu onayladığında sizinle iletişime geçecek. Teşekkürler{name ? `, ${name.split(" ")[0]}` : ""}.
          </p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame businessName={config.business_name}>
      {/* Adım göstergesi: çubuk + metin (renk tek başına anlam taşımaz) */}
      <div className="mb-5" role="group" aria-label={`Adım ${step} / ${STEP_TITLES.length}`}>
        <div className="flex gap-1.5" aria-hidden>
          {STEP_TITLES.map((_, i) => (
            <span
              key={i}
              className={cn("h-1 flex-1 rounded-full", i < step ? "bg-primary-fill" : "bg-fill-2")}
            />
          ))}
        </div>
        <p className="mt-2 text-subhead text-label-2">
          Adım {step} / {STEP_TITLES.length}
        </p>
      </div>

      <h2 className="mb-3 text-title-3 font-semibold">
        {step}. {STEP_TITLES[step - 1]}
      </h2>

      {/* Adım 1: Hizmet */}
      {step === 1 &&
        (services.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={CalendarX2}
            title="Online randevuya açık hizmet yok"
            description="Randevu almak için lütfen işletmeyi arayın."
          />
        ) : (
          <ul role="radiogroup" aria-label="Hizmet" className="space-y-2">
            {services.map((s) => {
              const on = serviceId === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setServiceId(s.id)}
                    className={cn(
                      "focus-ring pressable flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
                      on ? "bg-primary-soft ring-2 ring-primary" : "bg-fill hover:bg-fill-2"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.9375rem] font-medium">{s.name}</span>
                      {s.duration_min ? (
                        <span className="block text-subhead text-label-2">{s.duration_min} dk</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">
                      {formatPrice(s.price)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ))}

      {/* Adım 2: Gün ve saat */}
      {step === 2 && (
        <div className="space-y-5">
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[0.9375rem] text-danger-text">
              {error}
            </p>
          )}
          {dates.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={CalendarX2}
              title="Uygun gün bulunamadı"
              description="Randevu almak için lütfen işletmeyi arayın."
            />
          ) : (
            <>
              <div
                role="radiogroup"
                aria-label="Gün"
                className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
              >
                {dates.map((key) => {
                  const p = dayParts(key);
                  const on = date === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={dayLabel(key)}
                      onClick={() => pickDate(key)}
                      className={cn(
                        "focus-ring pressable flex min-h-[4.25rem] min-w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-2xl px-2 py-2 transition-colors",
                        on
                          ? "bg-primary-fill text-on-primary-fill"
                          : "bg-fill text-label hover:bg-fill-2"
                      )}
                    >
                      <span className="text-caption uppercase">{p.weekday}</span>
                      <span className="text-title-3 leading-tight font-semibold tabular-nums">{p.day}</span>
                      <span className="text-caption">{p.month}</span>
                    </button>
                  );
                })}
              </div>

              {date && (
                <div>
                  <h3 className="mb-2 text-[0.9375rem] font-semibold">Saat</h3>
                  {loadingSlots ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy aria-label="Saatler yükleniyor">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-11 rounded-xl" />
                      ))}
                    </div>
                  ) : availableTimes.length === 0 ? (
                    <p className="rounded-xl bg-fill px-4 py-6 text-center text-[0.9375rem] text-label-2">
                      Bu gün için boş saat kalmadı. Başka bir gün seçin.
                    </p>
                  ) : (
                    <div role="radiogroup" aria-label="Saat" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {availableTimes.map((t) => {
                        const on = time === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setTime(t)}
                            className={cn(
                              "focus-ring pressable h-11 rounded-xl text-[0.9375rem] font-medium tabular-nums transition-colors",
                              on
                                ? "bg-primary-fill text-on-primary-fill"
                                : "bg-fill text-label hover:bg-fill-2"
                            )}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Adım 3: Bilgiler */}
      {step === 3 && (
        <form
          id="contact-form"
          onSubmit={handleSubmit(() => {
            setError(null);
            setStep(4);
          })}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="b-name">Ad soyad</Label>
            <Input
              id="b-name"
              autoComplete="name"
              placeholder="Adınız ve soyadınız"
              className="h-11"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <p className="text-subhead text-danger-text">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-phone">Telefon</Label>
            <Input
              id="b-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05xx xxx xx xx"
              className="h-11"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone && <p className="text-subhead text-danger-text">{errors.phone.message}</p>}
          </div>

          {/* KVKK açık rıza: yasal zorunluluk */}
          <div className="space-y-2">
            <Controller
              control={control}
              name="kvkk"
              render={({ field }) => (
                <label
                  htmlFor="b-kvkk"
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl bg-fill px-4 py-3"
                >
                  <input
                    id="b-kvkk"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    aria-invalid={!!errors.kvkk}
                    className="focus-ring mt-0.5 size-5 shrink-0 accent-[var(--primary-fill)]"
                  />
                  <span className="text-subhead leading-relaxed text-label-2">
                    Randevu oluşturmak için ad, soyad ve telefon bilgilerimin işlenmesine ve randevu hatırlatmaları için
                    benimle iletişime geçilmesine <b className="text-label">açık rıza</b> veriyorum (KVKK).
                  </span>
                </label>
              )}
            />
            {errors.kvkk && <p className="text-subhead text-danger-text">{errors.kvkk.message}</p>}
          </div>
        </form>
      )}

      {/* Adım 4: Onay */}
      {step === 4 && (
        <div className="space-y-4">
          <dl className="surface-flat divide-y divide-[color:var(--separator)] px-4 text-[0.9375rem]">
            <SummaryRow label="Hizmet" value={service?.name ?? "—"} extra={service ? formatPrice(service.price) : undefined} />
            <SummaryRow label="Gün" value={date ? dayLabel(date) : "—"} />
            <SummaryRow label="Saat" value={time ?? "—"} />
            <SummaryRow label="Ad soyad" value={getValues("name")} />
            <SummaryRow label="Telefon" value={getValues("phone")} />
          </dl>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[0.9375rem] text-danger-text">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Alt gezinme */}
      <div className="mt-6 flex items-center gap-2">
        {step > 1 && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
            disabled={pending}
          >
            <ChevronLeft />
            Geri
          </Button>
        )}
        {step === 1 && (
          <Button size="lg" className="flex-1" onClick={() => setStep(2)} disabled={!serviceId}>
            Devam et
          </Button>
        )}
        {step === 2 && (
          <Button size="lg" className="flex-1" onClick={() => setStep(3)} disabled={!date || !time}>
            Devam et
          </Button>
        )}
        {step === 3 && (
          <Button type="submit" form="contact-form" size="lg" className="flex-1">
            Devam et
          </Button>
        )}
        {step === 4 && (
          <Button size="lg" className="flex-1" onClick={handleSubmit(submit)} disabled={pending}>
            {pending ? "Gönderiliyor..." : "Randevuyu oluştur"}
          </Button>
        )}
      </div>
    </Frame>
  );
}

function SummaryRow({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <dt className="shrink-0 text-label-2">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">
        {value}
        {extra && <span className="ml-2 tabular-nums text-label-2">{extra}</span>}
      </dd>
    </div>
  );
}

/** Sayfa çerçevesi: kabuk yok; Randevu Linki'ndeki önizlemeyle aynı başlık bandı. */
function Frame({ businessName, children }: { businessName?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-svh px-4 py-6 sm:py-10">
      <div aria-hidden className="app-wall" />
      <main className="mx-auto w-full max-w-md">
        <div className="surface overflow-hidden">
          <header className="bg-primary-fill px-5 py-5 text-center text-on-primary-fill">
            <p className="text-subhead opacity-85">Online randevu</p>
            <h1 className="mt-0.5 text-title-3 font-semibold break-words">
              {businessName ?? "Randevunuzu oluşturun"}
            </h1>
          </header>
          <div className="p-5">{children}</div>
        </div>
      </main>
    </div>
  );
}
