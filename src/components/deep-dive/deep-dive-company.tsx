"use client";

import {
  Card,
  Col,
  Empty,
  Layout,
  Progress,
  Row,
  Space,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useMemo, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Resizable } from "react-resizable";
import Sidebar from "../ui/sidebar";
import {
  DeepDiveCompanyResponse,
  DeepDiveStatus,
  useGetDeepDiveCompany,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveStatusTag from "./status-tag";

const { Content } = Layout;
const { Title, Text } = Typography;

const SCORE_DOMAIN: [number, number] = [0, 5];

/* ─────────────── types ─────────────── */

type DataRecord = Record<string, unknown>;

type CategoryRow = {
  key: number;
  category: string;
  score: number | null;
  scoreLabel: string;
  reasoning: string | null;
};

type DriverRow = {
  key: number;
  category: string;
  kpi: string;
  driver: string;
  score: number | null;
  scoreLabel: string;
  reasoning: string | null;
  sources: string[];
};

type RawDataPointRow = {
  key: number;
  question: string;
  answer: string;
  explanation: string | null;
  sources: string[];
};

type RadarDataPoint = {
  category: string;
  company: number;
  top5Average: number;
  reportAverage: number;
};

/* ─────────────── helpers ─────────────── */

const toDataRecord = (value: unknown): DataRecord =>
  value && typeof value === "object" ? (value as DataRecord) : {};

const getString = (data: DataRecord, key: string): string | null => {
  const value = data[key];
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
};

const parseScore = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  return null;
};

const toScoreLabel = (value: unknown, fallback?: number | null): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (fallback !== null && fallback !== undefined) return String(fallback);
  return "—";
};

