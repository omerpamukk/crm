import { Sparkles, Clock3, PackageX, Cake, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DAY = 86_400_000;

type OpportunityItem = { id: string; name: string; detail: string };

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Yıl farkını yok sayarak bir sonraki doğum gününe kalan gün sayısı. */
function daysUntilBirthday(birthday: string, today: Date): number | null {
  const [, m, d] = birthday.split("-").map(Number);
  if (!m || !d) return null;
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getTime() < todayMid.getTime()) {
    next = new Date(today.getFullYear() + 1, m - 1, d);
  }
  return Math.round((next.getTime() - todayMid.getTime()) / DAY);
}

export default async function FirsatlarPage() {
  const supabase = await createClient();
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const [inactiveRes, endingRes, birthdayRes, newLeadsRes, apptRes] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, last_visit_at")
        .not("last_visit_at", "is", null)
        .lte("last_visit_at", ninetyDaysAgo.toISOString())
        .order("last_visit_at", { ascending: true }),
      supabase
        .from("packages")
        .select("id, remaining_sessions, service_name, customer:customers(full_name)")
        .gt("remaining_sessions", 0)
        .lte("remaining_sessions", 2)
        .order("remaining_sessions", { ascending: true }),
      supabase
        .from("customers")
        .select("id, full_name, birthday")
        .not("birthday", "is", null),
      supabase
        .from("customers")
        .select("id, full_name, created_at")
        .eq("status", "new")
        .order("created_at", { ascending: false }),
      supabase.from("appointments").select("customer_id").not("customer_id", "is", null),
    ]);

  // 1) 90+ gündür gelmeyenler
  const inactiveItems: OpportunityItem[] = (inactiveRes.data ?? []).map((c) => {
    const days = Math.floor(
      (now.getTime() - new Date(c.last_visit_at as string).getTime()) / DAY
    );
    return { id: c.id, name: c.full_name, detail: `${days} gün önce` };
  });

  // 2) Paketi bitmek üzere
  const endingItems: OpportunityItem[] = (endingRes.data ?? []).map((p) => {
    const cust = pickOne(p.customer as { full_name: string } | { full_name: string }[] | null);
    return {
      id: p.id,
      name: cust?.full_name ?? "—",
      detail: `${p.remaining_sessions} seans kaldı${
        p.service_name ? ` · ${p.service_name}` : ""
      }`,
    };
  });

  // 3) Doğum günü yaklaşanlar (30 gün içinde)
  const birthdayItems: OpportunityItem[] = (birthdayRes.data ?? [])
    .map((c) => {
      const days = daysUntilBirthday(c.birthday as string, now);
      return days === null ? null : { id: c.id, name: c.full_name, days };
    })
    .filter((x): x is { id: string; name: string; days: number } => x !== null)
    .filter((x) => x.days <= 30)
    .sort((a, b) => a.days - b.days)
    .map((x) => ({
      id: x.id,
      name: x.name,
      detail: x.days === 0 ? "Bugün 🎉" : `${x.days} gün sonra`,
    }));

  // 4) Yeni lead'ler — henüz randevu almamış
  const customersWithAppt = new Set(
    (apptRes.data ?? []).map((a) => a.customer_id as string)
  );
  const newLeadItems: OpportunityItem[] = (newLeadsRes.data ?? [])
    .filter((c) => !customersWithAppt.has(c.id))
    .map((c) => ({ id: c.id, name: c.full_name, detail: "Randevu bekliyor" }));

  const categories = [
    {
      key: "inactive",
      title: "90+ Gündür Gelmeyenler",
      description: "Uzun süredir ziyaret etmeyen müşteriler — geri kazanım fırsatı.",
      icon: Clock3,
      border: "border-l-danger",
      iconClass: "bg-danger/10 text-danger",
      badge: "danger" as const,
      items: inactiveItems,
    },
    {
      key: "ending",
      title: "Paketi Bitmek Üzere",
      description: "Seansları azalan müşteriler — yenileme zamanı.",
      icon: PackageX,
      border: "border-l-warning",
      iconClass: "bg-warning/12 text-amber-600",
      badge: "warning" as const,
      items: endingItems,
    },
    {
      key: "birthday",
      title: "Doğum Günü Yaklaşanlar",
      description: "Önümüzdeki 30 gün içinde doğum günü olanlar — özel teklif fırsatı.",
      icon: Cake,
      border: "border-l-positive",
      iconClass: "bg-positive/10 text-positive",
      badge: "positive" as const,
      items: birthdayItems,
    },
    {
      key: "newLeads",
      title: "Yeni Lead'ler — Henüz Randevu Almamış",
      description: "Sisteme yeni eklenmiş, henüz randevusu olmayan potansiyeller.",
      icon: UserPlus,
      border: "border-l-primary",
      iconClass: "bg-primary/10 text-primary",
      badge: "info" as const,
      items: newLeadItems,
    },
  ];

  const visible = categories.filter((c) => c.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gelir Fırsatları"
        description="Mevcut verilerinden otomatik hesaplanan, aksiyon alınabilir müşteri grupları."
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Şu an öne çıkan bir fırsat yok"
          description="Müşteri, randevu ve paket verilerin arttıkça burada geri kazanım, doğum günü ve yenileme fırsatları otomatik olarak listelenecek."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.key} className={`border-l-4 ${cat.border}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-9 items-center justify-center rounded-lg ${cat.iconClass}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <CardTitle className="text-base">{cat.title}</CardTitle>
                        <CardDescription className="mt-0.5">
                          {cat.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={cat.badge}>{cat.items.length} kişi</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {cat.items.slice(0, 6).map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {cat.items.length > 6 && (
                    <p className="pt-2 text-xs text-muted-foreground">
                      +{cat.items.length - 6} kişi daha
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
