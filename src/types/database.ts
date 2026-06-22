/**
 * Veritabanı tablolarının TypeScript karşılıkları.
 * supabase/migrations/0001_init.sql ile eşleşir.
 */

export type UserRole = "owner" | "staff";

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
}
