import Link from "next/link";
import { Users, CalendarDays, Scissors, Package } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export default async function PanelPage() {
  const { fullName, email } = await getAccountContext();
  const supabase = await createClient();

  // RLS otomatik olarak kullanıcının işletmesine göre filtreler.
  const [customers, appointments, services, packages] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase.from("services").select("*", { count: "exact", head: true }),
    supabase.from("packages").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      label: "Müşteriler",
      value: customers.count ?? 0,
      icon: Users,
      href: "/musteriler",
    },
    {
      label: "Randevular",
      value: appointments.count ?? 0,
      icon: CalendarDays,
      href: "/randevular",
    },
    {
      label: "Hizmetler",
      value: services.count ?? 0,
      icon: Scissors,
      href: "/hizmetler",
    },
    {
      label: "Paketler",
      value: packages.count ?? 0,
      icon: Package,
      href: "/paketler",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Hoş geldin {fullName ?? email}
        </h1>
        <p className="text-sm text-muted-foreground">
          İşletmenin genel durumuna hızlı bir bakış.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
