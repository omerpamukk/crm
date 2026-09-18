"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import {
  taskSchema,
  columnSchema,
  type TaskInput,
  type ColumnInput,
} from "./schema";

type ActionResult = { error?: string };

/** Oturum sahibinin adı — aktivite kaydında "kim yaptı" için. */
async function actorInfo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    label: (data as { full_name: string | null } | null)?.full_name || user.email || "Kullanıcı",
  };
}

function toTimestamp(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };
  const actor = await actorInfo(supabase);

  const v = parsed.data;

  // Yeni kart listenin sonuna eklenir.
  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("column_id", v.column_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((last as { position: number } | null)?.position ?? -1) + 1;

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      business_id: businessId,
      column_id: v.column_id,
      position,
      emoji: v.emoji?.trim() || "📝",
      title: v.title.trim(),
      description: v.description?.trim() || null,
      assignee_id: v.assignee_id || null,
      assignee_is_team: !v.assignee_id,
      due_at: toTimestamp(v.due_at),
      priority: v.priority,
      customer_id: v.customer_id || null,
      created_by: actor?.id ?? null,
      created_by_label: actor?.label ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createTask:", error);
    return { error: "Görev eklenemedi." };
  }

  await supabase.from("task_activity").insert({
    business_id: businessId,
    task_id: (created as { id: string }).id,
    actor_id: actor?.id ?? null,
    actor_label: actor?.label ?? "Sistem",
    action: "created",
    to_column_id: v.column_id,
  });

  revalidatePath("/gorevler");
  return {};
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };
  const actor = await actorInfo(supabase);

  const v = parsed.data;
  const { error } = await supabase
    .from("tasks")
    .update({
      title: v.title.trim(),
      description: v.description?.trim() || null,
      emoji: v.emoji?.trim() || "📝",
      assignee_id: v.assignee_id || null,
      assignee_is_team: !v.assignee_id,
      due_at: toTimestamp(v.due_at),
      priority: v.priority,
      customer_id: v.customer_id || null,
    })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updateTask:", error);
    return { error: "Görev güncellenemedi." };
  }

  await supabase.from("task_activity").insert({
    business_id: businessId,
    task_id: id,
    actor_id: actor?.id ?? null,
    actor_label: actor?.label ?? "Sistem",
    action: "updated",
  });

  revalidatePath("/gorevler");
  return {};
}

/** Sürükle-bırak: kartı başka listeye ve/veya farklı sıraya taşır. */
export async function moveTask(
  id: string,
  toColumnId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };
  const actor = await actorInfo(supabase);

  const { data: current } = await supabase
    .from("tasks")
    .select("column_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  const fromColumnId = (current as { column_id: string } | null)?.column_id ?? null;

  // Hedef listenin "tamamlandı" kolonu olup olmadığına göre completed_at ayarla.
  const { data: col } = await supabase
    .from("task_columns")
    .select("is_done")
    .eq("id", toColumnId)
    .maybeSingle();
  const isDone = (col as { is_done: boolean } | null)?.is_done ?? false;

  const { error } = await supabase
    .from("tasks")
    .update({
      column_id: toColumnId,
      completed_at: isDone ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("moveTask:", error);
    return { error: "Görev taşınamadı." };
  }

  // Sıralamayı tek seferde yaz (döngüde await yok).
  if (orderedIds.length > 0) {
    await Promise.all(
      orderedIds.map((taskId, index) =>
        supabase
          .from("tasks")
          .update({ position: index })
          .eq("id", taskId)
          .eq("business_id", businessId)
      )
    );
  }

  if (fromColumnId !== toColumnId) {
    await supabase.from("task_activity").insert({
      business_id: businessId,
      task_id: id,
      actor_id: actor?.id ?? null,
      actor_label: actor?.label ?? "Sistem",
      action: isDone ? "completed" : "moved",
      from_column_id: fromColumnId,
      to_column_id: toColumnId,
    });
  }

  revalidatePath("/gorevler");
  return {};
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deleteTask:", error);
    return { error: "Görev silinemedi." };
  }

  revalidatePath("/gorevler");
  return {};
}

// ---------------------------------------------------------------
// Listeler (kolonlar)
// ---------------------------------------------------------------

export async function createColumn(input: ColumnInput): Promise<ActionResult> {
  const parsed = columnSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { data: last } = await supabase
    .from("task_columns")
    .select("position")
    .eq("business_id", businessId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("task_columns").insert({
    business_id: businessId,
    label: parsed.data.label.trim(),
    color: parsed.data.color || "bg-primary",
    is_done: parsed.data.is_done ?? false,
    position: ((last as { position: number } | null)?.position ?? -1) + 1,
  });

  if (error) {
    console.error("createColumn:", error);
    return { error: "Liste eklenemedi." };
  }

  revalidatePath("/gorevler");
  return {};
}

export async function renameColumn(id: string, label: string): Promise<ActionResult> {
  const clean = label.trim();
  if (!clean) return { error: "Liste adı boş olamaz." };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("task_columns")
    .update({ label: clean })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("renameColumn:", error);
    return { error: "Liste adı güncellenemedi." };
  }

  revalidatePath("/gorevler");
  return {};
}

export async function deleteColumn(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("task_columns")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deleteColumn:", error);
    return { error: "Liste silinemedi." };
  }

  revalidatePath("/gorevler");
  return {};
}
