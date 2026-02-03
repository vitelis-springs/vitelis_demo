"use client";

import {
  Card,
  Col,
  Empty,
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Resizable } from "react-resizable";
import dayjs from "dayjs";
import Link from "next/link";
import Sidebar from "../ui/sidebar";
import DeepDiveBreadcrumbs from "./breadcrumbs";
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

const PIE_COLORS = ["#58bfce", "#36cfc9", "#13c2c2", "#006d75", "#00474f", "#95de64", "#faad14", "#ff7a45", "#ff4d4f", "#b37feb"];

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
  const agg = payload?.aggregations;
  const items = payload?.items ?? [];

  const tableData = useMemo((): CandidateRow[] =>
    items.map((item) => ({ ...item, key: item.id })),
    [items],
  );

  const showingLabel = `Showing ${totalFiltered.toLocaleString()} of ${total.toLocaleString()} (${total > 0 ? Math.round((totalFiltered / total) * 100) : 0}%)`;

  /* ── chart data ── */
  const agentsPieData = useMemo(() =>
    (agg?.agents ?? []).slice(0, 10).map((row) => ({ name: row.value, value: row.count })),
    [agg?.agents],
  );

  const queryBarData = useMemo(() => {
    if (!agg?.queryIds) return [];
    return agg.queryIds.slice(0, 15).map((row) => ({
      queryId: row.query_id,
      goal: row.goal ? (row.goal.length > 50 ? `${row.goal.slice(0, 50)}...` : row.goal) : `Query #${row.query_id}`,
      count: row.count,
    }));
  }, [agg?.queryIds]);

  /* ── table columns ── */
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
      width: 300,
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
      title: "Query IDs",
      width: 120,
      render: (_: unknown, row: CandidateRow) => {
        const meta = row.metadata as Record<string, unknown> | null;
        const ids = Array.isArray(meta?.query_ids)
          ? (meta.query_ids as string[])
          : [];
        return ids.length
          ? <Space size={2} wrap>{ids.map((id) => (
              <Link key={id} href={`/deep-dive/${reportId}/query?queryId=${id}`}>
                <Tag color="purple" style={{ cursor: "pointer" }}>#{id}</Tag>
              </Link>
            ))}</Space>
          : <span style={{ color: "#595959" }}>—</span>;
      },
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
  ], [reportId]);

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
                <DeepDiveBreadcrumbs
                  items={[
                    { label: "Deep Dives", href: "/deep-dive" },
                    { label: `Report #${reportId}`, href: `/deep-dive/${reportId}` },
                    { label: payload?.company.name ?? `Company #${companyId}`, href: `/deep-dive/${reportId}/companies/${companyId}` },
                    { label: "Candidates" },
                  ]}
                />
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

            {/* ── charts ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card
                  title="Candidates by Query"
                  style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                  styles={{ header: { borderBottom: "1px solid #303030" } }}
                >
                  {queryBarData.length ? (
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={queryBarData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                          <XAxis type="number" tick={{ fill: "#d9d9d9" }} />
                          <YAxis
                            type="category"
                            dataKey="queryId"
                            tick={{ fill: "#58bfce", fontSize: 11 }}
                            width={50}
                          />
                          <Tooltip
                            contentStyle={{ background: "#1f1f1f", border: "1px solid #303030" }}
                            formatter={(value) => [value, "Candidates"]}
                            labelFormatter={(label) => {
                              const item = queryBarData.find((d) => d.queryId === String(label));
                              return item?.goal ?? `Query #${label}`;
                            }}
                          />
                          <Bar dataKey="count" fill="#58bfce" name="Candidates">
                            {queryBarData.map((entry) => (
                              <Cell
                                key={entry.queryId}
                                fill="#58bfce"
                                cursor="pointer"
                                onClick={() => window.open(`/deep-dive/${reportId}/query?queryId=${entry.queryId}`, "_self")}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty description="No query data" />
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title="Agents Distribution"
                  style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                  styles={{ header: { borderBottom: "1px solid #303030" } }}
                >
                  {agentsPieData.length ? (
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={agentsPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {agentsPieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#1f1f1f", border: "1px solid #303030" }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty description="No agent data" />
                  )}
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
                scroll={{ x: 1400 }}
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
