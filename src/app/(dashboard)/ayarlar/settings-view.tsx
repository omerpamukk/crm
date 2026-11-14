"use client";

import { isModuleEnabled } from "@/lib/modules";
import { LogoSection } from "./section-logo";
import { LoyaltySection, type LoyaltyForm } from "./section-loyalty";
import { ProfileSection, type ProfileForm } from "./section-profile";
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
import { ModulesSection } from "./section-modules";
import { NotificationsSection } from "./section-notifications";
import { SubscriptionSection } from "./section-subscription";
import type { NotificationSettingInput, Provider, WorkingDay } from "./schema";

export interface SettingsData {
  business: { name: string; sector: string; phone: string; email: string; address: string; logo_url?: string | null };
  /** Logo yükleme yolu için (business-logos/<işletme>/). */
  businessId: string;
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
  /** Açık modüller; null = hepsi açık (0036 öncesi işletme). */
  modules: string[] | null;
  /** 0036 çalıştırıldı mı (enabled_modules okunabildi mi). */
  modulesReady: boolean;
  /** Sadakat kartı ve herkese açık sayfa (0040); okunamazsa null (bölümler gizli). */
  extras: { profile: ProfileForm; loyalty: LoyaltyForm } | null;
}

const SECTIONS = [
  { value: "temel", label: "Temel bilgiler" },
  { value: "saatler", label: "Çalışma saatleri" },
  { value: "moduller", label: "Modüller" },
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
        description="İşletme bilgilerinizi, çalışma saatlerinizi, açık modülleri, bildirimleri ve bağlantıları buradan yönetin."
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

          {section === "temel" && (
            <div className="space-y-8">
              {data.businessId && (
                <LogoSection businessId={data.businessId} businessName={data.business.name} logoUrl={data.business.logo_url ?? null} />
              )}
              <GeneralSection business={data.business} owner={data.owner} />
              {data.extras && <ProfileSection initial={data.extras.profile} />}
            </div>
          )}
          {section === "saatler" && <HoursSection days={data.workingDays} />}
          {section === "moduller" && (
            <div className="space-y-8">
              <ModulesSection modules={data.modules} ready={data.modulesReady} />
              {data.extras && isModuleEnabled(data.modules, "sadakat") && <LoyaltySection initial={data.extras.loyalty} />}
            </div>
          )}
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
