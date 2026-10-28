"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BuildSummary } from "@/lib/timing";

const GROUP_COLORS = ["#1d4ed8", "#b91c1c", "#047857", "#b45309", "#6d28d9", "#0e7490"];

export function TrendChart({ trend, groups, mode }: { trend: BuildSummary[]; groups: string[]; mode: "violations" | "slack" }) {
  if (mode === "violations") {
    const data = trend.map((t) => {
      const row: Record<string, string | number> = { build: t.build };
      for (const g of groups) row[g] = t.by_group[g]?.violations ?? 0;
      return row;
    });
    return (
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eee" />
            <XAxis dataKey="build" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ fill: "#f5f5f5" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {groups.map((g, i) => (
              <Bar key={g} dataKey={g} stackId="v" fill={GROUP_COLORS[i % GROUP_COLORS.length]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const data = trend.map((t) => ({ build: t.build, WNS: t.wns, TNS: t.tns }));
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#eee" />
          <XAxis dataKey="build" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toFixed(2)} />
          <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(3) : String(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="WNS" stroke="#b91c1c" dot isAnimationActive={false} />
          <Line type="monotone" dataKey="TNS" stroke="#1d4ed8" dot isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
