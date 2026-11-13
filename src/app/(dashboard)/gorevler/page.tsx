import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { requireModule } from "@/lib/supabase/guard";

import { TasksView } from "./tasks-view";
import {
  todayKey,
  type BoardColumn,
  type BoardOption,
  type BoardTask,
} from "./task-utils";

export const metadata = { title: "Görevler" };

export default async function GorevlerPage() {
  await requireModule("gorevler");
  const { role } = await getAccountContext();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  const [colsRes, tasksRes, staffRes, custRes] = await Promise.all([
    supabase
      .from("task_columns")
      .select("id, label, color, is_done, position")
      .eq("business_id", businessId ?? "")
      .order("position"),
    supabase
      .from("tasks")
      .select(
        "id, column_id, position, title, description, assignee_id, assignee_is_team, due_at, priority, customer_id, is_auto, has_alert, completed_at, created_by_label, created_at, customer:customers(full_name, is_lead, status), assignee:staff(full_name)"
      )
      .eq("business_id", businessId ?? "")
      .order("position"),
    supabase
      .from("staff")
      .select("id, full_name")
      .eq("business_id", businessId ?? "")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("customers")
      .select("id, full_name, is_lead, status")
      .eq("business_id", businessId ?? "")
      .order("full_name")
      .limit(200),
  ]);

  const loadFailed = Boolean(colsRes.error || tasksRes.error);
  if (loadFailed) console.error("gorevler:", colsRes.error ?? tasksRes.error);

  const columns: BoardColumn[] = (
    (colsRes.data ?? []) as {
      id: string; label: string; color: string; is_done: boolean; position: number;
    }[]
  ).map((c) => ({ id: c.id, label: c.label, color: c.color, isDone: c.is_done }));

  type Row = {
    id: string; column_id: string; position: number; title: string;
    description: string | null; assignee_id: string | null; assignee_is_team: boolean;
    due_at: string | null; priority: "high" | "normal" | "low"; customer_id: string | null;
    is_auto: boolean; has_alert: boolean; completed_at: string | null;
    created_by_label: string | null; created_at: string;
    customer: { full_name: string; is_lead: boolean; status: string | null } | null;
    assignee: { full_name: string } | null;
  };

  const tasks: BoardTask[] = ((tasksRes.data ?? []) as unknown as Row[]).map((t) => ({
    id: t.id,
    columnId: t.column_id,
    title: t.title,
    description: t.description ?? "",
    assigneeId: t.assignee_id,
    assigneeName: t.assignee_is_team ? "Tüm ekip" : t.assignee?.full_name ?? "Tüm ekip",
    dueAt: t.due_at,
    priority: t.priority,
    customerId: t.customer_id,
    customerName: t.customer?.full_name ?? null,
    customerStatus: t.customer
      ? t.customer.is_lead
        ? "lead"
        : t.customer.status === "passive"
          ? "pasif"
          : "aktif"
      : null,
    isAuto: t.is_auto,
    hasAlert: t.has_alert,
    completedAt: t.completed_at,
    createdByLabel: t.created_by_label ?? "Sistem",
    createdAt: t.created_at,
  }));

  const staff: BoardOption[] = ((staffRes.data ?? []) as { id: string; full_name: string }[]).map(
    (s) => ({ id: s.id, label: s.full_name })
  );

  const customers: BoardOption[] = (
    (custRes.data ?? []) as { id: string; full_name: string; is_lead: boolean }[]
  ).map((c) => ({ id: c.id, label: c.is_lead ? `${c.full_name} (Lead)` : c.full_name }));

  return (
    <TasksView
      columns={columns}
      tasks={tasks}
      staff={staff}
      customers={customers}
      canManageLists={can(role, "musteri_yonet")}
      today={todayKey()}
      loadFailed={loadFailed || !businessId}
    />
  );
}
