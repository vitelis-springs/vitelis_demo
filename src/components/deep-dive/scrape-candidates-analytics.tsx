"use client";

import {
  Card,
  Col,
  Input,
  Layout,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useMemo, useState } from "react";
import { Resizable } from "react-resizable";
import dayjs from "dayjs";
import Link from "next/link";
import Sidebar from "../ui/sidebar";
import {
  ScrapeCandidateItem,
  ScrapeCandidatesParams,
  useGetScrapeCandidates,
} from "../../hooks/api/useDeepDiveService";

const { Content } = Layout;
const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: "default",
  scraped: "green",
  failed: "red",
  skipped: "orange",
};

/* ─────────────── resizable column header ─────────────── */

interface ResizableTitleProps extends React.HTMLAttributes<HTMLTableCellElement> {
  onResize?: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  width?: number;
}

function ResizableTitle({ onResize, width, ...rest }: ResizableTitleProps) {
  if (!width || !onResize) return <th {...rest} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          style={{
            position: "absolute",
            right: -5,
            bottom: 0,
            zIndex: 1,
            width: 10,
            height: "100%",
            cursor: "col-resize",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...rest} />
    </Resizable>
  );
}

function useResizableColumns<T>(baseColumns: TableColumnsType<T>) {
  const [widths, setWidths] = useState<number[]>(() =>
    baseColumns.map((c) => (c as { width?: number }).width ?? 200),
  );

  const handleResize = useCallback(
    (index: number) =>
      (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
        setWidths((prev) => {
          const next = [...prev];
          next[index] = size.width;
          return next;
        });
      },
    [],
  );

  return useMemo(
    () =>
      baseColumns.map((col, i) => ({
        ...col,
        width: widths[i],
        onHeaderCell: () => ({
          width: widths[i],
          onResize: handleResize(i),
        }),
      })) as TableColumnsType<T>,
    [baseColumns, widths, handleResize],
  );
}

/* ─────────────── types ─────────────── */

type CandidateRow = ScrapeCandidateItem & { key: number };

/* ─────────────── main component ─────────────── */

export default function ScrapeCandidatesAnalytics({
  reportId,
  companyId,
}: {
  reportId: number;
  companyId: number;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const queryParams = useMemo((): ScrapeCandidatesParams => ({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search || undefined,
  }), [search, page, pageSize]);

  const { data, isLoading } = useGetScrapeCandidates(reportId, companyId, queryParams);
  const payload = data?.data;

  const total = payload?.total ?? 0;
  const totalFiltered = payload?.totalFiltered ?? 0;
  const items = payload?.items ?? [];

  const tableData = useMemo((): CandidateRow[] =>
    items.map((item) => ({ ...item, key: item.id })),
    [items],
  );

  const showingLabel = `Showing ${totalFiltered.toLocaleString()} of ${total.toLocaleString()} (${total > 0 ? Math.round((totalFiltered / total) * 100) : 0}%)`;

  const colsDef = useMemo((): TableColumnsType<CandidateRow> => [
    {
      title: "URL",
      dataIndex: "url",
      width: 300,
      render: (v: string) => (
        <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: "#58bfce", wordBreak: "break-all" }}>
          {v.length > 80 ? `${v.slice(0, 80)}...` : v}
        </a>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      width: 250,
      render: (v: string | null) => (
        <Text style={{ color: "#d9d9d9" }}>{v || "—"}</Text>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      width: 350,
      render: (v: string | null) => (
        <div style={{ maxHeight: 120, overflow: "auto", color: "#d9d9d9" }}>
          {v || <span style={{ color: "#595959" }}>—</span>}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? "default"}>{v}</Tag>,
    },
    {
      title: "Agents",
      width: 150,
      render: (_: unknown, row: CandidateRow) => {
        const meta = row.metadata as Record<string, unknown> | null;
        const agents = Array.isArray(meta?.agents)
          ? (meta.agents as string[])
          : [];
        return agents.length
          ? <Space size={2} wrap>{agents.map((a) => <Tag key={a} color="blue">{a}</Tag>)}</Space>
          : <span style={{ color: "#595959" }}>—</span>;
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 140,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
  ], []);

  const columns = useResizableColumns(colsDef);
  const tableComponents = useMemo(() => ({ header: { cell: ResizableTitle } }), []);

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: "#141414" }}>
        <Content style={{ padding: "24px", background: "#141414", minHeight: "100vh" }}>
          <div style={{ maxWidth: "1400px", width: "100%" }}>
            {/* ── header ── */}
            <div style={{ marginBottom: 24 }}>
              <Space direction="vertical" size={4}>
                <Link
                  href={`/deep-dive/${reportId}/companies/${companyId}`}
                  style={{ color: "#58bfce", fontSize: 14 }}
                >
                  ← Back to company
                </Link>
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  Scrape Candidates — {payload?.company.name ?? `Company #${companyId}`}
                </Title>
              </Space>
            </div>

            {/* ── summary card ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} md={8}>
                <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                  <Text style={{ color: "#8c8c8c" }}>Total candidates</Text>
                  <Title level={3} style={{ margin: 0, color: "#fff" }}>{total}</Title>
                </Card>
              </Col>
            </Row>

            {/* ── filter ── */}
            <Card style={{ background: "#1f1f1f", border: "1px solid #303030", marginBottom: 16 }}>
              <Space size="middle">
                <Input.Search
                  placeholder="Search url/title/description..."
                  allowClear
                  style={{ width: 320 }}
                  onSearch={(v) => { setSearch(v); setPage(1); }}
                />
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: "#8c8c8c" }}>{showingLabel}</Text>
              </div>
            </Card>

            {/* ── table ── */}
            <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
              <Table
                dataSource={tableData}
                rowKey="key"
                loading={isLoading}
                columns={columns}
                components={tableComponents}
                scroll={{ x: 1300 }}
                bordered
                pagination={{
                  current: page,
                  pageSize,
                  total: totalFiltered,
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "25", "50", "100"],
                  onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
              />
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
