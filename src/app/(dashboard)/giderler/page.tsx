import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability, requireModule } from "@/lib/supabase/guard";
import type { Expense } from "@/types/database";

import { parseDateKey } from "../randevular/date-range";
import { resolvePeriod } from "../raporlar/period";
import { ExpensesView } from "./expenses-view";

export const metadata = { title: "Giderler" };

const KINDS = ["hafta", "ay", "ozel"] as const;

export default async function GiderlerPage({
  searchParams,
}: {
  searchParams: Promise<{ aralik?: string; tarih?: string; bas?: string; bit?: string }>;
}) {
  // Giderler yalnızca işletme sahibine açık (RLS de ayrıca kısıtlar).
  await requireCapability("finans");
  await requireModule("giderler");

  const now = new Date();
  const period = resolvePeriod(await searchParams, "ay", KINDS, now);
  const base = { todayMs: now.getTime() };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) {
    return <ExpensesView {...base} expenses={[]} income={0} totalCount={0} loadFailed />;
  }

  const startAt = (parseDateKey(period.startKey) as Date).toISOString();
  const endAt = (parseDateKey(period.endKey) as Date).toISOString();

  const [expensesRes, incomeRes, countRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("business_id", businessId)
      .gte("spent_at", period.startKey)
      .lte("spent_at", period.lastKey)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("payments")
      .select("amount")
      .eq("business_id", businessId)
      .gte("created_at", startAt)
      .lt("created_at", endAt)
      .limit(10000),
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("business_id", businessId),
  ]);

  const income = ((incomeRes.data ?? []) as { amount: number | null }[]).reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <ExpensesView
      {...base}
      expenses={(expensesRes.data ?? []) as Expense[]}
      income={income}
      totalCount={countRes.count ?? 0}
      loadFailed={Boolean(expensesRes.error || incomeRes.error || countRes.error)}
    />
  );
}
