"use client";

import {
  App,
  Card,
  Space,
  Typography,
  InputNumber,
  Spin,
  Select,
  Descriptions,
  Button,
} from "antd";
import {
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
import {
  useGetOrchestratorStatus,
  useUpdateOrchestrator,
  useTriggerEngineTick,
  type StepStatus,
} from "../../hooks/api/useReportStepsService";

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

const KNOWN_META_KEYS = ["parallel_limit", "started_at"] as const;

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

  const status = data?.data?.status ?? "PENDING";
  const isProcessing = status === "PROCESSING";
  const metadata = data?.data?.metadata as Record<string, unknown> | null;

  const parallelLimit =
    typeof metadata?.parallel_limit === "number" ? metadata.parallel_limit : 1;

  const handleStatusChange = (newStatus: StepStatus) => {
    updateOrch.mutate({ status: newStatus });
  };

  const handleParallelLimitChange = (val: number | null) => {
    if (val === null || val < 1) return;
    updateOrch.mutate({ metadata: { parallel_limit: val } });
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

  // Collect extra metadata keys (excluding known ones)
  const extraMeta = metadata
    ? Object.entries(metadata).filter(
        ([key]) => !(KNOWN_META_KEYS as readonly string[]).includes(key)
      )
    : [];

  return (
    <Card
      title="Orchestrator"
      style={DARK_CARD_STYLE}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
    >
      <Descriptions
        column={{ xs: 1, sm: 2, md: 3 }}
        size="small"
        styles={{
          label: { color: "#8c8c8c" },
          content: { color: "#d9d9d9" },
        }}
      >
        {/* Status - always editable */}
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

        {/* Parallel Limit - always editable */}
        <Descriptions.Item label="parallel_limit">
          <InputNumber
            size="small"
            min={1}
            max={20}
            value={parallelLimit}
            onChange={handleParallelLimitChange}
            disabled={
              updateOrch.isPending &&
              updateOrch.variables?.metadata?.parallel_limit !== undefined
            }
            style={{ width: 80 }}
          />
        </Descriptions.Item>

        {/* Trigger Engine */}
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

        {/* Started At */}
        {metadata?.started_at && (
          <Descriptions.Item label="started_at">
            <Text style={{ color: "#8c8c8c", fontSize: 12 }}>
              {new Date(metadata.started_at as string).toLocaleString()}
            </Text>
          </Descriptions.Item>
        )}

        {/* Extra metadata as key: value */}
        {extraMeta.map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            <Text style={{ color: "#d9d9d9", fontSize: 12 }}>
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </Text>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  );
}
