'use client';

import {
  Button,
  Card,
  Input,
  Layout,
  Select,
  Space,
  Table,
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function DeepDiveList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DeepDiveStatus | "">("");

  const offset = (page - 1) * pageSize;

  const { data, isLoading } = useGetDeepDives({
    limit: pageSize,
    offset,
    q: query || undefined,
    status: status || undefined,
  });

  const items = data?.data.items ?? [];
  const total = data?.data.total ?? 0;

  const columns = useMemo(
    () => [
      {
        title: "Deep Dive",
        dataIndex: "name",
        key: "name",
        render: (_: string | null, record: DeepDiveListItem) => (
          <Space direction="vertical" size={2}>
            <Text style={{ color: "#ffffff", fontWeight: 600 }}>
              {record.name || `Deep Dive #${record.id}`}
            </Text>
            <Text style={{ color: "#8c8c8c" }}>{record.description || "—"}</Text>
          </Space>
        ),
      },
      {
        title: "Use Case",
        dataIndex: "useCase",
        key: "useCase",
        width: 160,
        render: (useCase: DeepDiveListItem["useCase"]) => useCase?.name || "—",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
      },
      {
        title: "Companies",
        dataIndex: ["counts", "companies"],
        key: "companies",
        width: 110,
      },
      {
        title: "Steps",
        dataIndex: ["counts", "steps"],
        key: "steps",
        width: 90,
      },
      {
        title: "Updated",
        dataIndex: "updatedAt",
        key: "updatedAt",
        width: 180,
        render: (value: string | null) => formatDate(value),
      },
      {
        title: "",
        key: "action",
        width: 120,
        render: (_: unknown, record: DeepDiveListItem) => (
          <Button type="primary" onClick={() => router.push(`/deep-dive/${record.id}`)}>
            Open
          </Button>
        ),
      },
    ],
    [router]
  );

  const handleSearch = () => {
    setPage(1);
    setQuery(searchText.trim());
  };

  const handleStatusChange = (value: DeepDiveStatus | "") => {
    setPage(1);
    setStatus(value);
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
                  style={{ width: 180 }}
                />
                <Button onClick={handleSearch} type="default">
                  Refresh
                </Button>
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
              />
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
