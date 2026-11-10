"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { formatMoney } from "@/components/shared/money";

export type RevenuePoint = { label: string; value: number; partial: boolean };

/** Son 6 ay gelir sütunları. Renkler tema tokenlarından; yalnızca veri varken çizilir. */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[220px] w-full px-2 pt-4 pb-1 md:px-4" role="img" aria-label={`Son 6 ay gelir: ${data.map((d) => `${d.label} ${formatMoney(d.value)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--label-2)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--hover)" }}
            formatter={(v) => [formatMoney(Number(v)), "Gelir"]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--sep)",
              borderRadius: 12,
              fontSize: 13,
              color: "var(--label)",
            }}
            labelStyle={{ color: "var(--label-2)" }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((d) => (
              <Cell key={d.label} fill="var(--primary)" fillOpacity={d.partial ? 0.35 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
