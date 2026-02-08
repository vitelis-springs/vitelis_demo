"use client";

import { Tag } from "antd";
import type { StepStatus } from "../../hooks/api/useReportStepsService";

const STATUS_CONFIG: Record<StepStatus, { color: string; label: string }> = {
  PENDING: { color: "default", label: "Pending" },
  PROCESSING: { color: "processing", label: "Processing" },
  DONE: { color: "success", label: "Done" },
  ERROR: { color: "error", label: "Error" },
};

interface StepStatusBadgeProps {
  status: StepStatus;
  compact?: boolean;
}

export default function StepStatusBadge({
  status,
  compact = false,
}: StepStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  if (compact) {
    const dotColors: Record<StepStatus, string> = {
      PENDING: "#8c8c8c",
      PROCESSING: "#1890ff",
      DONE: "#52c41a",
      ERROR: "#ff4d4f",
    };

    return (
      <span
        title={config.label}
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: dotColors[status] ?? dotColors.PENDING,
        }}
      />
    );
  }

  return <Tag color={config.color}>{config.label}</Tag>;
}
