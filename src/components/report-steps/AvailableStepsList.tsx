"use client";

import { Card, List, Button, Empty, Typography, Space, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
import type { GenerationStep } from "../../hooks/api/useReportStepsService";

const { Text } = Typography;

interface AvailableStepsListProps {
  steps: GenerationStep[];
  loading: boolean;
  onAdd: (stepId: number) => void;
  addingStepId: number | null;
}

export default function AvailableStepsList({
  steps,
  loading,
  onAdd,
  addingStepId,
}: AvailableStepsListProps) {
  return (
    <Card
      title="Available Steps"
      style={DARK_CARD_STYLE}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
    >
      {steps.length === 0 ? (
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
          dataSource={steps}
          renderItem={(step) => (
            <List.Item
              actions={[
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
    </Card>
  );
}
