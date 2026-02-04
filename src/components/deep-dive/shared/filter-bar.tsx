"use client";

import { Card, Typography } from "antd";
import { DARK_CARD_STYLE } from "../../../config/chart-theme";

const { Text } = Typography;

interface FilterBarProps {
  showingLabel?: string;
  children: React.ReactNode;
}

export default function FilterBar({ showingLabel, children }: FilterBarProps) {
  return (
    <Card style={{ ...DARK_CARD_STYLE, marginBottom: 16 }}>
      {children}
      {showingLabel && (
        <div style={{ marginTop: 8 }}>
          <Text style={{ color: "#8c8c8c" }}>{showingLabel}</Text>
        </div>
      )}
    </Card>
  );
}
