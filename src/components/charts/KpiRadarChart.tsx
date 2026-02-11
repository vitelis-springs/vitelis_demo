"use client";

import { Card, Typography } from "antd";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  BAR_PRIMARY_COLOR,
  CHART_AXIS_TICK_STYLE,
  CHART_AXIS_MUTED_TICK_STYLE,
  CHART_GRID_STROKE,
  CHART_LEGEND_STYLE,
  DARK_CARD_STYLE,
  getColorByIndex,
} from "../../config/chart-theme";
import { ChartLegend, ChartTooltip } from "./recharts-theme";

const { Title } = Typography;

export interface KpiRadarChartData {
  companies: string[];
  categories: string[];
  scores: number[][]; // scores[categoryIndex][companyIndex]
}

interface KpiRadarChartProps {
  data: KpiRadarChartData;
  title?: string;
}

export default function KpiRadarChart({
  data,
  title = "Performance Comparison",
}: KpiRadarChartProps) {
  const { companies, categories, scores } = data;

  // Transform data for recharts format
  // INVERTED: Each item represents a company with scores for all categories
  const chartData = companies.map((company, companyIndex) => {
    const item: Record<string, number | string> = {
      company: company,
    };

    categories.forEach((category, categoryIndex) => {
      item[category] = scores[categoryIndex]?.[companyIndex] || 0;
    });

    return item;
  });

  return (
    <Card
      style={{
        ...DARK_CARD_STYLE,
        borderRadius: "12px",
        marginBottom: "24px",
      }}
    >
      {title && (
        <Title
          level={3}
          style={{
            color: BAR_PRIMARY_COLOR,
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          {title}
        </Title>
      )}

      <ResponsiveContainer width="100%" height={850}>
        <RadarChart data={chartData} margin={{ left: 150, right: 50, top: 20, bottom: 20 }}>
          <PolarGrid stroke={CHART_GRID_STROKE} />
          <PolarAngleAxis
            dataKey="company"
            tick={{ ...CHART_AXIS_TICK_STYLE, fontSize: 14 }}
            tickLine={{ stroke: CHART_GRID_STROKE }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={CHART_AXIS_MUTED_TICK_STYLE}
            tickCount={6}
          />
          <ChartTooltip />

          {categories.map((category, index) => {
            const color = getColorByIndex(index);

            return (
              <Radar
                key={category}
                name={category}
                dataKey={category}
                stroke={color}
                fill="none"
                strokeWidth={2}
              />
            );
          })}

          <ChartLegend
            layout="vertical"
            align="left"
            verticalAlign="middle"
            wrapperStyle={{
              paddingLeft: "10px",
              fontSize: "18px",
              width: "280px",
            }}
            iconType="line"
            iconSize={20}
            formatter={(value) => (
              <span 
                style={{ 
                  color: CHART_LEGEND_STYLE.color,
                  fontSize: "14px",
                  display: "inline-block",
                  maxWidth: "240px",
                  whiteSpace: "normal",
                  lineHeight: "1.3"
                }}
              >
                {value}
              </span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
