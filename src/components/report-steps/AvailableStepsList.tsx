"use client";

import { Card, List, Button, Empty, Typography, Space, Tag, Segmented } from "antd";
import { PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
import type { GenerationStep, StepReportType } from "../../hooks/api/useReportStepsService";

const { Text } = Typography;

interface AvailableStepsListProps {
  steps: GenerationStep[];
  loading: boolean;
  onAdd: (stepId: number) => void;
  onOpenSettings: (step: GenerationStep) => void;
  addingStepId: number | null;
  reportType?: string | null;
}

export default function AvailableStepsList({
  steps,
  loading,
  onAdd,
  onOpenSettings,
  addingStepId,
  reportType,
}: AvailableStepsListProps) {
  const [filter, setFilter] = useState<StepReportType | "all">("all");

  useEffect(() => {
    if (reportType === "biz_miner" || reportType === "sales_miner") {
      setFilter(reportType);
    }
  }, [reportType]);

  const filtered = useMemo(() => {
    if (filter === "all") return steps;
    return steps.filter((s) => s.reportType === filter || s.reportType === null);
  }, [steps, filter]);

  return (
    <Card
      title="Available Steps"
      style={DARK_CARD_STYLE}
      styles={{
        header: DARK_CARD_HEADER_STYLE,
        body: { padding: 0 },
      }}
      extra={
        <Segmented
          size="small"
          value={filter}
          onChange={(v) => setFilter(v as StepReportType | "all")}
          options={[
            { label: "All", value: "all" },
            { label: "BizMiner", value: "biz_miner" },
            { label: "SalesMiner", value: "sales_miner" },
          ]}
        />
      }
    >
      <div style={{ height: 480, overflowY: "auto", padding: "8px 24px" }}>
      {filtered.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text style={{ color: "#8c8c8c" }}>
              All steps are already configured
            </Text>
          }
        />
      ) : (
        <List
          loading={loading}
          dataSource={filtered}
          renderItem={(step) => (
            <List.Item
              actions={[
                <Button
                  key="settings"
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => onOpenSettings(step)}
                />,
                <Button
                  key="add"
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  loading={addingStepId === step.id}
                  onClick={() => onAdd(step.id)}
                >
                  Add
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text style={{ color: "#d9d9d9" }}>{step.name}</Text>
                    {step.dependency && (
                      <Tag color="cyan" style={{ marginLeft: 8 }}>
                        {step.dependency}
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <Text
                    style={{ color: "#8c8c8c", fontSize: 12 }}
                    ellipsis
                  >
                    {step.url}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
      </div>
    </Card>
  );
}
