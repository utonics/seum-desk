"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import type { FailTypeCount } from "@/lib/regress";

export function FailTypeChart({ data }: { data: FailTypeCount[] }) {
  if (data.length === 0) return <div className="text-sm text-neutral-500 py-6 text-center">실패가 없습니다.</div>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eee" />
          <XAxis dataKey="type" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ fill: "#f5f5f5" }} />
          <Bar dataKey="count" name="건수" fill="#b91c1c" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="count" position="top" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
