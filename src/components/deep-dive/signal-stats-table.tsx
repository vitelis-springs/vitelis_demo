"use client";

import { Card, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useGetSalesMinerSignalStats, type SignalStatRow } from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";

const { Text } = Typography;

const CLASS_COLORS: Record<string, string> = {
  deep_dive_signal: "gold",
  top10_signal: "cyan",
  converted_signal: "green",
  selected_but_never_converted: "orange",
  researched_but_never_selected: "red",
};

const CLASS_LABELS: Record<string, string> = {
  deep_dive_signal: "Deep Dive",
  top10_signal: "Top 10",
  converted_signal: "Converted",
  selected_but_never_converted: "Not Converted",
  researched_but_never_selected: "Never Selected",
};

function num(val: number | null, decimals = 0): string {
  if (val == null) return "—";
  return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function colTitle(title: string, tip: string) {
  return (
    <Tooltip title={tip}>
      <span style={{ cursor: "help", lineHeight: 1.3 }}>
        {title} <QuestionCircleOutlined style={{ color: "#595959", fontSize: 11 }} />
      </span>
    </Tooltip>
  );
}

function buildColumns(rows: SignalStatRow[]): ColumnsType<SignalStatRow> {
  const signalTypes = Array.from(new Set(rows.map((r) => r.signalTypeName))).sort();

  return [
  {
    title: colTitle("ID", "Internal unique identifier of the signal."),
    dataIndex: "signalDefinitionId",
    key: "signalDefinitionId",
    fixed: "left",
    width: 55,
    render: (v: number) => <Text style={{ color: "#595959", fontSize: 11 }}>{v}</Text>,
  },
  {
    title: colTitle("Signal Name", "Human-readable signal name."),
    dataIndex: "signalDefinitionName",
    key: "signalDefinitionName",
    fixed: "left",
    width: 220,
    render: (name: string) => <Text style={{ color: "#d9d9d9" }}>{name}</Text>,
  },
  {
    title: colTitle("Signal Type", "Signal category, for example Micro Signal, Macro Signal, or Product Signal."),
    dataIndex: "signalTypeName",
    key: "signalTypeName",
    width: 120,
    filters: signalTypes.map((v) => ({ text: v, value: v })),
    onFilter: (value, row) => row.signalTypeName === value,
    render: (v: string) => <Tag style={{ fontSize: 11 }}>{v}</Tag>,
  },
  {
    title: colTitle("Effectiveness Class", "Overall classification of the signal based on how far it progressed through the pipeline."),
    dataIndex: "signalEffectivenessClass",
    key: "signalEffectivenessClass",
    width: 115,
    filters: Object.entries(CLASS_LABELS).map(([value, text]) => ({ text, value })),
    onFilter: (value, row) => row.signalEffectivenessClass === value,
    render: (cls: string) => (
      <Tag color={CLASS_COLORS[cls] ?? "default"} style={{ fontSize: 11 }}>
        {CLASS_LABELS[cls] ?? cls}
      </Tag>
    ),
  },
  {
    title: colTitle("Researched Contexts", "Number of unique research contexts where this signal was included in research."),
    dataIndex: "researchedContextCount",
    key: "researchedContextCount",
    width: 110,
    sorter: (a, b) => a.researchedContextCount - b.researchedContextCount,
    render: (v: number) => <Text style={{ color: "#d9d9d9" }}>{v.toLocaleString()}</Text>,
  },
  {
    title: colTitle("Selected in Decisioning", "Number of unique contexts where the signal was explicitly selected in seed-level decisioning."),
    dataIndex: "decisionContextCount",
    key: "decisionContextCount",
    width: 110,
    sorter: (a, b) => a.decisionContextCount - b.decisionContextCount,
    render: (v: number) => <Text style={{ color: v > 0 ? "#1677ff" : "#595959" }}>{v.toLocaleString()}</Text>,
  },
  {
    title: colTitle("Researched but Not Selected", "Number of research contexts where the signal was researched but not selected in the decision layer."),
    dataIndex: "researchedButNotSelectedContextCount",
    key: "researchedButNotSelectedContextCount",
    width: 110,
    sorter: (a, b) => a.researchedButNotSelectedContextCount - b.researchedButNotSelectedContextCount,
    render: (v: number) => <Text style={{ color: v > 0 ? "#fa8c16" : "#595959" }}>{v.toLocaleString()}</Text>,
  },
  {
    title: colTitle("Used in Seeds", "Number of unique seeds where the signal was actively used."),
    dataIndex: "usedSeedCount",
    key: "usedSeedCount",
    width: 100,
    sorter: (a, b) => a.usedSeedCount - b.usedSeedCount,
    render: (v: number) => <Text style={{ color: v > 0 ? "#52c41a" : "#595959" }}>{v.toLocaleString()}</Text>,
  },
  {
    title: colTitle("Final Opportunities", "Number of final opportunities where this signal was involved."),
    dataIndex: "finalOpportunityCount",
    key: "finalOpportunityCount",
    width: 110,
    sorter: (a, b) => a.finalOpportunityCount - b.finalOpportunityCount,
    render: (v: number) => <Text style={{ color: v > 0 ? "#13c2c2" : "#595959" }}>{v.toLocaleString()}</Text>,
  },
  {
    title: colTitle("Top 10 Opportunities", "Number of final opportunities involving this signal that made the top 10."),
    dataIndex: "top10OpportunityCount",
    key: "top10OpportunityCount",
    width: 110,
    sorter: (a, b) => a.top10OpportunityCount - b.top10OpportunityCount,
    render: (v: number) => <Text style={{ color: v > 0 ? "#fadb14" : "#595959" }}>{v.toLocaleString()}</Text>,
  },
  {
    title: colTitle("Deep Dive Opportunities", "Number of final opportunities involving this signal that were selected for deep dive."),
    dataIndex: "deepDiveOpportunityCount",
    key: "deepDiveOpportunityCount",
    width: 110,
    sorter: (a, b) => a.deepDiveOpportunityCount - b.deepDiveOpportunityCount,
    render: (v: number) => <Text style={{ color: v > 0 ? "#eb2f96" : "#595959" }}>{v.toLocaleString()}</Text>,
  },
  {
    title: colTitle("Usage Impact Score", "Total effective impact score of the signal across cases where it was actually used."),
    dataIndex: "usedEffectiveSignalScore",
    key: "usedEffectiveSignalScore",
    width: 110,
    sorter: (a, b) => a.usedEffectiveSignalScore - b.usedEffectiveSignalScore,
    defaultSortOrder: "descend",
    render: (v: number) => <Text style={{ color: "#52c41a" }}>{num(v, 4)}</Text>,
  },
  {
    title: colTitle("Top 10 Impact Score", "Total effective impact score of the signal within top 10 opportunities only."),
    dataIndex: "top10EffectiveSignalScore",
    key: "top10EffectiveSignalScore",
    width: 110,
    sorter: (a, b) => a.top10EffectiveSignalScore - b.top10EffectiveSignalScore,
    render: (v: number) => <Text style={{ color: "#fadb14" }}>{num(v, 4)}</Text>,
  },
  {
    title: colTitle("Average Effective Score", "Average adjusted signal impact score, taking into account role, usage status, and specificity."),
    dataIndex: "avgEffectiveSignalScore",
    key: "avgEffectiveSignalScore",
    width: 110,
    sorter: (a, b) => a.avgEffectiveSignalScore - b.avgEffectiveSignalScore,
    render: (v: number) => <Text style={{ color: "#8c8c8c" }}>{num(v, 4)}</Text>,
  },
  {
    title: colTitle("Total Confirmations", "Total number of evidence confirmations collected for this signal across contexts."),
    dataIndex: "totalConfirmationCount",
    key: "totalConfirmationCount",
    width: 110,
    sorter: (a, b) => (a.totalConfirmationCount ?? -1) - (b.totalConfirmationCount ?? -1),
    render: (v: number | null) => <Text style={{ color: "#8c8c8c" }}>{num(v)}</Text>,
  },
  {
    title: colTitle("Average Evidence Strength", "Average strength of evidence supporting this signal."),
    dataIndex: "avgEvidenceStrengthScore",
    key: "avgEvidenceStrengthScore",
    width: 110,
    sorter: (a, b) => a.avgEvidenceStrengthScore - b.avgEvidenceStrengthScore,
    render: (v: number) => <Text style={{ color: "#58bfce" }}>{num(v, 4)}</Text>,
  },
  {
    title: colTitle("Average Evidence Confidence", "Average confidence level of the evidence supporting this signal."),
    dataIndex: "avgEvidenceConfidenceScore",
    key: "avgEvidenceConfidenceScore",
    width: 110,
    sorter: (a, b) => a.avgEvidenceConfidenceScore - b.avgEvidenceConfidenceScore,
    render: (v: number) => <Text style={{ color: "#8c8c8c" }}>{num(v, 4)}</Text>,
  },
  ];
}

interface Props {
  reportId: number;
}

export default function SignalStatsTable({ reportId }: Props) {
  const { data, isLoading } = useGetSalesMinerSignalStats(reportId);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const columns = useMemo(() => buildColumns(rows), [rows]);
  const title = isLoading ? "Signal Statistics" : `Signal Statistics (${rows.length})`;

  return (
    <Card
      title={title}
      size="small"
      style={{ ...DARK_CARD_STYLE, marginBottom: 24 }}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
    >
      <Table<SignalStatRow>
        dataSource={rows}
        columns={columns}
        rowKey="signalDefinitionId"
        loading={isLoading}
        size="small"
        scroll={{ x: 2000 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total) => `${total} signals`,
        }}
        rowClassName={() => "sm-signal-row"}
        className="sm-signal-stats"
        style={{ background: "transparent" }}
      />
      <style jsx global>{`
        .sm-signal-row:hover td { background: #1f1f1f !important; }
        .sm-signal-stats .ant-table-thead > tr > th {
          white-space: normal !important;
          word-break: keep-all;
          overflow-wrap: normal;
          vertical-align: top;
          padding: 8px 6px !important;
          line-height: 1.3;
        }
      `}</style>
    </Card>
  );
}
