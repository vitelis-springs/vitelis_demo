"use client";

import { Card, Typography } from "antd";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

const { Title } = Typography;

// Base colors for categories - first 5 from the example
const BASE_COLORS = [
  "#F4B942", // Yellow/Gold
  "#1E3A5F", // Dark Blue
  "#2E5C8A", // Medium Blue
  "#4A8BC2", // Light Blue
  "#5FAFDB", // Cyan
];

// Convert hex to RGB for color distance calculation
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Calculate color distance (Euclidean distance in RGB space)
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

// Generate random color that differs from existing colors
function generateDistinctColor(existingColors: string[]): string {
  const MIN_DISTANCE = 100; // Minimum color distance
  const MAX_ATTEMPTS = 50;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Generate random RGB values
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    
    // Avoid too dark or too light colors
    const brightness = (r + g + b) / 3;
    if (brightness < 60 || brightness > 220) continue;
    
    const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    // Check if color is distinct enough from all existing colors
    const isDistinct = existingColors.every(
      (existingColor) => colorDistance(newColor, existingColor) >= MIN_DISTANCE
    );
    
    if (isDistinct) {
      return newColor;
    }
  }
  
  // Fallback: return a random color even if not perfectly distinct
  const r = Math.floor(Math.random() * 200) + 50;
  const g = Math.floor(Math.random() * 200) + 50;
  const b = Math.floor(Math.random() * 200) + 50;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Cache for generated colors
const generatedColors: string[] = [];

// Generate color for any index
function getCategoryColor(index: number): string {
  if (index < BASE_COLORS.length) {
    const color = BASE_COLORS[index];
    return color !== undefined ? color : "#F4B942"; // Fallback to first color
  }
  
  // For 6+ categories, generate random distinct colors
  const generatedIndex = index - BASE_COLORS.length;
  
  // Check if we already generated this color
  if (generatedColors[generatedIndex]) {
    return generatedColors[generatedIndex];
  }
  
  // Generate new distinct color
  const usedColors = [...BASE_COLORS, ...generatedColors];
  const newColor = generateDistinctColor(usedColors);
  generatedColors[generatedIndex] = newColor;
  
  return newColor;
}

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
    const item: Record<string, any> = {
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
        background: "#1f1f1f",
        border: "1px solid #303030",
        borderRadius: "12px",
        marginBottom: "24px",
      }}
    >
      {title && (
        <Title
          level={3}
          style={{
            color: "#58bfce",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          {title}
        </Title>
      )}

      <ResponsiveContainer width="100%" height={850}>
        <RadarChart data={chartData} margin={{ left: 150, right: 50, top: 20, bottom: 20 }}>
          <PolarGrid stroke="#404040" />
          <PolarAngleAxis
            dataKey="company"
            tick={{ fill: "#ffffff", fontSize: 14 }}
            tickLine={{ stroke: "#404040" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: "#999999" }}
            tickCount={6}
          />

          {categories.map((category, index) => {
            const color = getCategoryColor(index);

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

          <Legend
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
                  color: "#ffffff", 
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

