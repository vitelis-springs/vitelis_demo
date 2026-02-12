"use client";

import { Card, List, Button, Empty, Typography, Space, Tag, InputNumber } from "antd";
import { DeleteOutlined, SettingOutlined } from "@ant-design/icons";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
import type { ConfiguredStep } from "../../hooks/api/useReportStepsService";

const { Text } = Typography;

interface ConfiguredStepsListProps {
  steps: ConfiguredStep[];
  loading: boolean;
  onRemove: (stepId: number) => void;
  onUpdateOrder: (stepId: number, order: number) => void;
  onOpenSettings: (step: ConfiguredStep) => void;
  removingStepId: number | null;
  updatingOrder: boolean;
}

export default function ConfiguredStepsList({
  steps,
  loading,
  onRemove,
  onUpdateOrder,
  onOpenSettings,
  removingStepId,
  updatingOrder,
}: ConfiguredStepsListProps) {
  return (
    <Card
      title={`Configured Steps (${steps.length})`}
      style={DARK_CARD_STYLE}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
    >
      {steps.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text style={{ color: "#8c8c8c" }}>
              No steps configured. Add steps from the available list.
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
                  key="settings"
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => onOpenSettings(step)}
                />,
                <Button
                  key="delete"
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={removingStepId === step.id}
                  onClick={() => onRemove(step.id)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <InputNumber
                    size="small"
                    min={1}
                    value={step.order}
                    disabled={updatingOrder}
                    onChange={(val) => {
                      if (val !== null && val >= 1 && val !== step.order) {
                        onUpdateOrder(step.id, val);
                      }
                    }}
                    style={{
                      width: 52,
                      backgroundColor: "#1f1f1f",
                    }}
                  />
                }
                title={
                  <Space>
                    <Text style={{ color: "#d9d9d9" }}>{step.name}</Text>
                    {step.dependency && (
                      <Tag color="cyan">{step.dependency}</Tag>
                    )}
                    {step.settings && Object.keys(step.settings as object).length > 0 && (
                      <Tag color="blue">
                        {Object.keys(step.settings as object).length} settings
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <Text style={{ color: "#8c8c8c", fontSize: 12 }} ellipsis>
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
