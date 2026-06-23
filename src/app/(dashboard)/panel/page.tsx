import Link from "next/link";
import {
  Users,
  CalendarDays,
  Scissors,
  Package,
  TrendingUp,
  Clock,
  UserPlus,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { formatTime, formatDate, formatPrice } from "@/lib/format";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
  customerStatusLabel,
  customerStatusVariant,
} from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

type TodayAppointment = {
  id: string;
  starts_at: string;
  status: string | null;
  customer: { full_name: string } | null;
  service: { name: string } | null;
};

type RecentCustomer = {
  id: string;
  full_name: string;
  status: string | null;
  created_at: string;
};

export default async function PanelPage() {
  const { fullName, email } = await getAccountContext();
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const [
    customers,
    appointments,
    services,
    packages,
    newThisWeek,
    todayRes,
    recentRes,
    debtRes,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase.from("services").select("*", { count: "exact", head: true }),
    supabase.from("packages").select("*", { count: "exact", head: true }),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false)
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("appointments")
      .select(
        "id, starts_at, status, customer:customers(full_name), service:services(name)"
      )
      .gte("starts_at", startOfToday.toISOString())
      .lt("starts_at", endOfToday.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("customers")
      .select("id, full_name, status, created_at")
      .eq("is_lead", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("packages").select("price, paid_amount"),
  ]);

  const todayAppointments = (todayRes.data ??
    []) as unknown as TodayAppointment[];
  const recentCustomers = (recentRes.data ?? []) as RecentCustomer[];
  const newCount = newThisWeek.count ?? 0;

  // Toplam açık borç: tüm paketlerde pozitif (price - paid_amount) toplamı.
  const totalDebt = ((debtRes.data ?? []) as {
    price: number | null;
    paid_amount: number | null;
  }[]).reduce((sum, p) => {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    return debt > 0 ? sum + debt : sum;
  }, 0);

  const stats = [
    {
      label: "Müşteriler",
      value: customers.count ?? 0,
      icon: Users,
      href: "/musteriler",
      tone: "bg-primary/10 text-primary",
      trend: newCount > 0 ? `+${newCount} bu hafta` : null,
    },
    {
      label: "Randevular",
      value: appointments.count ?? 0,
      icon: CalendarDays,
      href: "/randevular",
      tone: "bg-positive/10 text-positive",
      trend: null,
    },
    {
      label: "Hizmetler",
      value: services.count ?? 0,
      icon: Scissors,
      href: "/hizmetler",
      tone: "bg-warning/12 text-amber-600",
      trend: null,
    },
    {
      label: "Paketler",
      value: packages.count ?? 0,
      icon: Package,
      href: "/paketler",
      tone: "bg-danger/10 text-danger",
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hoş geldin ${fullName ?? email}`}
        description="İşletmenin genel durumuna hızlı bir bakış."
      />

      {/* KPI kartları */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <span
                    className={`flex size-9 items-center justify-center rounded-lg ${stat.tone}`}
                  >
                    <Icon className="size-5" />
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  {stat.trend && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-positive">
                      <TrendingUp className="size-3" />
                      {stat.trend}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {totalDebt > 0 && (
        <Card className="border-l-4 border-l-danger">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Açık Borç
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <Wallet className="size-5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-danger">
              {formatPrice(totalDebt)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Paketlerden tahsil edilmemiş toplam tutar
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bugünün randevuları */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-primary" />
              Bugünün Randevuları
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Bugün için planlanmış randevu yok.
              </p>
            ) : (
              <ul className="divide-y">
                {todayAppointments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold">
                        {formatTime(a.starts_at)}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {a.customer?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.service?.name ?? "Hizmet belirtilmedi"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={appointmentStatusVariant(a.status)}>
                      {appointmentStatusLabel(a.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Son eklenen müşteriler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-primary" />
              Son Eklenen Müşteriler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Henüz müşteri eklenmedi.
              </p>
            ) : (
              <ul className="divide-y">
                {recentCustomers.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {c.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </p>
                    </div>
                    <Badge variant={customerStatusVariant(c.status)}>
                      {customerStatusLabel(c.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
