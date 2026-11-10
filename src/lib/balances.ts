import type { createClient } from "@/lib/supabase/server";
import type { CustomerBalance } from "@/types/database";

/**
 * Müşteri borcu — TEK KAYNAK.
 *
 * Hesap veritabanında (`customer_balances` görünümü, 0031) yapılır; menü
 * rozeti de aynı görünümü kullanır. Tanım:
 *   bakiye = paket fiyatları + pakete bağlı olmayan tamamlanmış hizmetler
 *            - müşterinin tüm ödemeleri
 *   gecikmiş tutar = max(0, 30 günden eski satışlar - ödemeler)
 *            (ödemeler en eski satıştan başlayarak düşülür; gün satış tarihinden sayılır)
 * Sayfalar bu dosyadaki fonksiyonlarla okur; kendi hesabını yazmaz.
 */

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export const OVERDUE_DAYS = 30;

export type DebtSummary = {
  /** Açık alacak: borçlu müşterilerin bakiye toplamı. */
  openDebt: number;
  debtorCount: number;
  /** Gecikmiş tutar: gecikmiş müşterilerin gecikmiş tutar toplamı. */
  overdueAmount: number;
  overdueCount: number;
};

const COLUMNS =
  "business_id, customer_id, full_name, phone, charges, payments, balance, overdue_amount, last_payment_at";

const round2 = (n: number) => Math.round(n * 100) / 100;

function normalize(r: CustomerBalance): CustomerBalance {
  return {
    ...r,
    charges: Number(r.charges) || 0,
    payments: Number(r.payments) || 0,
    balance: Number(r.balance) || 0,
    overdue_amount: Number(r.overdue_amount) || 0,
  };
}

/** Müşteri başına bakiye satırları (ödemesi/satışı olanlar). */
export async function fetchCustomerBalances(
  supabase: SupabaseServer,
  businessId: string,
  opts: { debtorsOnly?: boolean; customerId?: string } = {}
): Promise<{ rows: CustomerBalance[]; error: boolean }> {
  let q = supabase.from("customer_balances").select(COLUMNS).eq("business_id", businessId);
  if (opts.debtorsOnly) q = q.gt("balance", 0);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  const { data, error } = await q.limit(5000);
  if (error) console.error("customer_balances:", error);
  return { rows: ((data ?? []) as CustomerBalance[]).map(normalize), error: Boolean(error) };
}

/** Borçlu müşteriler, borcu en yüksek olandan başlayarak. */
export async function fetchDebtors(supabase: SupabaseServer, businessId: string) {
  const { rows, error } = await fetchCustomerBalances(supabase, businessId, { debtorsOnly: true });
  return { rows: rows.sort((a, b) => b.balance - a.balance), error };
}

export function isDebtor(r: Pick<CustomerBalance, "balance">): boolean {
  return r.balance > 0;
}

export function isOverdue(r: Pick<CustomerBalance, "balance" | "overdue_amount">): boolean {
  return r.balance > 0 && r.overdue_amount > 0;
}

/** Açık alacak, borçlu ve gecikmiş sayıları — her ekran bunu kullanır. */
export function summarizeBalances(
  rows: Pick<CustomerBalance, "balance" | "overdue_amount">[]
): DebtSummary {
  let openDebt = 0;
  let debtorCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  for (const r of rows) {
    if (!isDebtor(r)) continue;
    openDebt += r.balance;
    debtorCount++;
    if (isOverdue(r)) {
      overdueAmount += r.overdue_amount;
      overdueCount++;
    }
  }
  return { openDebt: round2(openDebt), debtorCount, overdueAmount: round2(overdueAmount), overdueCount };
}
