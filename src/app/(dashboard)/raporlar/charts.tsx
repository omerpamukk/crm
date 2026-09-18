"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Grafik renkleri tema tokenlarından gelir; böylece açık/koyu temada
 * ve palet değiştiğinde grafikler kendiliğinden uyumlu kalır.
 */
const C = {
  primary: "var(--primary)",
  positive: "var(--positive)",
  danger: "var(--danger)",
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
  cursor: "color-mix(in oklch, var(--muted-foreground) 12%, transparent)",
} as const;

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Tooltip'i kart yüzeyine oturtur (varsayılan beyaz kutu dark'ta kırılıyor). */
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "var(--shadow-soft-lg)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 2 },
  itemStyle: { color: "var(--popover-foreground)" },
} as const;

const AXIS = {
  tickLine: false,
  axisLine: false,
  fontSize: 12,
  stroke: C.axis,
} as const;

const tl = (v: number) => `₺${v.toLocaleString("tr-TR")}`;

/** Eksensiz mini trend grafiği (KPI kartları için). */
export function Sparkline({
  data,
  color = C.primary,
}: {
  data: { value: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill="url(#spark)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

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
            <stop offset="0%" stopColor={C.primary} stopOpacity={0.18} />
            <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis
          {...AXIS}
          width={56}
          tickFormatter={(v) => `₺${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip formatter={(v) => tl(Number(v))} {...TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={C.primary}
          strokeWidth={2}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({
  data,
}: {
  data: { label: string; ciro: number; musteri: number; hizmet: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ left: 4, right: 8, top: 12 }}>
        <defs>
          <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity={0.18} />
            <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis
          yAxisId="left"
          {...AXIS}
          width={52}
          tickFormatter={(v) => `₺${(Number(v) / 1000).toFixed(0)}k`}
        />
        <YAxis yAxisId="right" orientation="right" {...AXIS} width={40} />
        <Tooltip
          formatter={(v, name) =>
            name === "Ciro (₺)" ? [tl(Number(v)), name] : [Number(v), name]
          }
          {...TOOLTIP_STYLE}
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="ciro"
          name="Ciro (₺)"
          stroke={C.primary}
          strokeWidth={2}
          fill="url(#trend)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="musteri"
          name="Müşteri"
          stroke="var(--chart-3)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="hizmet"
          name="Hizmet"
          stroke="var(--chart-4)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </ComposedChart>
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
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis
          {...AXIS}
          width={56}
          tickFormatter={(v) => `₺${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(v, name) => [tl(Number(v)), name]}
          cursor={{ fill: C.cursor }}
          {...TOOLTIP_STYLE}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="gelir" name="Gelir" fill={C.positive} radius={[4, 4, 0, 0]} />
        <Bar dataKey="gider" name="Gider" fill={C.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SalesBarChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis
          {...AXIS}
          width={52}
          tickFormatter={(v) => `₺${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip formatter={(v) => tl(Number(v))} cursor={{ fill: C.cursor }} {...TOOLTIP_STYLE} />
        <Bar dataKey="value" name="Satış" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
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
        <YAxis type="category" dataKey="name" {...AXIS} width={110} />
        <Tooltip formatter={(v) => tl(Number(v))} cursor={{ fill: C.cursor }} {...TOOLTIP_STYLE} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={C.primary} maxBarSize={28} />
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
          innerRadius={58}
          outerRadius={88}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
