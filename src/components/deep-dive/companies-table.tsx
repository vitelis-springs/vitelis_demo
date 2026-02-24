"use client";

import { Card, Input, Progress, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DeepDiveCompanyRow, DeepDiveStatus } from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

const columns: ColumnsType<DeepDiveCompanyRow> = [
  {
    title: "ID",
    dataIndex: "id",
    width: 70,
    sorter: (a, b) => a.id - b.id,
    render: (value: number) => (
      <Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>#{value}</Text>
    ),
  },
  {
    title: "Company",
    dataIndex: "name",
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (value: string, record) => (
      <Space direction="vertical" size={2}>
        <Text style={{ color: "#fff", fontWeight: 600 }}>{value}</Text>
        {record.countryCode && (
          <Text style={{ color: "#8c8c8c" }}>{record.countryCode}</Text>
        )}
      </Space>
    ),
  },
  {
    title: "Status",
    dataIndex: "status",
    width: 120,
    sorter: (a, b) => a.status.localeCompare(b.status),
    filters: [
      { text: "Pending", value: "PENDING" },
      { text: "Processing", value: "PROCESSING" },
      { text: "Done", value: "DONE" },
      { text: "Error", value: "ERROR" },
    ],
    onFilter: (value, record) => record.status === value,
    render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
  },
  {
    title: "Sources",
    dataIndex: "sourcesCount",
    width: 100,
    sorter: (a, b) => a.sourcesCount - b.sourcesCount,
    render: (value: number) => (
      <Text style={{ color: "#d9d9d9" }}>{value.toLocaleString()}</Text>
    ),
  },
  {
    title: "Valid",
    dataIndex: "validSourcesCount",
    width: 100,
    sorter: (a, b) => a.validSourcesCount - b.validSourcesCount,
    render: (value: number, record) => {
      const pct = record.sourcesCount > 0
        ? Math.round((value / record.sourcesCount) * 100)
        : 0;
      const color = pct >= 50 ? "#52c41a" : pct >= 25 ? "#faad14" : "#ff4d4f";
      return (
        <Text style={{ color }}>
          {value.toLocaleString()} <span style={{ color: "#8c8c8c" }}>({pct}%)</span>
        </Text>
      );
    },
  },
  {
    title: "Used",
    dataIndex: "usedSourcesCount",
    width: 100,
    sorter: (a, b) => a.usedSourcesCount - b.usedSourcesCount,
    render: (value: number, record) => {
      const pct = record.validSourcesCount > 0
        ? Math.round((value / record.validSourcesCount) * 100)
        : 0;
      return (
        <Text style={{ color: "#73d13d" }}>
          {value.toLocaleString()} <span style={{ color: "#8c8c8c" }}>({pct}%)</span>
        </Text>
      );
    },
  },
  {
    title: "Candidates",
    dataIndex: "candidatesCount",
    width: 110,
    sorter: (a, b) => a.candidatesCount - b.candidatesCount,
    render: (value: number) => (
      <Text style={{ color: "#d9d9d9" }}>{value.toLocaleString()}</Text>
    ),
  },
  {
    title: "Steps",
    key: "steps",
    width: 140,
    sorter: (a, b) => {
      const pctA = a.stepsTotal > 0 ? a.stepsDone / a.stepsTotal : 0;
      const pctB = b.stepsTotal > 0 ? b.stepsDone / b.stepsTotal : 0;
      return pctA - pctB;
    },
    render: (_, record) => {
      const pct = record.stepsTotal > 0
        ? Math.round((record.stepsDone / record.stepsTotal) * 100)
        : 0;
      return (
        <Space size={8}>
          <Text style={{ color: "#d9d9d9", whiteSpace: "nowrap" }}>
            {record.stepsDone}/{record.stepsTotal}
          </Text>
          <Progress
            percent={pct}
            size="small"
            showInfo={false}
            strokeColor={pct === 100 ? "#52c41a" : "#1890ff"}
            style={{ width: 60, margin: 0 }}
          />
        </Space>
      );
    },
  },
];

export default function CompaniesTable({
  reportId,
  companies,
  loading,
}: {
  reportId: number;
  companies: DeepDiveCompanyRow[];
  loading: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q),
    );
  }, [companies, search]);

  return (
    <Card
      title="Companies"
      style={DARK_CARD_STYLE}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
      extra={
        <Input
          placeholder="Search by name or ID"
          prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
      }
    >
      <Table<DeepDiveCompanyRow>
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => router.push(`/deep-dive/${reportId}/companies/${record.id}`),
          style: { cursor: "pointer" },
        })}
        columns={columns}
      />
    </Card>
  );
}
