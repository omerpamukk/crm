/**
 * Veritabanı tablolarının TypeScript karşılıkları.
 * supabase/migrations/0001_init.sql + 0002_*.sql ile eşleşir.
 */

/**
 * Firma içi roller (0015_roles.sql).
 * Yetki matrisi: src/lib/permissions.ts
 */
export type UserRole = "owner" | "reception" | "specialist";

export type InteractionType =
  | "mesaj"
  | "arama"
  | "randevu_olusturuldu"
  | "randevu_tamamlandi"
  | "not"
  | "asama_degisikligi";

export type PaymentStatus = "odendi" | "kismi" | "odenmedi";

export type PaymentMethod = "nakit" | "kart" | "havale" | "diger";

export type PaymentRelatedType = "paket" | "randevu" | "diger";

export type ExpenseCategory =
  | "kira"
  | "maas"
  | "malzeme"
  | "fatura"
  | "pazarlama"
  | "vergi"
  | "diger";

export interface Business {
  id: string;
  created_at: string;
  name: string;
  sector: string | null;
  logo_url?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  currency?: string;
  timezone?: string;
  working_hours?: Record<string, unknown>;
  slug?: string | null;
  updated_at?: string | null;
}

/** customer_summary view (0007) — müşteri başına özet metrikler. */
export interface CustomerSummary {
  customer_id: string;
  business_id: string;
  full_name: string;
  total_paid: number;
  open_debt: number;
  appointment_count: number;
  completed_count: number;
  last_visit_at: string | null;
}

export interface Profile {
  id: string;
  created_at: string;
  business_id: string | null;
  full_name: string | null;
  role: UserRole;
  phone?: string | null;
  /** Uzman rolündeki kullanıcının bağlı olduğu personel kaydı (0015). */
  staff_id?: string | null;
}

/** Süper-admin (ajans) kullanıcıları — platform_admins (0008). */
export interface PlatformAdmin {
  user_id: string;
  created_at: string;
}

export type SubscriptionStatus = "active" | "trial" | "suspended" | "cancelled";

/** Firma başına abonelik — subscriptions (0008). */
export interface Subscription {
  id: string;
  business_id: string;
  plan: string;
  status: SubscriptionStatus;
  price: number;
  started_at: string;
  expires_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  created_at: string;
  business_id: string;
  name: string;
  color: string;
  position: number;
}

export interface Customer {
  id: string;
  created_at: string;
  business_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  tags: string[] | null;
  note: string | null;
  status: string | null;
  last_visit_at: string | null;
  birthday: string | null;
  is_lead: boolean;
  assigned_to: string | null;
  pipeline_stage_id: string | null;
}

export interface Interaction {
  id: string;
  created_at: string;
  business_id: string;
  customer_id: string;
  type: InteractionType;
  note: string | null;
  created_by: string | null;
}

export interface Service {
  id: string;
  created_at: string;
  business_id: string;
  name: string;
  duration_min: number | null;
  price: number | null;
  category: string | null;
  bookable?: boolean;
}

export interface Appointment {
  id: string;
  created_at: string;
  business_id: string;
  customer_id: string | null;
  service_id: string | null;
  starts_at: string;
  staff_id: string | null;
  status: string | null;
  note: string | null;
  package_id: string | null;
  price: number | null;
  staff_member_id: string | null;
  booked_online?: boolean;
}

export interface Payment {
  id: string;
  created_at: string;
  business_id: string;
  customer_id: string | null;
  amount: number;
  method: PaymentMethod;
  related_type: PaymentRelatedType | null;
  related_id: string | null;
  note: string | null;
  created_by: string | null;
}

export interface Expense {
  id: string;
  created_at: string;
  business_id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  spent_at: string;
  method: PaymentMethod;
  note: string | null;
  created_by: string | null;
}

export interface Staff {
  id: string;
  created_at: string;
  business_id: string;
  full_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  commission_rate: number;
  is_active: boolean;
  note: string | null;
}

export type AgencyPermission = "view" | "view_report";

export interface AgencyAccess {
  id: string;
  created_at: string;
  business_id: string;
  name: string;
  email: string | null;
  token: string;
  sections: string[];
  permission: AgencyPermission;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
  created_by: string | null;
}

export interface BookingSettings {
  id: string;
  created_at: string;
  business_id: string;
  token: string;
  slot_minutes: number;
  /** 1=Pzt ... 7=Paz */
  work_days: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Package {
  id: string;
  created_at: string;
  business_id: string;
  customer_id: string | null;
  service_name: string | null;
  total_sessions: number | null;
  remaining_sessions: number | null;
  purchased_at: string | null;
  price: number | null;
  paid_amount: number;
  payment_status: PaymentStatus;
}
