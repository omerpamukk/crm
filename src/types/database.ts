/**
 * Veritabanı tablolarının TypeScript karşılıkları.
 * supabase/migrations/0001_init.sql + 0002_*.sql ile eşleşir.
 */

export type UserRole = "owner" | "staff";

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
}

export interface Profile {
  id: string;
  created_at: string;
  business_id: string | null;
  full_name: string | null;
  role: UserRole;
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
