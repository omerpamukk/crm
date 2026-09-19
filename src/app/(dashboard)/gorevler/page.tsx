import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";

import { TasksBoard, type BoardColumn, type BoardTask, type BoardOption } from "./tasks-board";

export default async function GorevlerPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  const [colsRes, tasksRes, staffRes, custRes] = await Promise.all([
    supabase
      .from("task_columns")
      .select("id, label, color, is_done, position")
      .order("position"),
    supabase
      .from("tasks")
      .select(
        "id, column_id, position, emoji, title, description, assignee_id, assignee_is_team, due_at, priority, customer_id, is_auto, has_alert, completed_at, created_by_label, created_at, customer:customers(full_name, is_lead, status), assignee:staff(full_name)"
      )
      .order("position"),
    supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase
      .from("customers")
      .select("id, full_name, is_lead, status")
      .order("full_name")
      .limit(200),
  ]);

  const columns: BoardColumn[] = (
    (colsRes.data ?? []) as {
      id: string; label: string; color: string; is_done: boolean; position: number;
    }[]
  ).map((c) => ({
    id: c.id,
    label: c.label,
    color: c.color,
    isDone: c.is_done,
  }));

  type Row = {
    id: string; column_id: string; position: number; emoji: string; title: string;
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
    emoji: t.emoji,
    title: t.title,
    description: t.description ?? "",
    assigneeId: t.assignee_id,
    assigneeName: t.assignee_is_team ? "Tüm Ekip" : t.assignee?.full_name ?? "Tüm Ekip",
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
    createdByLabel: t.created_by_label ?? "—",
    createdAt: t.created_at,
  }));

  const staff: BoardOption[] = (
    (staffRes.data ?? []) as { id: string; full_name: string }[]
  ).map((s) => ({ id: s.id, label: s.full_name }));

  const customers: BoardOption[] = (
    (custRes.data ?? []) as { id: string; full_name: string; is_lead: boolean; status: string | null }[]
  ).map((c) => ({
    id: c.id,
    label: c.full_name,
    status: c.is_lead ? "lead" : c.status === "passive" ? "pasif" : "aktif",
  }));

  return (
    <TasksBoard
      columns={columns}
      tasks={tasks}
      staff={staff}
      customers={customers}
      hasBusiness={!!businessId}
    />
  );
}
