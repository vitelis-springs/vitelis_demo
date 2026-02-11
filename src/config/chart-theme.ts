export const CHART_PALETTE = [
  "#58bfce", // teal (brand)
  "#f759ab", // magenta-pink
  "#95de64", // lime-green
  "#faad14", // amber
  "#597ef7", // indigo
  "#ff7a45", // orange
  "#9254de", // purple
  "#36cfc9", // mint
  "#ff4d4f", // red
  "#73d13d", // green
  "#40a9ff", // sky-blue
  "#f5a623", // tangerine
  "#c41d7f", // raspberry
  "#bae637", // chartreuse
  "#006d75", // deep-teal
  "#eb2f96", // hot-pink
  "#d4b106", // olive-gold
  "#1d39c4", // royal-blue
  "#cf1322", // crimson
  "#389e0d", // forest-green
] as const;

export const PIE_COLORS = [...CHART_PALETTE];

export const QUALITY_COLORS: Record<string, string> = {
  HIGH: "#52c41a",
  MEDIUM: "#faad14",
  LOW: "#ff4d4f",
};

export const TIER_COLORS = ["#8c8c8c", "#58bfce", "#36cfc9", "#13c2c2"];

export const BAR_PRIMARY_COLOR = "var(--chart-primary)";
export const CHART_GRID_STROKE = "var(--chart-grid)";

export const CHART_AXIS_TICK_STYLE = {
  fill: "var(--chart-axis-tick)",
  fontSize: 12,
} as const;

export const CHART_AXIS_MUTED_TICK_STYLE = {
  fill: "var(--chart-axis-muted)",
  fontSize: 11,
} as const;

export const CHART_AXIS_HIGHLIGHT_TICK_STYLE = {
  fill: "var(--chart-axis-highlight)",
  fontSize: 11,
} as const;

export const CHART_AXIS_LABEL_STYLE = {
  fill: "var(--chart-axis-muted)",
} as const;

export const CHART_LEGEND_STYLE = {
  color: "var(--chart-legend)",
  fontSize: 12,
} as const;

export const DARK_TOOLTIP_STYLE = {
  background: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-border)",
  borderRadius: 6,
} as const;

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: "var(--chart-text)",
  fontWeight: 600,
} as const;

export const CHART_TOOLTIP_ITEM_STYLE = {
  color: "var(--chart-text)",
} as const;

export const CHART_TOOLTIP_CURSOR_STYLE = {
  fill: "var(--chart-hover-overlay)",
} as const;

export const CHART_ACTIVE_BAR_STYLE = {
  fillOpacity: 0.88,
  stroke: "var(--chart-text)",
  strokeWidth: 1,
} as const;

export const DARK_CARD_STYLE = {
  background: "var(--chart-card-bg)",
  border: "1px solid var(--chart-border)",
} as const;

export const DARK_CARD_HEADER_STYLE = {
  borderBottom: "1px solid var(--chart-border)",
} as const;

function getHashIndex(key: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % size;
  }
  return hash;
}

export function getColorByIndex(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]!;
}

export function getSeriesColor(value: string | number, fallbackIndex = 0): string {
  const paletteSize = CHART_PALETTE.length;
  if (typeof value === "number" && Number.isFinite(value)) {
    const index = Math.abs(Math.trunc(value)) % paletteSize;
    return CHART_PALETTE[index]!;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return CHART_PALETTE[Math.abs(fallbackIndex) % paletteSize]!;
  }

  return CHART_PALETTE[getHashIndex(normalized, paletteSize)]!;
}
