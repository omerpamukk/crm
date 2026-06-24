"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Flower2,
  Scissors,
  CalendarDays,
  Clock,
  User,
  CheckCircle2,
  ChevronLeft,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { submitBooking } from "./actions";

export interface BookingConfig {
  valid: boolean;
  business_name?: string;
  slot_minutes?: number;
  work_days?: number[];
  start_time?: string;
  end_time?: string;
  services?: { id: string; name: string; price: number | null; duration_min: number | null }[];
}

const tl = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(v);

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const WD = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/** JS getDay (0=Paz..6=Cmt) → bizim format (1=Pzt..7=Paz) */
function isoWeekday(d: Date) {
  const g = d.getDay();
  return g === 0 ? 7 : g;
}

const STEPS = [
  { n: 1, label: "Hizmet", icon: Scissors },
  { n: 2, label: "Tarih & Saat", icon: CalendarDays },
  { n: 3, label: "Bilgilerin", icon: User },
  { n: 4, label: "Onay", icon: CheckCircle2 },
];

export function BookingFlow({ token, config }: { token: string; config: BookingConfig }) {
  const services = config.services ?? [];
  const workDays = config.work_days ?? [1, 2, 3, 4, 5];
  const slot = config.slot_minutes ?? 30;
  const startTime = config.start_time ?? "09:00";
  const endTime = config.end_time ?? "18:00";

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.id === serviceId) ?? null;

  // Önümüzdeki 21 günden çalışma günlerine denk gelenler
  const dates = useMemo(() => {
    const out: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 21; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      if (workDays.includes(isoWeekday(d))) out.push(d);
    }
    return out;
  }, [workDays]);

  // Açılış-kapanış arası slot saatleri
  const times = useMemo(() => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const out: string[] = [];
    for (let m = startMin; m + slot <= endMin; m += slot) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    }
    return out;
  }, [startTime, endTime, slot]);

  const dateLabel = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return `${WD[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };

  function submit() {
    if (!service || !date || !time) return;
    setError(null);
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    startTransition(async () => {
      const res = await submitBooking({
        token,
        name,
        phone,
        serviceId: service.id,
        startsAt,
      });
      if (!res.ok) setError(res.error ?? "Bir hata oluştu.");
      else setDone(true);
    });
  }

  if (done) {
    return (
      <Shell businessName={config.business_name}>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-positive/12 text-positive">
            <CheckCircle2 className="size-9" />
          </span>
          <div>
            <h2 className="text-xl font-bold">Randevu Talebin Alındı 🎉</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {service?.name} · {date && dateLabel(date)} · {time}
            </p>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            İşletme randevunu onayladığında seninle iletişime geçecek. Teşekkürler, {name.split(" ")[0]}!
          </p>
        </div>
      </Shell>
    );
  }

  const canNext =
    (step === 1 && !!serviceId) ||
    (step === 2 && !!date && !!time) ||
    (step === 3 && name.trim().length > 1 && phone.trim().length >= 7);

  return (
    <Shell businessName={config.business_name}>
      {/* Adım göstergesi */}
      <div className="mb-5 flex items-center justify-between">
        {STEPS.map((s, i) => {
          const active = s.n === step;
          const complete = s.n < step;
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    active && "bg-primary text-primary-foreground",
                    complete && "bg-positive text-white",
                    !active && !complete && "bg-muted text-muted-foreground"
                  )}
                >
                  {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded",
                    s.n < step ? "bg-positive" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Adım 1: Hizmet */}
      {step === 1 && (
        <div className="space-y-2">
          <h2 className="mb-2 font-semibold">Hangi hizmeti almak istersin?</h2>
          {services.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Şu anda online randevuya açık hizmet bulunmuyor.
            </p>
          ) : (
            services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                  serviceId === s.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.duration_min ? `${s.duration_min} dk` : "—"}
                  </p>
                </div>
                <span className="font-semibold text-primary">{tl(s.price)}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Adım 2: Tarih & Saat */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 font-semibold">Tarih seç</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((d) => {
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const on = date === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setDate(iso);
                      setTime(null);
                    }}
                    className={cn(
                      "flex min-w-14 shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/50"
                    )}
                  >
                    <span className="text-[10px] uppercase">{WD[d.getDay()]}</span>
                    <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                    <span className="text-[10px]">{MONTHS[d.getMonth()]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {date && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold">
                <Clock className="size-4" /> Saat seç
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {times.map((t) => {
                  const on = time === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className={cn(
                        "rounded-lg border py-2 text-sm font-medium transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/50"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adım 3: Bilgiler */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold">İletişim bilgilerin</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="b-name">
              Ad Soyad
            </label>
            <input
              id="b-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adın ve soyadın"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="b-phone">
              Telefon
            </label>
            <input
              id="b-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
      )}

      {/* Adım 4: Onay */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Randevunu onayla</h2>
          <div className="space-y-3 rounded-xl border p-4 text-sm">
            <Row icon={Scissors} label="Hizmet" value={service?.name ?? "—"} extra={tl(service?.price ?? null)} />
            <Row icon={CalendarDays} label="Tarih" value={date ? dateLabel(date) : "—"} />
            <Row icon={Clock} label="Saat" value={time ?? "—"} />
            <Row icon={User} label="Ad Soyad" value={name} />
            <Row icon={User} label="Telefon" value={phone} />
          </div>
          {error && (
            <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
          )}
        </div>
      )}

      {/* Alt navigasyon */}
      <div className="mt-6 flex items-center gap-2">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={pending}>
            <ChevronLeft />
            Geri
          </Button>
        )}
        {step < 4 ? (
          <Button className="flex-1" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Devam Et
          </Button>
        ) : (
          <Button className="flex-1" onClick={submit} disabled={pending}>
            {pending ? "Gönderiliyor…" : "Randevuyu Oluştur"}
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: typeof Scissors;
  label: string;
  value: string;
  extra?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="text-right font-medium">
        {value}
        {extra && <span className="ml-2 text-primary">{extra}</span>}
      </span>
    </div>
  );
}

function Shell({
  businessName,
  children,
}: {
  businessName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-muted/30 py-6">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white">
            <Flower2 className="size-6" />
          </span>
          <div>
            <p className="font-bold leading-tight">{businessName ?? "Online Randevu"}</p>
            <p className="text-xs text-muted-foreground">Online Randevu</p>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">{children}</div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Randevu sistemi · {businessName}
        </p>
      </div>
    </div>
  );
}
