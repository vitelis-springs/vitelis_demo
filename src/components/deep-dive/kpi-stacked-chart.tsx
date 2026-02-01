"use client";

import { Empty } from "antd";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiChartItem } from "../../hooks/api/useDeepDiveService";

const CHART_PALETTE = [
  "#58bfce", "#7c4dff", "#ff9800", "#4caf50", "#f44336",
  "#e91e63", "#00bcd4", "#ffeb3b", "#9c27b0", "#8bc34a",
];

function getColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]!;
}

function formatAxisTick(value: unknown): string {
  return String(value).split(" ")[0] ?? "";
}

export default function KpiStackedChart({
  data,
  categories,
}: {
  data: KpiChartItem[];
  categories: string[];
}) {
  if (data.length === 0 || categories.length === 0) {
    return <Empty description="No KPI data for selected filters" />;
  }

  return (
    <div style={{ height: 620 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 30, right: 40, left: 0, bottom: 100 }} barGap={50} maxBarSize={100}>
          <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
          <XAxis
            dataKey="company"
            tickFormatter={formatAxisTick}
            stroke="#a7a3a3"
            tick={{ fill: "#a7a3a3", fontSize: 14 }}
            interval={0}
            angle={-45}
            textAnchor="start"
            dy={20}
            height={100}
            label={{ value: "Companies", position: "insideBottom", dy: 80, style: { fill: "#8c8c8c" } }}
          />
          <YAxis
            stroke="#8c8c8c"
            tick={{ fill: "#8c8c8c" }}
            label={{ value: "Score", angle: -90, position: "insideLeft", style: { fill: "#8c8c8c" } }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#1f1f1f", border: "1px solid #303030", borderRadius: 6 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ color: "#d9d9d9" }} />
          <BarStack radius={10}>
            {categories.map((category, index) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="kpi"
                fill={getColor(index)}
                name={category}
                textAnchor="middle"
              />
            ))}
          </BarStack>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
