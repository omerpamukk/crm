import { Receipt, Banknote, TrendingUp, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate } from "@/lib/format";
import {
  expenseCategoryLabel,
  expenseCategoryVariant,
  paymentMethodLabel,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { NewExpenseButton } from "./new-expense-button";
import { ExpenseRowActions } from "./expense-row-actions";

export default async function GiderlerPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfMonthDate = `${startOfMonth.getFullYear()}-${String(
    startOfMonth.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const [expensesRes, monthExpensesRes, monthIncomeRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .order("spent_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("amount")
      .gte("spent_at", startOfMonthDate),
    supabase
      .from("payments")
      .select("amount")
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  const expenses = (expensesRes.data ?? []) as Expense[];

  const monthExpense = ((monthExpensesRes.data ?? []) as {
    amount: number | null;
  }[]).reduce((s, e) => s + (e.amount ?? 0), 0);
  const monthIncome = ((monthIncomeRes.data ?? []) as {
    amount: number | null;
  }[]).reduce((s, p) => s + (p.amount ?? 0), 0);
  const netProfit = monthIncome - monthExpense;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giderler"
        description="İşletme giderlerini kaydet; bu ayki net kârını anlık gör."
      >
        <NewExpenseButton />
      </PageHeader>

      {/* Net kâr kartları (bu ay) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-positive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay Gelir
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-lg bg-positive/10 text-positive">
              <Banknote className="size-5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-positive">
              {formatPrice(monthIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-danger">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay Gider
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <Receipt className="size-5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">
              {formatPrice(monthExpense)}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-l-4",
            netProfit >= 0 ? "border-l-positive" : "border-l-danger"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay Net Kâr
            </CardTitle>
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                netProfit >= 0
                  ? "bg-positive/10 text-positive"
                  : "bg-danger/10 text-danger"
              )}
            >
              {netProfit >= 0 ? (
                <TrendingUp className="size-5" />
              ) : (
                <Wallet className="size-5" />
              )}
            </span>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                netProfit >= 0 ? "text-positive" : "text-danger"
              )}
            >
              {formatPrice(netProfit)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Gelir − gider (bu ay)
            </p>
          </CardContent>
        </Card>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Henüz gider yok"
          description="Kira, maaş, malzeme gibi giderlerini ekle; net kârın otomatik hesaplansın."
          action={<NewExpenseButton />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Ödeme</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(e.spent_at)}
                  </TableCell>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>
                    <Badge variant={expenseCategoryVariant(e.category)}>
                      {expenseCategoryLabel(e.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {paymentMethodLabel(e.method)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-danger">
                    {formatPrice(e.amount)}
                  </TableCell>
                  <TableCell>
                    <ExpenseRowActions expense={e} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
