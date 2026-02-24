"use client";

import { Empty } from "antd";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  LabelList,
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
  getColorByIndex,
} from "../../config/chart-theme";
import { ChartLegend, ChartTooltip } from "../charts/recharts-theme";

type KpiChartRowWithTotal = KpiChartItem & {
  totalByCategories: number;
};

function formatAxisTick(value: unknown): string {
  return String(value).split(" ")[0] ?? "";
}

function toNumericScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function KpiStackedChart({
  data,
  categories,
}: {
  data: KpiChartItem[];
  categories: string[];
}) {
  const sortedWithTotals = useMemo(() => {
    const withTotals = data.map((item) => ({
      ...item,
      totalByCategories: categories.reduce(
        (sum, cat) => sum + toNumericScore(item[cat]),
        0,
      ),
    }));

    return withTotals.sort((a, b) => b.totalByCategories - a.totalByCategories);
  }, [data, categories]);

  if (data.length === 0 || categories.length === 0) {
    return <Empty description="No KPI data for selected filters" />;
  }

  return (
    <div style={{ height: 620 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedWithTotals} margin={{ top: 40, right: 40, left: 0, bottom: 100 }} barGap={50} maxBarSize={100}>
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
          <ChartTooltip
            labelFormatter={(companyName, payload) => {
              const row = payload?.[0]?.payload as KpiChartRowWithTotal | undefined;
              if (!row) return String(companyName);
              return `${String(companyName)} (Total by categories: ${formatScore(row.totalByCategories)})`;
            }}
          />
          <ChartLegend />
          <BarStack radius={10}>
            {categories.map((category, index) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="kpi"
                fill={getColorByIndex(index)}
                name={category}
                textAnchor="middle"
                activeBar={CHART_ACTIVE_BAR_STYLE}
              >
                {index === categories.length - 1 && (
                  <LabelList
                    dataKey="totalByCategories"
                    position="top"
                    fill={CHART_AXIS_MUTED_TICK_STYLE.fill}
                    fontSize={11}
                    formatter={(value: unknown) =>
                      `Total: ${formatScore(toNumericScore(value))}`
                    }
                  />
                )}
              </Bar>
            ))}
          </BarStack>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
