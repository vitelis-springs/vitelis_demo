"use client";

import {
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Layout,
  Row,
  Select,
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Resizable } from "react-resizable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dayjs from "dayjs";
import Link from "next/link";
import Sidebar from "../ui/sidebar";
import DeepDiveBreadcrumbs from "./breadcrumbs";
import {
  SourceItem,
  SourcesAnalyticsParams,
  useGetSourcesAnalytics,
} from "../../hooks/api/useDeepDiveService";

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const QUALITY_COLORS: Record<string, string> = {
  HIGH: "#52c41a",
  MEDIUM: "#faad14",
  LOW: "#ff4d4f",
};

const TIER_COLORS = ["#8c8c8c", "#58bfce", "#36cfc9", "#13c2c2"];
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

/* ─────────────── markdown cell ─────────────── */

function MarkdownCell({ children }: { children: string | null | undefined }) {
  if (!children) return <span style={{ color: "#595959" }}>—</span>;
  return (
    <div style={{ maxHeight: 200, overflow: "auto", color: "#d9d9d9" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children: c }) => <p style={{ margin: "0 0 4px" }}>{c}</p>,
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#58bfce" }}>{c}</a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

type SourceRow = SourceItem & { key: number };

function extractMeta(item: SourceItem, field: string): unknown {
  if (!item.metadata) return null;
  return (item.metadata as Record<string, unknown>)[field] ?? null;
}

function extractStringArray(item: SourceItem, field: string): string[] {
  const value = extractMeta(item, field);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/* ─────────────── main component ─────────────── */

export default function SourcesAnalytics({
  reportId,
  companyId,
}: {
  reportId: number;
  companyId: number;
}) {
  /* ── filter state ── */
  const [tier, setTier] = useState<number | undefined>();
  const [qualityClass, setQualityClass] = useState<string | undefined>();
  const [isValid, setIsValid] = useState<boolean | undefined>();
  const [agent, setAgent] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [tag, setTag] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const queryParams = useMemo((): SourcesAnalyticsParams => ({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    tier,
    qualityClass,
    isValid,
    agent,
    category,
    tag,
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
    search: search || undefined,
  }), [tier, qualityClass, isValid, agent, category, tag, dateRange, search, page, pageSize]);

  const { data, isLoading } = useGetSourcesAnalytics(reportId, companyId, queryParams);
  const payload = data?.data;

  const totalUnfiltered = payload?.totalUnfiltered ?? 0;
  const totalFiltered = payload?.totalFiltered ?? 0;
  const agg = payload?.aggregations;
  const items = payload?.items ?? [];

  const validCount = useMemo(() => {
    if (!agg?.isValid) return 0;
    return agg.isValid.find((v) => v.value === true)?.count ?? 0;
  }, [agg?.isValid]);

  const vectorizedCount = payload?.vectorizedCount ?? 0;

  const avgQualityScore = useMemo(() => {
    if (!agg?.scores) return 0;
    const s = agg.scores;
    const total = s.relevance + s.authority + s.freshness + s.originality + s.security + s.extractability;
    return Math.round((total / 30) * 100);
  }, [agg?.scores]);

  const validPercent = totalFiltered > 0 ? Math.round((validCount / totalFiltered) * 100) : 0;
  const vectorizedPercent = totalFiltered > 0 ? Math.round((vectorizedCount / totalFiltered) * 100) : 0;

  /* ── chart data ── */
  const radarData = useMemo(() => {
    if (!agg?.scores) return [];
    const s = agg.scores;
    return [
      { axis: "Relevance", value: Math.round(s.relevance * 10) / 10 },
      { axis: "Authority", value: Math.round(s.authority * 10) / 10 },
      { axis: "Freshness", value: Math.round(s.freshness * 10) / 10 },
      { axis: "Originality", value: Math.round(s.originality * 10) / 10 },
      { axis: "Security", value: Math.round(s.security * 10) / 10 },
      { axis: "Extractability", value: Math.round(s.extractability * 10) / 10 },
    ];
  }, [agg?.scores]);

  const qualityPieData = useMemo(() => {
    if (!agg?.qualityClass) return [];
    return agg.qualityClass
      .filter((row) => row.value)
      .map((row) => ({ name: row.value!, value: row.count }));
  }, [agg?.qualityClass]);

  const queryBarData = useMemo(() => {
    if (!agg?.queryIds) return [];
    return agg.queryIds.slice(0, 15).map((row) => ({
      queryId: row.query_id,
      goal: row.goal ? (row.goal.length > 50 ? `${row.goal.slice(0, 50)}...` : row.goal) : `Query #${row.query_id}`,
      count: row.count,
    }));
  }, [agg?.queryIds]);

  const agentsPieData = useMemo(() =>
    (agg?.agents ?? []).slice(0, 10).map((row) => ({ name: row.value, value: row.count })),
    [agg?.agents],
  );

  const categoriesPieData = useMemo(() =>
    (agg?.categories ?? []).slice(0, 10).map((row) => ({ name: row.value, value: row.count })),
    [agg?.categories],
  );

  /* ── filter options derived from aggregations ── */
  const agentOptions = useMemo(() =>
    (agg?.agents ?? []).map((a) => ({ label: `${a.value} (${a.count})`, value: a.value })),
    [agg?.agents],
  );
  const categoryOptions = useMemo(() =>
    (agg?.categories ?? []).map((c) => ({ label: `${c.value} (${c.count})`, value: c.value })),
    [agg?.categories],
  );
  const tagOptions = useMemo(() =>
    (agg?.tags ?? []).map((t) => ({ label: `${t.value} (${t.count})`, value: t.value })),
    [agg?.tags],
  );

  /* ── table rows ── */
  const tableData = useMemo((): SourceRow[] =>
    items.map((item) => ({ ...item, key: item.id })),
    [items],
  );

  /* ── table columns ── */
  const colsDef = useMemo((): TableColumnsType<SourceRow> => [
    {
      title: "Title",
      dataIndex: "title",
      width: 200,
      render: (v: string | null) => <MarkdownCell>{v}</MarkdownCell>,
    },
    {
      title: "URL",
      dataIndex: "url",
      width: 200,
      render: (v: string) => (
        <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: "#58bfce", wordBreak: "break-all" }}>
          {v.length > 60 ? `${v.slice(0, 60)}...` : v}
        </a>
      ),
    },
    {
      title: "Tier",
      dataIndex: "tier",
      width: 70,
      render: (v: number | null) => <Tag color={TIER_COLORS[v ?? 0]}>{v ?? "—"}</Tag>,
    },
    {
      title: "Score",
      width: 80,
      render: (_: unknown, row: SourceRow) => {
        const score = extractMeta(row, "total_score");
        return <Text style={{ color: "#d9d9d9" }}>{score != null ? `${score}/30` : "—"}</Text>;
      },
    },
    {
      title: "Valid",
      width: 80,
      render: (_: unknown, row: SourceRow) => {
        const valid = extractMeta(row, "isValid");
        if (valid === true) return <Tag color="green">Yes</Tag>;
        if (valid === false) return <Tag color="red">No</Tag>;
        return "—";
      },
    },
    {
      title: "Query IDs",
      width: 120,
      render: (_: unknown, row: SourceRow) => {
        const ids = extractStringArray(row, "query_ids");
        return ids.length
          ? <Space size={2} wrap>{ids.map((id) => (
              <Link key={id} href={`/deep-dive/${reportId}/query?queryId=${id}`}>
                <Tag color="purple" style={{ cursor: "pointer" }}>#{id}</Tag>
              </Link>
            ))}</Space>
          : "—";
      },
    },
    {
      title: "Tags",
      width: 180,
      render: (_: unknown, row: SourceRow) => {
        const tags = extractStringArray(row, "tags");
        return tags.length
          ? <Space size={2} wrap>{tags.map((t) => <Tag key={t}>{t}</Tag>)}</Space>
          : "—";
      },
    },
    {
      title: "Agents",
      width: 150,
      render: (_: unknown, row: SourceRow) => {
        const agents = extractStringArray(row, "agents");
        return agents.length
          ? <Space size={2} wrap>{agents.map((a) => <Tag key={a} color="blue">{a}</Tag>)}</Space>
          : "—";
      },
    },
    {
      title: "Categories",
      width: 150,
      render: (_: unknown, row: SourceRow) => {
        const cats = extractStringArray(row, "categories");
        return cats.length
          ? <Space size={2} wrap>{cats.map((c) => <Tag key={c} color="cyan">{c}</Tag>)}</Space>
          : "—";
      },
    },
    {
      title: "Reasoning",
      width: 300,
      render: (_: unknown, row: SourceRow) => {
        const reasoning = extractMeta(row, "reasoning") as string | null;
        return <MarkdownCell>{reasoning}</MarkdownCell>;
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      width: 110,
      render: (v: string | null) => v ? dayjs(v).format("YYYY-MM-DD") : "—",
    },
  ], []);

  const columns = useResizableColumns(colsDef);
  const tableComponents = useMemo(() => ({ header: { cell: ResizableTitle } }), []);

  const showingLabel = `Showing ${totalFiltered.toLocaleString()} of ${totalUnfiltered.toLocaleString()} (${totalUnfiltered > 0 ? Math.round((totalFiltered / totalUnfiltered) * 100) : 0}%)`;

  /* ─────────────── render ─────────────── */

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
                    { label: "Sources" },
                  ]}
                />
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  Sources Analytics — {payload?.company.name ?? `Company #${companyId}`}
                </Title>
              </Space>
            </div>

            {/* ── summary cards ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} md={6}>
                <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                  <Text style={{ color: "#8c8c8c" }}>Total sources</Text>
                  <Title level={3} style={{ margin: 0, color: "#fff" }}>{totalUnfiltered}</Title>
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                  <Text style={{ color: "#8c8c8c" }}>Valid %</Text>
                  <Title level={3} style={{ margin: 0, color: "#52c41a" }}>{validPercent}%</Title>
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                  <Text style={{ color: "#8c8c8c" }}>Avg quality score</Text>
                  <Title level={3} style={{ margin: 0, color: "#faad14" }}>{avgQualityScore}%</Title>
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                  <Text style={{ color: "#8c8c8c" }}>Vectorized %</Text>
                  <Title level={3} style={{ margin: 0, color: "#58bfce" }}>{vectorizedPercent}%</Title>
                </Card>
              </Col>
            </Row>

            {/* ── charts ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card
                  title="Quality Scores Radar"
                  style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                  styles={{ header: { borderBottom: "1px solid #303030" } }}
                >
                  {radarData.length ? (
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid stroke="#303030" />
                          <PolarAngleAxis dataKey="axis" tick={{ fill: "#d9d9d9", fontSize: 12 }} />
                          <PolarRadiusAxis domain={[0, 5]} tick={{ fill: "#8c8c8c", fontSize: 11 }} axisLine={false} />
                          <Tooltip contentStyle={{ background: "#1f1f1f", border: "1px solid #303030", borderRadius: 6 }} />
                          <Radar name="Avg Score" dataKey="value" stroke="#58bfce" fill="#58bfce" fillOpacity={0.3} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty description="No score data" />
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title="Quality Class Distribution"
                  style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                  styles={{ header: { borderBottom: "1px solid #303030" } }}
                >
                  {qualityPieData.length ? (
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={qualityPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {qualityPieData.map((entry) => (
                              <Cell key={entry.name} fill={QUALITY_COLORS[entry.name] ?? "#8c8c8c"} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#1f1f1f", border: "1px solid #303030" }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty description="No quality class data" />
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title="Sources by Query"
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
                            formatter={(value) => [value, "Sources"]}
                            labelFormatter={(label) => {
                              const item = queryBarData.find((d) => d.queryId === String(label));
                              return item?.goal ?? `Query #${label}`;
                            }}
                          />
                          <Bar dataKey="count" fill="#58bfce" name="Sources">
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
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card
                      title="Agents"
                      style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                      styles={{ header: { borderBottom: "1px solid #303030", fontSize: 13 } }}
                    >
                      {agentsPieData.length ? (
                        <div style={{ height: 280 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={agentsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                                {agentsPieData.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: "#1f1f1f", border: "1px solid #303030" }} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <Empty description="No agent data" />
                      )}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card
                      title="Categories"
                      style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                      styles={{ header: { borderBottom: "1px solid #303030", fontSize: 13 } }}
                    >
                      {categoriesPieData.length ? (
                        <div style={{ height: 280 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={categoriesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                                {categoriesPieData.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: "#1f1f1f", border: "1px solid #303030" }} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <Empty description="No category data" />
                      )}
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>

            {/* ── filters ── */}
            <Card
              style={{ background: "#1f1f1f", border: "1px solid #303030", marginBottom: 16 }}
            >
              <Space wrap size="middle">
                <Select
                  placeholder="Tier"
                  allowClear
                  style={{ width: 100 }}
                  value={tier}
                  onChange={(v) => { setTier(v); setPage(1); }}
                  options={[0, 1, 2, 3].map((t) => ({ label: `Tier ${t}`, value: t }))}
                />
                <Select
                  placeholder="Quality"
                  allowClear
                  style={{ width: 120 }}
                  value={qualityClass}
                  onChange={(v) => { setQualityClass(v); setPage(1); }}
                  options={["HIGH", "MEDIUM", "LOW"].map((q) => ({ label: q, value: q }))}
                />
                <Select
                  placeholder="Valid"
                  allowClear
                  style={{ width: 100 }}
                  value={isValid}
                  onChange={(v) => { setIsValid(v); setPage(1); }}
                  options={[
                    { label: "Valid", value: true },
                    { label: "Invalid", value: false },
                  ]}
                />
                <Select
                  placeholder="Agent"
                  allowClear
                  showSearch
                  style={{ width: 180 }}
                  value={agent}
                  onChange={(v) => { setAgent(v); setPage(1); }}
                  options={agentOptions}
                />
                <Select
                  placeholder="Category"
                  allowClear
                  showSearch
                  style={{ width: 180 }}
                  value={category}
                  onChange={(v) => { setCategory(v); setPage(1); }}
                  options={categoryOptions}
                />
                <Select
                  placeholder="Tag"
                  allowClear
                  showSearch
                  style={{ width: 180 }}
                  value={tag}
                  onChange={(v) => { setTag(v); setPage(1); }}
                  options={tagOptions}
                />
                <RangePicker
                  value={dateRange ? [dateRange[0], dateRange[1]] : null}
                  onChange={(dates) => {
                    setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null);
                    setPage(1);
                  }}
                  style={{ width: 260 }}
                />
                <Input.Search
                  placeholder="Search title/url..."
                  allowClear
                  style={{ width: 220 }}
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
                scroll={{ x: 1600 }}
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
