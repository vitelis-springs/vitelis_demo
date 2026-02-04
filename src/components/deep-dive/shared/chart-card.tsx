"use client";

import { Card, Empty } from "antd";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../../config/chart-theme";

interface ChartCardProps {
  title: string;
  height?: number;
  isEmpty?: boolean;
  emptyText?: string;
  children: React.ReactNode;
  headerFontSize?: number;
}

export default function ChartCard({
  title,
  height = 320,
  isEmpty,
  emptyText = "No data",
  children,
  headerFontSize,
}: ChartCardProps) {
  return (
    <Card
      title={title}
      style={DARK_CARD_STYLE}
      styles={{
        header: headerFontSize
          ? { ...DARK_CARD_HEADER_STYLE, fontSize: headerFontSize }
          : DARK_CARD_HEADER_STYLE,
      }}
    >
      {isEmpty ? (
        <Empty description={emptyText} />
      ) : (
        <div style={{ height }}>
          {children}
        </div>
      )}
    </Card>
  );
}
