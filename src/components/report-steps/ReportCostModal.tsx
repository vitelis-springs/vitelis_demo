'use client';

import { useState } from "react";
import {
  Button, Modal, Table, Spin, Typography, Tooltip, Tag,
} from "antd";
import { DollarOutlined, InfoCircleOutlined } from "@ant-design/icons";
import {
  useGetReportCostStats,
  useGetStepCostTasks,
  ReportCostStep,
  ReportCostTask,
} from "../../hooks/api/useDeepDiveService";

const { Text } = Typography;

function formatCost(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.001) return `$${value.toFixed(6)}`;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(3)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatDuration(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec.toFixed(0)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

interface StepTasksExpandProps {
  reportId: number;
  stepId: number;
}

function StepTasksExpand({ reportId, stepId }: StepTasksExpandProps) {
  const { data, isLoading } = useGetStepCostTasks(reportId, stepId);

  if (isLoading) return <Spin size="small" />;
  const tasks = data?.data ?? [];

  const columns = [
    {
      title: "Task", dataIndex: "task", key: "task",
      render: (v: string) => <Text style={{ color: "#d9d9d9", fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Model", key: "model", width: 200,
      render: (_: unknown, r: ReportCostTask) => (
        <span style={{ fontSize: 12, color: "#8c8c8c" }}>
          {r.provider && <Tag style={{ fontSize: 11 }}>{r.provider}</Tag>}
          {r.model ?? "—"}
        </span>
      ),
    },
    {
      title: "Calls", dataIndex: "totalCalls", key: "calls", width: 70, align: "right" as const,
      render: (v: number, r: ReportCostTask) => (
        <span style={{ fontSize: 12, color: r.errorCount > 0 ? "#ff7875" : "#d9d9d9" }}>
          {v}
          {r.errorCount > 0 && ` (${r.errorCount} err)`}
        </span>
      ),
    },
    {
      title: "Tokens", key: "tokens", width: 120, align: "right" as const,
      render: (_: unknown, r: ReportCostTask) => (
        <Tooltip title={`In: ${r.inputTokens.toLocaleString()} / Out: ${r.outputTokens.toLocaleString()}`}>
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>
            {formatTokens(r.totalTokens)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Cost", dataIndex: "totalCost", key: "cost", width: 90, align: "right" as const,
      render: (v: number, r: ReportCostTask) => (
        <Tooltip title={`In: ${formatCost(r.inputCost)} / Out: ${formatCost(r.outputCost)} / MCP: ${formatCost(r.mcpCost)}`}>
          <Text strong style={{ fontSize: 12, color: v > 0 ? "#52c41a" : "#8c8c8c" }}>
            {formatCost(v)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Avg ms", dataIndex: "avgDurationMs", key: "avg_ms", width: 80, align: "right" as const,
      render: (v: number | null) => (
        <span style={{ fontSize: 12, color: "#8c8c8c" }}>
          {v !== null ? `${Math.round(v)}ms` : "—"}
        </span>
      ),
    },
  ];

  return (
    <Table
      dataSource={tasks}
      columns={columns}
      rowKey={(r) => `${r.task}-${r.provider}-${r.model}`}
      size="small"
      pagination={false}
      style={{ background: "#141414" }}
    />
  );
}

interface ReportCostModalProps {
  reportId: number;
}

export function ReportCostModal({ reportId }: ReportCostModalProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useGetReportCostStats(reportId, open);

  const summary = data?.data.summary;
  const steps = data?.data.steps ?? [];

  const stepColumns = [
    {
      title: "#", dataIndex: "stepId", key: "order", width: 50,
      render: (v: number) => <Text style={{ color: "#8c8c8c", fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Step", dataIndex: "stepName", key: "name",
      render: (v: string | null, r: ReportCostStep) => (
        <div>
          <Text style={{ color: "#d9d9d9", fontSize: 13 }}>{v ?? `Step ${r.stepId}`}</Text>
          {r.stepStatus && (
            <Tag
              style={{ marginLeft: 8, fontSize: 11 }}
              color={r.stepStatus === "DONE" ? "green" : r.stepStatus === "ERROR" ? "red" : "default"}
            >
              {r.stepStatus}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Companies", dataIndex: "companiesCount", key: "companies", width: 90, align: "right" as const,
      render: (v: number) => <Text style={{ color: "#8c8c8c", fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Calls", dataIndex: "totalCalls", key: "calls", width: 70, align: "right" as const,
      render: (v: number, r: ReportCostStep) => (
        <Tooltip title={r.callsWithoutPricing > 0 ? `${r.callsWithoutPricing} without pricing` : undefined}>
          <span style={{ fontSize: 12, color: r.callsWithoutPricing > 0 ? "#faad14" : "#d9d9d9" }}>
            {v}
            {r.callsWithoutPricing > 0 && (
              <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 11 }} />
            )}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Tokens", key: "tokens", width: 120, align: "right" as const,
      render: (_: unknown, r: ReportCostStep) => (
        <Tooltip title={`In: ${r.inputTokens.toLocaleString()} / Out: ${r.outputTokens.toLocaleString()}`}>
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>
            {formatTokens(r.totalTokens)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Cost", dataIndex: "totalCost", key: "cost", width: 90, align: "right" as const,
      render: (v: number, r: ReportCostStep) => (
        <Tooltip title={`In: ${formatCost(r.inputCost)} / Out: ${formatCost(r.outputCost)} / MCP: ${formatCost(r.mcpCost)}`}>
          <Text strong style={{ color: v > 0 ? "#52c41a" : "#8c8c8c" }}>
            {formatCost(v)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Duration", dataIndex: "durationSec", key: "duration", width: 90, align: "right" as const,
      render: (v: number | null) => (
        <Text style={{ color: "#8c8c8c", fontSize: 12 }}>{formatDuration(v)}</Text>
      ),
    },
  ];

  return (
    <>
      <Button
        size="small"
        icon={<DollarOutlined />}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{ fontSize: 12 }}
      >
        Cost
      </Button>

      <style>{`
        .cost-modal-expanded-row > td { background: #141414 !important; padding: 0 !important; }
      `}</style>
      <Modal
        title={`Cost Stats — Report #${reportId}`}
        open={open}
        onCancel={(e) => { e.stopPropagation(); setOpen(false); }}
        footer={null}
        width={900}
        styles={{
          content: { background: "#1f1f1f" },
          header: { background: "#1f1f1f", borderBottom: "1px solid #333" },
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
        ) : (
          <div>
            {summary && (
              <div style={{
                display: "flex", gap: 24, flexWrap: "wrap",
                padding: "12px 16px", marginBottom: 16,
                background: "#141414", borderRadius: 6,
              }}>
                <div>
                  <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>TOTAL COST</div>
                  <Text strong style={{ fontSize: 20, color: "#52c41a" }}>
                    {formatCost(summary.totalCost)}
                  </Text>
                </div>
                <div>
                  <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>TOTAL CALLS</div>
                  <Text style={{ fontSize: 16, color: "#d9d9d9" }}>{summary.totalCalls.toLocaleString()}</Text>
                </div>
                <div>
                  <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>TOTAL TOKENS</div>
                  <Tooltip title={`In: ${summary.inputTokens.toLocaleString()} / Out: ${summary.outputTokens.toLocaleString()}`}>
                    <Text style={{ fontSize: 16, color: "#d9d9d9" }}>{formatTokens(summary.totalTokens)}</Text>
                  </Tooltip>
                </div>
                <div>
                  <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>INPUT COST</div>
                  <Text style={{ fontSize: 14, color: "#8c8c8c" }}>{formatCost(summary.inputCost)}</Text>
                </div>
                <div>
                  <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>OUTPUT COST</div>
                  <Text style={{ fontSize: 14, color: "#8c8c8c" }}>{formatCost(summary.outputCost)}</Text>
                </div>
                {summary.mcpCost > 0 && (
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>MCP COST</div>
                    <Text style={{ fontSize: 14, color: "#8c8c8c" }}>{formatCost(summary.mcpCost)}</Text>
                  </div>
                )}
                <div>
                  <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>DURATION</div>
                  <Text style={{ fontSize: 14, color: "#8c8c8c" }}>{formatDuration(summary.durationSec)}</Text>
                </div>
                {summary.callsWithoutPricing > 0 && (
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: 11, marginBottom: 2 }}>NO PRICING</div>
                    <Text style={{ fontSize: 14, color: "#faad14" }}>
                      {summary.callsWithoutPricing} calls
                    </Text>
                  </div>
                )}
              </div>
            )}

            {steps.length === 0 ? (
              <Text style={{ color: "#8c8c8c" }}>No cost data available for this report.</Text>
            ) : (
              <Table
                dataSource={steps}
                columns={stepColumns}
                rowKey="stepId"
                size="small"
                pagination={false}
                style={{ background: "#1f1f1f" }}
                expandable={{
                  expandedRowRender: (record: ReportCostStep) => (
                    <div style={{ margin: 0, background: "#141414" }}>
                      <StepTasksExpand reportId={reportId} stepId={record.stepId} />
                    </div>
                  ),
                  expandedRowClassName: () => "cost-modal-expanded-row",
                }}
              />
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

interface ReportCostInlineProps {
  reportId: number;
}

export function ReportCostInline({ reportId }: ReportCostInlineProps) {
  const { data, isLoading } = useGetReportCostStats(reportId, true);

  if (isLoading) return <Text style={{ color: "#8c8c8c", fontSize: 12 }}>…</Text>;

  const summary = data?.data.summary;
  if (!summary || summary.totalCost === 0) {
    return <Text style={{ color: "#595959", fontSize: 12 }}>—</Text>;
  }

  return (
    <Text strong style={{ color: "#52c41a", fontSize: 13 }}>
      {formatCost(summary.totalCost)}
    </Text>
  );
}
