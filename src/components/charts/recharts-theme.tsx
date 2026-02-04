"use client";

import type { CSSProperties, ComponentProps } from "react";
import { Legend, Tooltip } from "recharts";
import {
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_CURSOR_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  DARK_TOOLTIP_STYLE,
} from "../../config/chart-theme";

type RechartsTooltipProps = ComponentProps<typeof Tooltip>;
type RechartsLegendProps = ComponentProps<typeof Legend>;

type ChartTooltipProps = Omit<
  RechartsTooltipProps,
  "contentStyle" | "labelStyle" | "itemStyle" | "cursor"
> & {
  contentStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  itemStyle?: CSSProperties;
  cursor?: RechartsTooltipProps["cursor"];
};

export function ChartTooltip({
  contentStyle,
  labelStyle,
  itemStyle,
  cursor,
  ...rest
}: ChartTooltipProps) {
  return (
    <Tooltip
      contentStyle={{ ...DARK_TOOLTIP_STYLE, ...contentStyle }}
      labelStyle={{ ...CHART_TOOLTIP_LABEL_STYLE, ...labelStyle }}
      itemStyle={{ ...CHART_TOOLTIP_ITEM_STYLE, ...itemStyle }}
      cursor={cursor ?? CHART_TOOLTIP_CURSOR_STYLE}
      {...rest}
    />
  );
}

type ChartLegendProps = Omit<RechartsLegendProps, "wrapperStyle"> & {
  wrapperStyle?: CSSProperties;
};

export function ChartLegend({ wrapperStyle, ...rest }: ChartLegendProps) {
  return <Legend wrapperStyle={{ ...CHART_LEGEND_STYLE, ...wrapperStyle }} {...rest} />;
}
