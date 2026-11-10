"use client";

import { useRouter } from "next/navigation";

import { useUrlState } from "@/lib/use-url-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import type { Subscription } from "@/types/database";

import { AuditSection } from "./section-audit";
import { GeneralSection } from "./section-general";
import { HoursSection } from "./section-hours";
import { IntegrationsSection } from "./section-integrations";
import { NotificationsSection } from "./section-notifications";
import { SubscriptionSection } from "./section-subscription";
import type { NotificationSettingInput, Provider, WorkingDay } from "./schema";

export interface SettingsData {
  business: { name: string; sector: string; phone: string; email: string; address: string };
  owner: { full_name: string; phone: string; email: string; roleLabel: string };
  workingDays: WorkingDay[];
  subscription: Pick<Subscription, "plan" | "status" | "price" | "started_at" | "expires_at"> | null;
  /** Aboneliğin bitmesine kalan gün (süresizse null). */
  daysLeft: number | null;
  auditLog: { id: string; created_at: string; actor_label: string; action: string; entity: string; summary: string | null }[];
  notifications: NotificationSettingInput[];
  /** credentials burada YOK: sunucuda kalır, istemciye asla gelmez. */
  integrations: {
    provider: Provider;
    status: "connected" | "disconnected" | "error";
    account_label: string | null;
    last_error: string | null;
    connected_at: string | null;
  }[];
}

const SECTIONS = [
  { value: "temel", label: "Temel bilgiler" },
  { value: "saatler", label: "Çalışma saatleri" },
  { value: "bildirimler", label: "Bildirimler" },
  { value: "baglantilar", label: "Bağlantılar" },
  { value: "abonelik", label: "Abonelik" },
  { value: "kayitlar", label: "İşlem kayıtları" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["value"];

export function SettingsView({ data, loadFailed }: { data: SettingsData; loadFailed: boolean }) {
  const router = useRouter();
  const [raw, setSection] = useUrlState("bolum", "temel");
  const section: SectionKey = SECTIONS.some((s) => s.value === raw) ? (raw as SectionKey) : "temel";

  const connected = data.integrations.filter((i) => i.status === "connected").map((i) => i.provider);

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        title="Ayarlar"
        description="İşletme bilgilerinizi, çalışma saatlerinizi, bildirimleri ve bağlantıları buradan yönetin."
      />

      {loadFailed ? (
        <ErrorState title="Ayarlar yüklenemedi" onRetry={() => router.refresh()} />
      ) : (
        <>
          <SegmentedControl
            items={SECTIONS}
            value={section}
            onValueChange={setSection}
            aria-label="Ayar bölümü"
            size="touch"
            className="w-full md:w-auto"
          />

          {section === "temel" && <GeneralSection business={data.business} owner={data.owner} />}
          {section === "saatler" && <HoursSection days={data.workingDays} />}
          {section === "bildirimler" && (
            <NotificationsSection items={data.notifications} connected={connected} />
          )}
          {section === "baglantilar" && <IntegrationsSection rows={data.integrations} />}
          {section === "abonelik" && (
            <SubscriptionSection sub={data.subscription} daysLeft={data.daysLeft} />
          )}
          {section === "kayitlar" && <AuditSection log={data.auditLog} />}
        </>
      )}
    </div>
  );
}
