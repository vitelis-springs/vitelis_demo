"use client";

import {
  App,
  Card,
  Space,
  Typography,
  Spin,
  Select,
  Descriptions,
  Button,
  Divider,
  Empty,
  Tag,
} from "antd";
import {
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
import {
  useGetOrchestratorStatus,
  useUpdateOrchestrator,
  useTriggerEngineTick,
  type StepStatus,
} from "../../hooks/api/useReportStepsService";
import OrchestratorSettingsModal from "./OrchestratorSettingsModal";

const { Text } = Typography;

const STATUS_ICONS: Record<StepStatus, React.ReactNode> = {
  PENDING: <ClockCircleOutlined style={{ color: "#8c8c8c" }} />,
  PROCESSING: <LoadingOutlined spin style={{ color: "#1890ff" }} />,
  DONE: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
  ERROR: <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />,
};

const STATUS_OPTIONS: Array<{ value: StepStatus; label: string }> = [
  { value: "PROCESSING", label: "Active" },
  { value: "PENDING", label: "Paused" },
  { value: "DONE", label: "Done" },
  { value: "ERROR", label: "Error" },
];

const ENGINE_INSTANCES = [
  { value: 1, label: "Instance 1" },
  { value: 2, label: "Instance 2" },
];

interface OrchestratorControlProps {
  reportId: number;
}

export default function OrchestratorControl({
  reportId,
}: OrchestratorControlProps) {
  const { message } = App.useApp();
  const { data, isLoading } = useGetOrchestratorStatus(reportId, {
    refetchInterval: 60000,
  });
  const updateOrch = useUpdateOrchestrator(reportId);
  const triggerEngine = useTriggerEngineTick(reportId);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const status = data?.data?.status ?? "PENDING";
  const isProcessing = status === "PROCESSING";
  const metadata = data?.data?.metadata as Record<string, unknown> | null;

  const handleStatusChange = (newStatus: StepStatus) => {
    updateOrch.mutate({ status: newStatus });
  };

  const handleTriggerEngine = (instance: number) => {
    triggerEngine.mutate(instance, {
      onSuccess: () => {
        message.success(`Engine tick sent (instance ${instance})`);
      },
      onError: () => {
        message.error("Failed to trigger engine tick");
      },
    });
  };

  if (isLoading) {
    return (
      <Card style={DARK_CARD_STYLE} styles={{ header: DARK_CARD_HEADER_STYLE }}>
        <div style={{ textAlign: "center", padding: 20 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  const settingsMeta = metadata
    ? Object.entries(metadata)
    : [];

  return (
    <>
      <Card
        title="Orchestrator"
        style={DARK_CARD_STYLE}
        styles={{ header: DARK_CARD_HEADER_STYLE }}
      >
        {/* ── Controls ── */}
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          styles={{
            label: { color: "#8c8c8c" },
            content: { color: "#d9d9d9" },
          }}
        >
          <Descriptions.Item label="Status">
            <Space>
              {STATUS_ICONS[status]}
              <Select
                size="small"
                value={status}
                onChange={handleStatusChange}
                loading={
                  updateOrch.isPending &&
                  updateOrch.variables?.status !== undefined
                }
                style={{ width: 120 }}
                options={STATUS_OPTIONS}
              />
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Trigger Engine">
            <Space size={4}>
              {ENGINE_INSTANCES.map((inst) => (
                <Button
                  key={inst.value}
                  size="small"
                  icon={<ThunderboltOutlined />}
                  disabled={!isProcessing}
                  loading={triggerEngine.isPending && triggerEngine.variables === inst.value}
                  onClick={() => handleTriggerEngine(inst.value)}
                >
                  {inst.label}
                </Button>
              ))}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        {/* ── Settings ── */}
        <Divider
          orientation="left"
          orientationMargin={0}
          style={{ borderColor: "#303030", margin: "16px 0 12px" }}
        >
          <Space>
            <Text style={{ color: "#8c8c8c", fontSize: 13 }}>Settings</Text>
            <Tag color="blue">{settingsMeta.length}</Tag>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => setSettingsOpen(true)}
            >
              Edit
            </Button>
          </Space>
        </Divider>

        {settingsMeta.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            imageStyle={{ height: 32 }}
            description={
              <Text style={{ color: "#595959", fontSize: 12 }}>
                No settings configured. Click Edit to add key-value pairs.
              </Text>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {settingsMeta.map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "4px 8px",
                  borderRadius: 4,
                  backgroundColor: "#1a1a1a",
                }}
              >
                <Text style={{ color: "#8c8c8c", fontSize: 12, minWidth: 140, flexShrink: 0 }}>
                  {key}
                </Text>
                <Text style={{ color: "#d9d9d9", fontSize: 12, wordBreak: "break-all" }}>
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      <OrchestratorSettingsModal
        open={settingsOpen}
        metadata={metadata}
        reportId={reportId}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