const normalizeSources = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    const matches = value.match(/https?:\/\/[^\s,]+/g);
    if (matches?.length) return Array.from(new Set(matches));
    return value
      .split(/\s*,\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const deriveCompanyStatus = (
  steps: DeepDiveCompanyResponse["data"]["steps"],
): DeepDiveStatus | null => {
  if (!steps.length) return null;
  if (steps.some((s) => s.status === "ERROR")) return "ERROR";
  if (steps.some((s) => s.status === "PROCESSING")) return "PROCESSING";
  if (steps.some((s) => s.status === "PENDING")) return "PENDING";
  return "DONE";
};

/* ─────────────── resizable column header ─────────────── */

interface ResizableTitleProps
  extends React.HTMLAttributes<HTMLTableCellElement> {
  onResize?: (
    e: React.SyntheticEvent,
    data: { size: { width: number } },
  ) => void;
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

/* ─────────────── markdown cells ─────────────── */

function MarkdownCell({ children }: { children: string | null | undefined }) {
  if (!children) return <span style={{ color: "#595959" }}>—</span>;
  return (
    <div style={{ maxHeight: 200, overflow: "auto", color: "#d9d9d9" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children: c }) => <p style={{ margin: "0 0 4px" }}>{c}</p>,
          a: ({ href, children: c }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#58bfce" }}
            >
              {c}
            </a>
          ),
          ul: ({ children: c }) => (
            <ul style={{ margin: "0 0 4px", paddingLeft: 16 }}>{c}</ul>
          ),
          ol: ({ children: c }) => (
            <ol style={{ margin: "0 0 4px", paddingLeft: 16 }}>{c}</ol>
          ),
          table: ({ children: c }) => (
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 12,
                margin: "4px 0",
              }}
            >
              {c}
            </table>
          ),
          th: ({ children: c }) => (
            <th
              style={{
                border: "1px solid #303030",
                padding: "4px 8px",
                background: "#1a1a1a",
                color: "#d9d9d9",
                textAlign: "left",
              }}
            >
              {c}
            </th>
          ),
          td: ({ children: c }) => (
            <td
              style={{
                border: "1px solid #303030",
                padding: "4px 8px",
                color: "#d9d9d9",
              }}
            >
              {c}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function SourcesCell({ sources }: { sources: string[] }) {
  if (!sources.length) return <span style={{ color: "#595959" }}>—</span>;
  const md = sources
    .map((s) => {
      if (s.startsWith("http")) {
        try {
          return `- [${new URL(s).hostname}](${s})`;
        } catch {
          return `- ${s}`;
        }
      }
      return `- ${s}`;
    })
    .join("\n");
  return <MarkdownCell>{md}</MarkdownCell>;
}

/* ─────────────── main component ─────────────── */

export default function DeepDiveCompany({
  reportId,
  companyId,
}: {
  reportId: number;
  companyId: number;
}) {
  const sourceParams = useMemo(
    () => ({ sourcesLimit: 50, sourcesOffset: 0 }),
    [],
  );
  const { data, isLoading } = useGetDeepDiveCompany(
    reportId,
    companyId,
    sourceParams,
  );
  const payload = data?.data;

  const steps = payload?.steps ?? [];
  const kpiResults = payload?.kpiResults ?? [];
  const sourcesTotal = payload?.sources?.total ?? 0;
  const scrapCandidatesTotal =
    payload?.scrapCandidatesTotal ?? payload?.scrapCandidates.length ?? 0;

  const progress = useMemo(() => {
    if (!steps.length) return { done: 0, total: 0, percent: 0 };
    const done = steps.filter((s) => s.status === "DONE").length;
    return {
      done,
      total: steps.length,
      percent: Math.round((done / steps.length) * 100),
    };
  }, [steps]);

  const companyStatus = useMemo(() => deriveCompanyStatus(steps), [steps]);

  /* ---- parse KPI results ---- */

  const { categoryRows, driverRows, rawRows } = useMemo(() => {
    const categories: CategoryRow[] = [];
    const drivers: DriverRow[] = [];
    const rawDataPoints: RawDataPointRow[] = [];

    for (const result of kpiResults) {
      const dr = toDataRecord(result.data);
      const dpId = result.dataPointId ?? "";
      const type = result.type ?? "";

      const isCategory =
        type === "kpi_category" || dpId.startsWith("kpi_category");
      const isDriver =
        type === "kpi_driver" || dpId.startsWith("kpi_driver");
      const isRaw =
        type === "raw_data_point" || dpId.startsWith("raw_data_point");

      if (isCategory) {
        const sv = parseScore(result.value ?? dr["KPI Score"]);
        categories.push({
          key: result.id,
          category:
            getString(dr, "KPI Category") ||
            result.name ||
            result.dataPointId ||
            "—",
          score: sv,
          scoreLabel: toScoreLabel(result.value ?? dr["KPI Score"], sv),
          reasoning: getString(dr, "Reasoning"),
        });
      } else if (isDriver) {
        const sv = parseScore(result.value ?? dr["Score"]);
        drivers.push({
          key: result.id,
          category: getString(dr, "KPI Category") || "Uncategorized",
          kpi:
            getString(dr, "Definition (KPI)") ||
            getString(dr, "KPI") ||
            "—",
          driver:
            getString(dr, "Metric (KPI Driver)") ||
            getString(dr, "KPI Driver") ||
            result.name ||
            result.dataPointId ||
            "—",
          score: sv,
          scoreLabel: toScoreLabel(result.value ?? dr["Score"], sv),
          reasoning: getString(dr, "Reasoning"),
          sources: normalizeSources(dr["Sources"] ?? dr["sources"]),
        });
      } else if (isRaw) {
        rawDataPoints.push({
          key: result.id,
          question:
            getString(dr, "raw_data_point") ||
            result.name ||
            result.dataPointId ||
            "—",
          answer:
            getString(dr, "answer") ||
            (typeof result.value === "string" ? result.value : "—"),
          explanation:
            getString(dr, "explanation") || getString(dr, "Reasoning"),
          sources: normalizeSources(dr["sources"] ?? dr["Sources"]),
        });
      }
    }

    categories.sort((a, b) => a.category.localeCompare(b.category));
    drivers.sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.kpi.localeCompare(b.kpi) ||
        a.driver.localeCompare(b.driver),
    );

    return {
      categoryRows: categories,
      driverRows: drivers,
      rawRows: rawDataPoints,
    };
  }, [kpiResults]);

  /* ---- radar chart data ---- */

  const radarData = useMemo((): RadarDataPoint[] => {
    const avg = payload?.kpiAverages;
    return categoryRows.map((row) => ({
      category: row.category,
      company: row.score ?? 0,
      top5Average: avg?.top5Average[row.category] ?? 0,
      reportAverage: avg?.reportAverage[row.category] ?? 0,
    }));
  }, [categoryRows, payload?.kpiAverages]);

  /* ---- resizable table columns ---- */

  const categoryColsDef = useMemo(
    (): TableColumnsType<CategoryRow> => [
      {
        title: "Category",
        dataIndex: "category",
        width: 200,
        render: (v: string) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "Score",
        dataIndex: "scoreLabel",
        width: 100,
        render: (v: string) => (
          <Text style={{ color: "#d9d9d9" }}>{v}</Text>
        ),
      },
      {
        title: "Reasoning",
        dataIndex: "reasoning",
        width: 600,
        render: (v: string | null) => <MarkdownCell>{v}</MarkdownCell>,
      },
    ],
    [],
  );

  const driverColsDef = useMemo(
    (): TableColumnsType<DriverRow> => [
      {
        title: "Category",
        dataIndex: "category",
        width: 140,
        render: (v: string) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "KPI",
        dataIndex: "kpi",
        width: 200,
        render: (v: string) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "Driver",
        dataIndex: "driver",
        width: 220,
        render: (v: string) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "Score",
        dataIndex: "scoreLabel",
        width: 90,
        render: (v: string) => (
          <Text style={{ color: "#d9d9d9" }}>{v}</Text>
        ),
      },
      {
        title: "Reasoning",
        dataIndex: "reasoning",
        width: 350,
        render: (v: string | null) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "Sources",
        dataIndex: "sources",
        width: 250,
        render: (v: string[]) => <SourcesCell sources={v} />,
      },
    ],
    [],
  );

  const rawColsDef = useMemo(
    (): TableColumnsType<RawDataPointRow> => [
      {
        title: "Question",
        dataIndex: "question",
        width: 300,
        render: (v: string) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "Answer",
        dataIndex: "answer",
        width: 200,
        render: (v: string) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "Explanation",
        dataIndex: "explanation",
        width: 400,
        render: (v: string | null) => <MarkdownCell>{v}</MarkdownCell>,
      },
      {
        title: "Sources",
        dataIndex: "sources",
        width: 250,
        render: (v: string[]) => <SourcesCell sources={v} />,
      },
    ],
    [],
  );

  const categoryCols = useResizableColumns(categoryColsDef);
  const driverCols = useResizableColumns(driverColsDef);
  const rawCols = useResizableColumns(rawColsDef);

  const tableComponents = useMemo(
    () => ({ header: { cell: ResizableTitle } }),
    [],
  );

  /* ─────────────── render ─────────────── */

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: "#141414" }}>
        <Content
          style={{ padding: "24px", background: "#141414", minHeight: "100vh" }}
        >
          <div style={{ maxWidth: "1400px", width: "100%" }}>
            {/* ── header ── */}
            <div style={{ marginBottom: 24 }}>
              <Space direction="vertical" size={4}>
                <Space align="center" size="middle">
                  <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                    {payload?.company.name || `Company #${companyId}`}
                  </Title>
                  {companyStatus && (
                    <DeepDiveStatusTag status={companyStatus} />
                  )}
                </Space>
                <Space size="middle" wrap>
                  <Text style={{ color: "#8c8c8c" }}>
                    Deep Dive #{reportId}
                  </Text>
                  <Text style={{ color: "#8c8c8c" }}>
                    Country:{" "}
                    <Text style={{ color: "#d9d9d9" }}>
                      {payload?.company.countryCode || "—"}
                    </Text>
                  </Text>
                  {payload?.company.url && (
                    <Text style={{ color: "#8c8c8c" }}>
                      Website:{" "}
                      <Text style={{ color: "#d9d9d9" }}>
                        {payload.company.url}
                      </Text>
                    </Text>
                  )}
                </Space>
              </Space>
            </div>

            {/* ── stat cards ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} md={8}>
                <Card
                  style={{
                    background: "#1f1f1f",
                    border: "1px solid #303030",
                  }}
                >
                  <Text style={{ color: "#8c8c8c" }}>Total sources</Text>
                  <Title level={3} style={{ margin: 0, color: "#fff" }}>
                    {sourcesTotal}
                  </Title>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card
                  style={{
                    background: "#1f1f1f",
                    border: "1px solid #303030",
                  }}
                >
                  <Text style={{ color: "#8c8c8c" }}>Scrape candidates</Text>
                  <Title level={3} style={{ margin: 0, color: "#fff" }}>
                    {scrapCandidatesTotal}
                  </Title>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card
                  style={{
                    background: "#1f1f1f",
                    border: "1px solid #303030",
                  }}
                >
                  <Text style={{ color: "#8c8c8c" }}>Company progress</Text>
                  <Progress
                    percent={progress.percent}
                    strokeColor="#58bfce"
                    trailColor="#262626"
                  />
                  <Text style={{ color: "#8c8c8c" }}>
                    {progress.total
                      ? `${progress.done}/${progress.total} steps done`
                      : "No steps yet"}
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* ── radar chart ── */}
            <Card
              title="KPI Radar — Company vs Top-5 vs Report Average"
              style={{
                background: "#1f1f1f",
                border: "1px solid #303030",
                marginBottom: 24,
              }}
              styles={{ header: { borderBottom: "1px solid #303030" } }}
            >
              {radarData.length ? (
                <div style={{ height: 480 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={radarData}
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                    >
                      <PolarGrid stroke="#303030" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fill: "#d9d9d9", fontSize: 13 }}
                      />
                      <PolarRadiusAxis
                        domain={SCORE_DOMAIN}
                        tick={{ fill: "#8c8c8c", fontSize: 11 }}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1f1f1f",
                          border: "1px solid #303030",
                          borderRadius: 6,
                        }}
                        labelStyle={{ color: "#d9d9d9" }}
                      />
                      <Legend />
                      <Radar
                        name={payload?.company.name ?? "Company"}
                        dataKey="company"
                        stroke="#58bfce"
                        fill="#58bfce"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Top-5 Average"
                        dataKey="top5Average"
                        stroke="#ffb74d"
                        fill="#ffb74d"
                        fillOpacity={0.1}
                        strokeWidth={2}
                        strokeDasharray="6 3"
                      />
                      <Radar
                        name="Report Average"
                        dataKey="reportAverage"
                        stroke="#90a4ae"
                        fill="#90a4ae"
                        fillOpacity={0.05}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty
                  description="No KPI category results yet"
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            {/* ── KPI breakdown — 3 tabs ── */}
            <Card
              title="KPI Breakdown"
              style={{
                background: "#1f1f1f",
                border: "1px solid #303030",
              }}
              styles={{ header: { borderBottom: "1px solid #303030" } }}
            >
              <Tabs
                defaultActiveKey="categories"
                items={[
                  {
                    key: "categories",
                    label: `Categories (${categoryRows.length})`,
                    children: (
                      <Table
                        dataSource={categoryRows}
                        rowKey="key"
                        loading={isLoading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 900 }}
                        components={tableComponents}
                        columns={categoryCols}
                        bordered
                      />
                    ),
                  },
                  {
                    key: "drivers",
                    label: `Drivers (${driverRows.length})`,
                    children: (
                      <Table
                        dataSource={driverRows}
                        rowKey="key"
                        loading={isLoading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 1250 }}
                        components={tableComponents}
                        columns={driverCols}
                        bordered
                      />
                    ),
                  },
                  {
                    key: "raw",
                    label: `Raw Data Points (${rawRows.length})`,
                    children: rawRows.length ? (
                      <Table
                        dataSource={rawRows}
                        rowKey="key"
                        loading={isLoading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 1150 }}
                        components={tableComponents}
                        columns={rawCols}
                        bordered
                      />
                    ) : (
                      <Empty description="No raw data points for this company" />
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
