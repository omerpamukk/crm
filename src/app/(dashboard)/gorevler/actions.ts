"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { fromDateTimeLocal } from "@/lib/zaman";
import {
  taskSchema,
  columnSchema,
  type TaskInput,
  type ColumnInput,
} from "./schema";

type ActionResult = { error?: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;
type Gate = { businessId: string; userId: string };

/**
 * Görevler ekibin ortak işidir: personel (uzman) dahil her rol görev ekler,
 * taşır, düzenler. Yetki sistemi buna ayrı bir yetenek tanımlamıyor; bu yüzden
 * önce `authorize` (yönetici/resepsiyon) denenir, uzman ise yalnızca kendi
 * firmasının üyesi olduğu doğrulanarak geçer. Liste yönetimi `manage` ister.
 */
async function gate(
  supabase: Supabase,
  opts: { manage?: boolean } = {}
): Promise<{ error: string } | Gate> {
  const auth = await authorize(supabase, "musteri_yonet");
  if (!("error" in auth)) return { businessId: auth.businessId, userId: auth.userId };
  if (opts.manage) return auth;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return auth;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as { role: string | null; business_id: string | null } | null;
  if (p?.role === "specialist" && p.business_id) {
    return { businessId: p.business_id, userId: user.id };
  }
  return auth;
}

/** Oturum sahibinin adı — aktivite kaydında "kim yaptı" için. */
async function actorLabel(supabase: Supabase, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return (data as { full_name: string | null } | null)?.full_name || "Kullanıcı";
}

/** "2026-09-19T17:00" (İstanbul saati) → ofsetli ISO. Boş → null; geçersiz → undefined. */
function toTimestamp(value?: string): string | null | undefined {
  if (!value) return null;
  return fromDateTimeLocal(value) ?? undefined;
}

/** Bağlanan liste, personel ve müşteri gerçekten bu firmaya mı ait? */
async function refsBelong(
  supabase: Supabase,
  businessId: string,
  v: { column_id: string; assignee_id?: string; customer_id?: string }
): Promise<boolean> {
  const checks = [
    supabase.from("task_columns").select("id").eq("id", v.column_id).eq("business_id", businessId).maybeSingle(),
    v.assignee_id
      ? supabase.from("staff").select("id").eq("id", v.assignee_id).eq("business_id", businessId).maybeSingle()
      : null,
    v.customer_id
      ? supabase.from("customers").select("id").eq("id", v.customer_id).eq("business_id", businessId).maybeSingle()
      : null,
  ];
  const results = await Promise.all(checks);
  return results.every((r) => r === null || Boolean(r.data));
}

async function isDoneColumn(supabase: Supabase, businessId: string, columnId: string) {
  const { data } = await supabase
    .from("task_columns")
    .select("is_done")
    .eq("id", columnId)
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as { is_done: boolean } | null)?.is_done ?? false;
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const supabase = await createClient();
  const g = await gate(supabase);
  if ("error" in g) return { error: g.error };
  const { businessId, userId } = g;

  const v = parsed.data;
  const dueAt = toTimestamp(v.due_at);
  if (dueAt === undefined) return { error: "Geçerli bir tarih ve saat girin." };
  if (!(await refsBelong(supabase, businessId, v))) return { error: "Seçilen kayıt bulunamadı." };

  const label = await actorLabel(supabase, userId);
  const isDone = await isDoneColumn(supabase, businessId, v.column_id);

  // Yeni kart listenin sonuna eklenir.
  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("column_id", v.column_id)
    .eq("business_id", businessId)
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
      title: v.title.trim(),
      description: v.description?.trim() || null,
      assignee_id: v.assignee_id || null,
      assignee_is_team: !v.assignee_id,
      due_at: dueAt,
      priority: v.priority,
      customer_id: v.customer_id || null,
      completed_at: isDone ? new Date().toISOString() : null,
      created_by: userId,
      created_by_label: label,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createTask:", error);
    return { error: "Görev eklenemedi. Biraz sonra tekrar deneyin." };
  }

  await supabase.from("task_activity").insert({
    business_id: businessId,
    task_id: (created as { id: string }).id,
    actor_id: userId,
    actor_label: label,
    action: "created",
    to_column_id: v.column_id,
  });

  revalidatePath("/gorevler");
  return {};
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const supabase = await createClient();
  const g = await gate(supabase);
  if ("error" in g) return { error: g.error };
  const { businessId, userId } = g;

  const v = parsed.data;
  const dueAt = toTimestamp(v.due_at);
  if (dueAt === undefined) return { error: "Geçerli bir tarih ve saat girin." };
  if (!(await refsBelong(supabase, businessId, v))) return { error: "Seçilen kayıt bulunamadı." };

  const { data: current } = await supabase
    .from("tasks")
    .select("column_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!current) return { error: "Görev bulunamadı. Sayfayı yenileyin." };
  const fromColumnId = (current as { column_id: string }).column_id;
  const moved = fromColumnId !== v.column_id;
  const isDone = moved ? await isDoneColumn(supabase, businessId, v.column_id) : false;

  let position: number | undefined;
  if (moved) {
    const { data: last } = await supabase
      .from("tasks")
      .select("position")
      .eq("column_id", v.column_id)
      .eq("business_id", businessId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = ((last as { position: number } | null)?.position ?? -1) + 1;
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: v.title.trim(),
      description: v.description?.trim() || null,
      assignee_id: v.assignee_id || null,
      assignee_is_team: !v.assignee_id,
      due_at: dueAt,
      priority: v.priority,
      customer_id: v.customer_id || null,
      ...(moved ? { column_id: v.column_id, position, completed_at: isDone ? new Date().toISOString() : null } : {}),
    })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updateTask:", error);
    return { error: "Görev kaydedilemedi. Biraz sonra tekrar deneyin." };
  }

  const label = await actorLabel(supabase, userId);
  await supabase.from("task_activity").insert({
    business_id: businessId,
    task_id: id,
    actor_id: userId,
    actor_label: label,
    action: moved ? (isDone ? "completed" : "moved") : "updated",
    ...(moved ? { from_column_id: fromColumnId, to_column_id: v.column_id } : {}),
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
  const g = await gate(supabase);
  if ("error" in g) return { error: g.error };
  const { businessId, userId } = g;

  const { data: current } = await supabase
    .from("tasks")
    .select("column_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!current) return { error: "Görev bulunamadı. Sayfayı yenileyin." };
  const fromColumnId = (current as { column_id: string }).column_id;

  const { data: col } = await supabase
    .from("task_columns")
    .select("is_done")
    .eq("id", toColumnId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!col) return { error: "Liste bulunamadı. Sayfayı yenileyin." };
  const isDone = (col as { is_done: boolean }).is_done;

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
    return { error: "Görev taşınamadı. Biraz sonra tekrar deneyin." };
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
      actor_id: userId,
      actor_label: await actorLabel(supabase, userId),
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
  const g = await gate(supabase);
  if ("error" in g) return { error: g.error };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("business_id", g.businessId);

  if (error) {
    console.error("deleteTask:", error);
    return { error: "Görev silinemedi. Biraz sonra tekrar deneyin." };
  }

  revalidatePath("/gorevler");
  return {};
}

// ---------------------------------------------------------------
// Listeler (kolonlar) — yalnızca yönetici ve resepsiyon
// ---------------------------------------------------------------

export async function createColumn(input: ColumnInput): Promise<ActionResult> {
  const parsed = columnSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const supabase = await createClient();
  const g = await gate(supabase, { manage: true });
  if ("error" in g) return { error: g.error };
  const { businessId } = g;

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
    return { error: "Liste eklenemedi. Biraz sonra tekrar deneyin." };
  }

  revalidatePath("/gorevler");
  return {};
}

export async function renameColumn(id: string, label: string): Promise<ActionResult> {
  const clean = label.trim();
  if (!clean) return { error: "Liste adı boş olamaz." };

  const supabase = await createClient();
  const g = await gate(supabase, { manage: true });
  if ("error" in g) return { error: g.error };

  const { error } = await supabase
    .from("task_columns")
    .update({ label: clean })
    .eq("id", id)
    .eq("business_id", g.businessId);

  if (error) {
    console.error("renameColumn:", error);
    return { error: "Liste adı değiştirilemedi. Biraz sonra tekrar deneyin." };
  }

  revalidatePath("/gorevler");
  return {};
}

/** Listeyi siler; içindeki görevler de silinir (arayüz önce onay ister). */
export async function deleteColumn(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const g = await gate(supabase, { manage: true });
  if ("error" in g) return { error: g.error };

  const { count } = await supabase
    .from("task_columns")
    .select("id", { count: "exact", head: true })
    .eq("business_id", g.businessId);
  if ((count ?? 0) <= 1) return { error: "En az bir liste kalmalı." };

  const { error } = await supabase
    .from("task_columns")
    .delete()
    .eq("id", id)
    .eq("business_id", g.businessId);

  if (error) {
    console.error("deleteColumn:", error);
    return { error: "Liste silinemedi. Biraz sonra tekrar deneyin." };
  }

  revalidatePath("/gorevler");
  return {};
}
