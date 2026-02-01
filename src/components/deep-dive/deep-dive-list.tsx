'use client';

import {
  Card,
  Input,
  Layout,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../ui/sidebar";
import DeepDiveStatusTag from "./status-tag";
import {
  DeepDiveListItem,
  DeepDiveStatus,
  useGetDeepDives,
} from "../../hooks/api/useDeepDiveService";

const { Content } = Layout;
const { Title, Text } = Typography;

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DeepDiveStatus | "">("");
  const [useCaseId, setUseCaseId] = useState<number | undefined>(undefined);
  const [industryId, setIndustryId] = useState<number | undefined>(undefined);

  const offset = (page - 1) * pageSize;

  const { data, isLoading } = useGetDeepDives({
    limit: pageSize,
    offset,
    q: query || undefined,
    status: status || undefined,
    useCaseId,
    industryId,
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
        title: "Report",
        dataIndex: "name",
        key: "name",
        render: (_: unknown, record: DeepDiveListItem) => (
          <div>
            <Text strong style={{ color: "#e0e0e0", fontSize: 15 }}>
              {record.name || `Deep Dive #${record.id}`}
            </Text>
            {record.description && (
              <div
                style={{
                  color: "#8c8c8c",
                  fontSize: 13,
                  marginTop: 2,
                  maxWidth: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {record.description}
              </div>
            )}
            {renderBadges(record)}
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
      },
      {
        title: "Stats",
        key: "stats",
        width: 140,
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
        title: "Updated",
        dataIndex: "updatedAt",
        key: "updatedAt",
        width: 140,
        render: (value: string | null) => (
          <Text style={{ color: "#8c8c8c", fontSize: 13 }}>{formatRelativeTime(value)}</Text>
        ),
      },
    ],
    []
  );

  const handleSearch = () => {
    setPage(1);
    setQuery(searchText.trim());
  };

  const handleStatusChange = (value: DeepDiveStatus | "") => {
    setPage(1);
    setStatus(value);
  };

  const handleUseCaseChange = (value: number) => {
    setPage(1);
    setUseCaseId(value || undefined);
  };

  const handleIndustryChange = (value: number) => {
    setPage(1);
    setIndustryId(value || undefined);
  };

  const handlePageChange = (nextPage: number, nextPageSize?: number) => {
    setPage(nextPage);
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: "#141414" }}>
        <Content
          style={{
            padding: "24px",
            background: "#141414",
            minHeight: "100vh",
          }}
        >
          <div style={{ maxWidth: "1400px", width: "100%" }}>
            <div
              style={{
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  Deep Dive Admin
                </Title>
                <Text style={{ color: "#8c8c8c" }}>
                  Track progress, queries, and company statuses
                </Text>
              </div>
            </div>

            <Card
              style={{
                background: "#1f1f1f",
                border: "1px solid #303030",
                marginBottom: "16px",
              }}
              styles={{ body: { padding: "16px" } }}
            >
              <Space wrap size="middle" style={{ width: "100%" }}>
                <Input.Search
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onSearch={handleSearch}
                  placeholder="Search deep dives"
                  allowClear
                  style={{ width: 260 }}
                />
                <Select
                  value={status}
                  onChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                  style={{ width: 160 }}
                />
                <Select
                  value={useCaseId ?? 0}
                  onChange={handleUseCaseChange}
                  options={useCaseOptions}
                  style={{ width: 200 }}
                />
                <Select
                  value={industryId ?? 0}
                  onChange={handleIndustryChange}
                  options={industryOptions}
                  style={{ width: 200 }}
                />
              </Space>
            </Card>

            <Card
              style={{
                background: "#1f1f1f",
                border: "1px solid #303030",
              }}
              styles={{ body: { padding: "0" } }}
            >
              <Table
                dataSource={items}
                columns={columns}
                rowKey="id"
                loading={isLoading}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: handlePageChange,
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
                .deep-dive-row:hover td {
                  background: #2a2a2a !important;
                }
                .deep-dive-row td {
                  transition: background 0.2s ease;
                }
              `}</style>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
