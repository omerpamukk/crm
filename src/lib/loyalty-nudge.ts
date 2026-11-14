import type { SupabaseClient } from "@supabase/supabase-js";

import { countVisits, loyaltyProgress, readLoyalty } from "@/lib/loyalty";
import { isModuleEnabled } from "@/lib/modules";
import { BUSINESS_TZ, zonedParts, zonedWallToUtcMs } from "@/lib/zaman";

/**
 * Sadakat kartı hatırlatması (0040): "2 ziyaret sonra hediyeniz var".
 * Günde bir, 10:00'dan sonra; yalnızca son 36 saatte gelmiş ve kampanya
 * izni olan müşterilere. Her kart döngüsünde (son hediyeden sonra) en
 * fazla bir kez.
 *
 * ⚠️ YALNIZCA SUNUCU TARAFI — service_role istemcisi bekler.
 */

const SEND_HOUR = 10;

export function nudgeText(firstName: string, remaining: number, reward: string | null, businessName: string): string {
  const gift = reward?.trim() || "hediyeniz";
  return `Merhaba ${firstName}, ${remaining} ziyaret sonra ${gift} sizin! Görüşmek üzere. ${businessName}`.trim();
}

export async function planLoyaltyNudges(admin: SupabaseClient, now = new Date()): Promise<number> {
  const p = zonedParts(now.getTime(), BUSINESS_TZ);
  const sendAt = new Date(zonedWallToUtcMs(p.y, p.m, p.d, SEND_HOUR, 0, BUSINESS_TZ));
  if (now < sendAt) return 0;

  const { data: bizList, error } = await admin
    .from("businesses")
    .select("id, name, enabled_modules, loyalty_target, loyalty_reward, loyalty_notify_before")
    .not("loyalty_target", "is", null)
    .not("loyalty_notify_before", "is", null);
  if (error) return 0; // 0040 çalışmadıysa sessizce geç

  let planned = 0;
  for (const b of (bizList ?? []) as {
    id: string;
    name: string;
    enabled_modules: string[] | null;
    loyalty_target: number | null;
    loyalty_reward: string | null;
    loyalty_notify_before: number | null;
  }[]) {
    if (!isModuleEnabled(b.enabled_modules, "sadakat")) continue;
    const settings = readLoyalty(b);
    if (!settings?.notifyBefore) continue;

    const since = new Date(now.getTime() - 36 * 3_600_000).toISOString();
    const { data: recent } = await admin
      .from("appointments")
      .select("customer_id, status")
      .eq("business_id", b.id)
      .gte("starts_at", since)
      .lte("starts_at", now.toISOString())
      .not("customer_id", "is", null);
    const ids = [
      ...new Set(
        ((recent ?? []) as { customer_id: string; status: string | null }[])
          .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
          .map((r) => r.customer_id)
      ),
    ];
    if (ids.length === 0) continue;

    const [custRes, apptRes, redRes, sentRes] = await Promise.all([
      admin.from("customers").select("id, full_name, marketing_sms_at").eq("business_id", b.id).in("id", ids),
      admin.from("appointments").select("customer_id, starts_at, status").eq("business_id", b.id).in("customer_id", ids).limit(20000),
      admin.from("loyalty_redemptions").select("customer_id, created_at").eq("business_id", b.id).in("customer_id", ids),
      admin.from("reminders").select("customer_id, created_at").eq("business_id", b.id).eq("related_type", "loyalty").in("customer_id", ids),
    ]);
    if (custRes.error || apptRes.error || redRes.error || sentRes.error) continue;

    const lastRedeem = new Map<string, string>();
    for (const r of (redRes.data ?? []) as { customer_id: string; created_at: string }[]) {
      if (!lastRedeem.has(r.customer_id) || r.created_at > lastRedeem.get(r.customer_id)!) lastRedeem.set(r.customer_id, r.created_at);
    }
    const visitsOf = new Map<string, { starts_at: string; status: string | null }[]>();
    for (const a of (apptRes.data ?? []) as { customer_id: string; starts_at: string; status: string | null }[]) {
      visitsOf.set(a.customer_id, [...(visitsOf.get(a.customer_id) ?? []), a]);
    }
    const sent = (sentRes.data ?? []) as { customer_id: string; created_at: string }[];

    const rows = [];
    for (const c of (custRes.data ?? []) as { id: string; full_name: string; marketing_sms_at: string | null }[]) {
      if (!c.marketing_sms_at) continue;
      const since = lastRedeem.get(c.id) ?? null;
      const prog = loyaltyProgress(countVisits(visitsOf.get(c.id) ?? [], since, now), settings.target);
      if (prog.remaining !== settings.notifyBefore) continue;
      if (sent.some((s) => s.customer_id === c.id && (!since || s.created_at > since))) continue;
      rows.push({
        business_id: b.id,
        customer_id: c.id,
        kind: "custom",
        channel: "sms",
        related_type: "loyalty",
        related_id: c.id,
        scheduled_at: sendAt.toISOString(),
        body: nudgeText(c.full_name.trim().split(/\s+/)[0] ?? "", prog.remaining, settings.reward, b.name),
      });
    }
    if (rows.length === 0) continue;
    const { error: insErr } = await admin.from("reminders").insert(rows);
    if (insErr) console.error("planLoyaltyNudges:", insErr);
    else planned += rows.length;
  }
  return planned;
}
