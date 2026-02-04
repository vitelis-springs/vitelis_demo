"use client";

import { Empty } from "antd";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { KpiChartItem } from "../../hooks/api/useDeepDiveService";
import {
  CHART_ACTIVE_BAR_STYLE,
  CHART_AXIS_LABEL_STYLE,
  CHART_AXIS_MUTED_TICK_STYLE,
  CHART_GRID_STROKE,
  getSeriesColor,
} from "../../config/chart-theme";
import { ChartLegend, ChartTooltip } from "../charts/recharts-theme";

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
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis
            dataKey="company"
            tickFormatter={formatAxisTick}
            stroke={CHART_AXIS_MUTED_TICK_STYLE.fill}
            tick={{ ...CHART_AXIS_MUTED_TICK_STYLE, fontSize: 14 }}
            interval={0}
            angle={-45}
            textAnchor="start"
            dy={20}
            height={100}
            label={{ value: "Companies", position: "insideBottom", dy: 80, style: CHART_AXIS_LABEL_STYLE }}
          />
          <YAxis
            stroke={CHART_AXIS_MUTED_TICK_STYLE.fill}
            tick={CHART_AXIS_MUTED_TICK_STYLE}
            label={{ value: "Score", angle: -90, position: "insideLeft", style: CHART_AXIS_LABEL_STYLE }}
          />
          <ChartTooltip />
          <ChartLegend />
          <BarStack radius={10}>
            {categories.map((category, index) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="kpi"
                fill={getSeriesColor(category, index)}
                name={category}
                textAnchor="middle"
                activeBar={CHART_ACTIVE_BAR_STYLE}
              />
            ))}
          </BarStack>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
