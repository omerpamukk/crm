"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#5B5BD6",
  "#16A34A",
  "#F59E0B",
  "#E11D48",
  "#0EA5E9",
  "#8B5CF6",
  "#64748B",
];

const tl = (v: number) => `₺${v.toLocaleString("tr-TR")}`;

export function RevenueAreaChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B5BD6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#5B5BD6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={56}
          tickFormatter={(v) => `₺${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip formatter={(v) => tl(Number(v))} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#5B5BD6"
          strokeWidth={2}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueExpenseChart({
  data,
}: {
  data: { label: string; gelir: number; gider: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }} barGap={4}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={56}
          tickFormatter={(v) => `₺${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(v, name) => [tl(Number(v)), name]}
          cursor={{ fill: "#f1f5f9" }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="gelir" name="Gelir" fill="#16A34A" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gider" name="Gider" fill="#E11D48" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ServiceBarChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={110}
          fontSize={12}
        />
        <Tooltip formatter={(v) => tl(Number(v))} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#5B5BD6" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SourcePieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
