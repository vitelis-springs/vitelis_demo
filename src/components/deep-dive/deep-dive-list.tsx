'use client';

import { Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
  DeepDiveListItem, DeepDiveStatus, useGetDeepDives,
} from "../../hooks/api/useDeepDiveService";
import useServerSortedTable from "../../hooks/useServerSortedTable";
import DeepDivePageLayout from "./shared/page-layout";
import PageHeader from "./shared/page-header";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

const STATUS_OPTIONS: Array<{ label: string; value: DeepDiveStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Done", value: "DONE" },
  { label: "Error", value: "ERROR" },
];

function formatRelativeTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * TODO(human): Implement renderBadges — render tag badges for a report row.
 *
 * @param record - a DeepDiveListItem with useCase, industryName, and settings fields
 * @returns JSX with Tag components for each available badge
 *
 * Design constraints:
 * - Use Ant Design <Tag> with color="cyan" for Use Case, color="green" for Industry,
 *   color="purple" for Settings — or choose your own color scheme
 * - Only render a tag if the value exists (non-null)
 * - Keep it compact: tags should be inline, small, with marginTop: 8
 */
function renderBadges(record: DeepDiveListItem): React.ReactNode {
  const tags: React.ReactNode[] = [];

  // TODO(human): Replace this placeholder with your badge implementation.
  // Use record.useCase, record.industryName, record.settings to render Tag components.
  // Example: if (record.useCase) tags.push(<Tag color="cyan" key="uc">{record.useCase.name}</Tag>);
  void record;
  void Tag;

  if (tags.length === 0) return null;
  return <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{tags}</div>;
}

export default function DeepDiveList() {
  const router = useRouter();
  const { page, pageSize, offset, sortBy, sortOrder, handleTableChange, resetPage } =
    useServerSortedTable({ defaultPageSize: 20, defaultSortBy: "created_at" });
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DeepDiveStatus | "">("");
  const [useCaseId, setUseCaseId] = useState<number | undefined>(undefined);
  const [industryId, setIndustryId] = useState<number | undefined>(undefined);

  const { data, isLoading } = useGetDeepDives({
    limit: pageSize,
    offset,
    q: query || undefined,
    status: status || undefined,
    useCaseId,
    industryId,
    sortBy,
    sortOrder,
  });

  const items = data?.data.items ?? [];
  const total = data?.data.total ?? 0;
  const filters = data?.data.filters;

  const useCaseOptions = useMemo(
    () => [
      { label: "All Use Cases", value: 0 },
      ...(filters?.useCases.map((uc) => ({ label: uc.name, value: uc.id })) ?? []),
    ],
    [filters?.useCases]
  );

  const industryOptions = useMemo(
    () => [
      { label: "All Industries", value: 0 },
      ...(filters?.industries.map((ind) => ({ label: ind.name, value: ind.id })) ?? []),
    ],
    [filters?.industries]
  );

  const columns = useMemo(
    () => [
      {
        title: "Report", dataIndex: "name", key: "name", sorter: true,
        render: (_: unknown, record: DeepDiveListItem) => (
          <div>
            <Text strong style={{ color: "#e0e0e0", fontSize: 15 }}>
              {record.name || `Deep Dive #${record.id}`}
            </Text>
            {record.description && (
              <div style={{ color: "#8c8c8c", fontSize: 13, marginTop: 2, maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {record.description}
              </div>
            )}
            {renderBadges(record)}
          </div>
        ),
      },
      {
        title: "Status", dataIndex: "status", key: "status", width: 120,
        render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
      },
      {
        title: "Stats", key: "stats", width: 140,
        render: (_: unknown, record: DeepDiveListItem) => (
          <div style={{ lineHeight: 1.6 }}>
            <div style={{ color: "#d9d9d9", fontSize: 13 }}>
              {record.counts.companies} {record.counts.companies === 1 ? "company" : "companies"}
            </div>
            <div style={{ color: "#8c8c8c", fontSize: 12 }}>
              {record.counts.steps} {record.counts.steps === 1 ? "step" : "steps"}
            </div>
          </div>
        ),
      },
      {
        title: "Updated", dataIndex: "updatedAt", key: "updated_at", width: 140, sorter: true,
        render: (value: string | null) => (
          <Text style={{ color: "#8c8c8c", fontSize: 13 }}>{formatRelativeTime(value)}</Text>
        ),
      },
    ],
    []
  );

  const handleSearch = () => {
    resetPage();
    setQuery(searchText.trim());
  };

  return (
    <DeepDivePageLayout>
      <PageHeader
        breadcrumbs={[{ label: "Deep Dives" }]}
        title="Deep Dive Admin"
        extra={<Text style={{ color: "#8c8c8c" }}>Track progress, queries, and company statuses</Text>}
      />

      <Card style={{ ...DARK_CARD_STYLE, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle" style={{ width: "100%" }}>
          <Input.Search
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={handleSearch}
            placeholder="Search deep dives"
            allowClear
            style={{ width: 260 }}
          />
          <Select value={status} onChange={(v) => { resetPage(); setStatus(v); }} options={STATUS_OPTIONS} style={{ width: 160 }} />
          <Select value={useCaseId ?? 0} onChange={(v) => { resetPage(); setUseCaseId(v || undefined); }} options={useCaseOptions} style={{ width: 200 }} />
          <Select value={industryId ?? 0} onChange={(v) => { resetPage(); setIndustryId(v || undefined); }} options={industryOptions} style={{ width: 200 }} />
        </Space>
      </Card>

      <Card style={DARK_CARD_STYLE} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
          }}
          style={{ background: "#1f1f1f" }}
          onRow={(record) => ({
            onClick: () => router.push(`/deep-dive/${record.id}`),
            style: { cursor: "pointer" },
          })}
          rowClassName={() => "deep-dive-row"}
        />
        <style jsx global>{`
          .deep-dive-row:hover td { background: #2a2a2a !important; }
          .deep-dive-row td { transition: background 0.2s ease; }
        `}</style>
      </Card>
    </DeepDivePageLayout>
  );
}
