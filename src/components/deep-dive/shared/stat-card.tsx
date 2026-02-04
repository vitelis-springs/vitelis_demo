"use client";

import { Card, Typography } from "antd";
import Link from "next/link";
import { DARK_CARD_STYLE } from "../../../config/chart-theme";

const { Title, Text } = Typography;

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  href?: string;
}

export default function StatCard({ label, value, valueColor = "#fff", href }: StatCardProps) {
  const card = (
    <Card hoverable={!!href} style={DARK_CARD_STYLE}>
      <Text style={{ color: "#8c8c8c" }}>{href ? `${label} →` : label}</Text>
      <Title level={3} style={{ margin: 0, color: valueColor }}>
        {value}
      </Title>
    </Card>
  );

  if (href) {
    return <Link href={href} style={{ display: "block" }}>{card}</Link>;
  }

  return card;
}
