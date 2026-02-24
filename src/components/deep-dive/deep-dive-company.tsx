"use client";

import type { TableColumnsType } from "antd";
import { Card, Col, Empty, Input, Progress, Row, Space, Table, Tabs, Tag, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  BAR_PRIMARY_COLOR,
  CHART_AXIS_MUTED_TICK_STYLE,
  CHART_AXIS_TICK_STYLE,
  CHART_GRID_STROKE,
  DARK_CARD_HEADER_STYLE,
  DARK_CARD_STYLE,
} from "../../config/chart-theme";
import {
  DeepDiveCompanyResponse, DeepDiveStatus, useGetDeepDiveCompany,
} from "../../hooks/api/useDeepDiveService";
import { ChartLegend, ChartTooltip } from "../charts/recharts-theme";
import { useResizableColumns, RESIZABLE_TABLE_COMPONENTS } from "./shared/resizable-table";
import { MarkdownCell, SourcesCell } from "./shared/markdown-cell";
import DeepDivePageLayout from "./shared/page-layout";
import PageHeader from "./shared/page-header";
import StatCard from "./shared/stat-card";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

const SCORE_DOMAIN: [number, number] = [0, 5];

/* ─────────────── types ─────────────── */

type DataRecord = Record<string, unknown>;

type CategoryRow = {
  key: number; dataPointId: string; category: string; score: number | null;
  scoreLabel: string; reasoning: string | null;
};

type DriverRow = {
  key: number; dataPointId: string; category: string; kpi: string; driver: string;
  score: number | null; scoreLabel: string; reasoning: string | null; sources: string[];
};

type RawDataPointRow = {
  key: number; question: string; answer: string;
  explanation: string | null; sources: string[];
};

type RadarDataPoint = {
  category: string; company: number; top5Average: number; reportAverage: number;
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
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    const matches = value.match(/https?:\/\/[^\s,]+/g);
    if (matches?.length) return Array.from(new Set(matches));
    return value.split(/\s*,\s*/).map((item) => item.trim()).filter(Boolean);
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

/* ─────────────── main component ─────────────── */

export default function DeepDiveCompany({
  reportId,
  companyId,
}: {
  reportId: number;
  companyId: number;
}) {
  const sourceParams = useMemo(() => ({ sourcesLimit: 50, sourcesOffset: 0 }), []);
  const { data, isLoading } = useGetDeepDiveCompany(reportId, companyId, sourceParams);
  const payload = data?.data;

  const steps = payload?.steps ?? [];
  const kpiResults = payload?.kpiResults ?? [];
  const sourcesTotal = payload?.sources?.total ?? 0;
  const scrapCandidatesTotal = payload?.scrapCandidatesTotal ?? payload?.scrapCandidates.length ?? 0;

  const progress = useMemo(() => {
    if (!steps.length) return { done: 0, total: 0, percent: 0 };
    const done = steps.filter((s) => s.status === "DONE").length;
    return { done, total: steps.length, percent: Math.round((done / steps.length) * 100) };
  }, [steps]);

  const companyStatus = useMemo(() => deriveCompanyStatus(steps), [steps]);

  /* ── parse KPI results ── */
  const { categoryRows, driverRows, rawRows } = useMemo(() => {
    const categories: CategoryRow[] = [];
    const drivers: DriverRow[] = [];
    const rawDataPoints: RawDataPointRow[] = [];

    for (const result of kpiResults) {
      const dr = toDataRecord(result.data);
      const dpId = result.dataPointId ?? "";
      const type = result.type ?? "";

      const isCategory = type === "kpi_category" || dpId.startsWith("kpi_category");
      const isDriver = type === "kpi_driver" || dpId.startsWith("kpi_driver");
      const isRaw = type === "raw_data_point" || dpId.startsWith("raw_data_point");

      if (isCategory) {
        const sv = parseScore(result.value ?? dr["KPI Score"]);
        categories.push({
          key: result.id, dataPointId: dpId, category: getString(dr, "KPI Category") || result.name || result.dataPointId || "—",
          score: sv, scoreLabel: toScoreLabel(result.value ?? dr["KPI Score"], sv), reasoning: getString(dr, "Reasoning"),
        });
      } else if (isDriver) {
        const sv = parseScore(result.value ?? dr["Score"]);
        drivers.push({
          key: result.id, dataPointId: dpId, category: getString(dr, "KPI Category") || "Uncategorized",
          kpi: getString(dr, "Definition (KPI)") || getString(dr, "KPI") || "—",
          driver: getString(dr, "Metric (KPI Driver)") || getString(dr, "KPI Driver") || result.name || result.dataPointId || "—",
          score: sv, scoreLabel: toScoreLabel(result.value ?? dr["Score"], sv),
          reasoning: getString(dr, "Reasoning"), sources: normalizeSources(dr["Sources"] ?? dr["sources"]),
        });
      } else if (isRaw) {
        rawDataPoints.push({
          key: result.id, question: getString(dr, "raw_data_point") || result.name || result.dataPointId || "—",
          answer: getString(dr, "answer") || (typeof result.value === "string" ? result.value : "—"),
          explanation: getString(dr, "explanation") || getString(dr, "Reasoning"),
          sources: normalizeSources(dr["sources"] ?? dr["Sources"]),
        });
      }
    }

    categories.sort((a, b) => a.category.localeCompare(b.category));
    drivers.sort((a, b) => a.category.localeCompare(b.category) || a.kpi.localeCompare(b.kpi) || a.driver.localeCompare(b.driver));
    return { categoryRows: categories, driverRows: drivers, rawRows: rawDataPoints };
  }, [kpiResults]);

  /* ── radar chart data ── */
  const radarData = useMemo((): RadarDataPoint[] => {
    const avg = payload?.kpiAverages;
    return categoryRows.map((row) => ({
      category: row.category, company: row.score ?? 0,
      top5Average: avg?.top5Average[row.category] ?? 0, reportAverage: avg?.reportAverage[row.category] ?? 0,
    }));
  }, [categoryRows, payload?.kpiAverages]);

  /* ── search filters ── */
  const [categorySearch, setCategorySearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");

  const matchesSearch = useCallback((search: string, ...fields: (string | null | undefined)[]) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return fields.some((f) => f?.toLowerCase().includes(term));
  }, []);

  const filteredCategoryRows = useMemo(
    () => categorySearch
      ? categoryRows.filter((r) => matchesSearch(categorySearch, r.dataPointId, r.category, r.reasoning, r.scoreLabel))
      : categoryRows,
    [categoryRows, categorySearch, matchesSearch],
  );

  const filteredDriverRows = useMemo(
    () => driverSearch
      ? driverRows.filter((r) => matchesSearch(driverSearch, r.dataPointId, r.category, r.kpi, r.driver, r.reasoning, r.scoreLabel))
      : driverRows,
    [driverRows, driverSearch, matchesSearch],
  );

  /* ── table columns ── */
  const categoryColsDef = useMemo((): TableColumnsType<CategoryRow> => [
    { title: "ID", dataIndex: "dataPointId", width: 160, render: (v: string) => <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 11 }}>{v}</Tag> },
    { title: "Category", dataIndex: "category", width: 200, sorter: (a: CategoryRow, b: CategoryRow) => a.category.localeCompare(b.category), render: (v: string) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "Score", dataIndex: "scoreLabel", width: 100, sorter: (a: CategoryRow, b: CategoryRow) => (a.score ?? -1) - (b.score ?? -1), render: (v: string) => <Text style={{ color: "#d9d9d9" }}>{v}</Text> },
    { title: "Reasoning", dataIndex: "reasoning", width: 600, render: (v: string | null) => <MarkdownCell extended>{v}</MarkdownCell> },
  ], []);

  const driverColsDef = useMemo((): TableColumnsType<DriverRow> => [
    { title: "ID", dataIndex: "dataPointId", width: 160, render: (v: string) => <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 11 }}>{v}</Tag> },
    { title: "Category", dataIndex: "category", width: 140, sorter: (a: DriverRow, b: DriverRow) => a.category.localeCompare(b.category), render: (v: string) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "KPI", dataIndex: "kpi", width: 200, render: (v: string) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "Driver", dataIndex: "driver", width: 220, render: (v: string) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "Score", dataIndex: "scoreLabel", width: 90, sorter: (a: DriverRow, b: DriverRow) => (a.score ?? -1) - (b.score ?? -1), render: (v: string) => <Text style={{ color: "#d9d9d9" }}>{v}</Text> },
    { title: "Reasoning", dataIndex: "reasoning", width: 350, render: (v: string | null) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "Sources", dataIndex: "sources", width: 250, render: (v: string[]) => <SourcesCell sources={v} /> },
  ], []);

  const rawColsDef = useMemo((): TableColumnsType<RawDataPointRow> => [
    { title: "Question", dataIndex: "question", width: 300, render: (v: string) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "Answer", dataIndex: "answer", width: 200, render: (v: string) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "Explanation", dataIndex: "explanation", width: 400, render: (v: string | null) => <MarkdownCell extended>{v}</MarkdownCell> },
    { title: "Sources", dataIndex: "sources", width: 250, render: (v: string[]) => <SourcesCell sources={v} /> },
  ], []);

  const categoryCols = useResizableColumns(categoryColsDef);
  const driverCols = useResizableColumns(driverColsDef);
  const rawCols = useResizableColumns(rawColsDef);

  /* ─────────────── render ─────────────── */
  return (
    <DeepDivePageLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Deep Dives", href: "/deep-dive" },
          { label: `Report #${reportId}`, href: `/deep-dive/${reportId}` },
          { label: payload?.company.name || `Company #${companyId}` },
        ]}
        title={payload?.company.name || `Company #${companyId}`}
        extra={companyStatus && <DeepDiveStatusTag status={companyStatus} />}
      />
      <Space size="middle" wrap style={{ marginBottom: 24 }}>
        <Text style={{ color: "#8c8c8c" }}>Country: <Text style={{ color: "#d9d9d9" }}>{payload?.company.countryCode || "—"}</Text></Text>
        {payload?.company.url && <Text style={{ color: "#8c8c8c" }}>Website: <Text style={{ color: "#d9d9d9" }}>{payload.company.url}</Text></Text>}
      </Space>

      {/* ── stat cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <StatCard label="Total sources" value={sourcesTotal} href={`/deep-dive/${reportId}/companies/${companyId}/sources`} />
        </Col>
        <Col xs={24} md={8}>
          <StatCard label="Scrape candidates" value={scrapCandidatesTotal} href={`/deep-dive/${reportId}/companies/${companyId}/candidates`} />
        </Col>
        <Col xs={24} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Text style={{ color: "#8c8c8c" }}>Company progress</Text>
            <Progress percent={progress.percent} strokeColor="#58bfce" trailColor="#262626" />
            <Text style={{ color: "#8c8c8c" }}>
              {progress.total ? `${progress.done}/${progress.total} steps done` : "No steps yet"}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* ── radar chart ── */}
      <Card title="KPI Radar — Company vs Top-5 vs Report Average"
        style={{ ...DARK_CARD_STYLE, marginBottom: 24 }}
        styles={{ header: DARK_CARD_HEADER_STYLE }}>
        {radarData.length ? (
          <div style={{ height: 480 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke={CHART_GRID_STROKE} />
                <PolarAngleAxis dataKey="category" tick={{ ...CHART_AXIS_TICK_STYLE, fontSize: 13 }} />
                <PolarRadiusAxis domain={SCORE_DOMAIN} tick={CHART_AXIS_MUTED_TICK_STYLE} axisLine={false} />
                <ChartTooltip />
                <ChartLegend />
                <Radar
                  name={payload?.company.name ?? "Company"}
                  dataKey="company"
                  stroke={BAR_PRIMARY_COLOR}
                  fill={BAR_PRIMARY_COLOR}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar name="Top-5 Average" dataKey="top5Average" stroke="#ffb74d" fill="#ffb74d" fillOpacity={0.1} strokeWidth={2} strokeDasharray="6 3" />
                <Radar name="Report Average" dataKey="reportAverage" stroke="#90a4ae" fill="#90a4ae" fillOpacity={0.05} strokeWidth={2} strokeDasharray="3 3" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty description="No KPI category results yet" style={{ marginTop: 16 }} />
        )}
      </Card>

      {/* ── KPI breakdown ── */}
      <Card title="KPI Breakdown" style={DARK_CARD_STYLE} styles={{ header: DARK_CARD_HEADER_STYLE }}>
        <Tabs defaultActiveKey="categories" items={[
          {
            key: "categories", label: `Categories (${categoryRows.length})`,
            children: (
              <div>
                <Input.Search
                  placeholder="Search by ID, category, reasoning..."
                  allowClear
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  style={{ width: 360, marginBottom: 12 }}
                />
                {categorySearch && (
                  <Text style={{ color: "#8c8c8c", marginLeft: 12, fontSize: 12 }}>
                    {filteredCategoryRows.length} of {categoryRows.length}
                  </Text>
                )}
                <Table dataSource={filteredCategoryRows} rowKey="key" loading={isLoading} pagination={{ pageSize: 10 }}
                  scroll={{ x: 1060 }} components={RESIZABLE_TABLE_COMPONENTS} columns={categoryCols} bordered />
              </div>
            ),
          },
          {
            key: "drivers", label: `Drivers (${driverRows.length})`,
            children: (
              <div>
                <Input.Search
                  placeholder="Search by ID, category, KPI, driver, reasoning..."
                  allowClear
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  style={{ width: 400, marginBottom: 12 }}
                />
                {driverSearch && (
                  <Text style={{ color: "#8c8c8c", marginLeft: 12, fontSize: 12 }}>
                    {filteredDriverRows.length} of {driverRows.length}
                  </Text>
                )}
                <Table dataSource={filteredDriverRows} rowKey="key" loading={isLoading} pagination={{ pageSize: 10 }}
                  scroll={{ x: 1520 }} components={RESIZABLE_TABLE_COMPONENTS} columns={driverCols} bordered />
              </div>
            ),
          },
          {
            key: "raw", label: `Raw Data Points (${rawRows.length})`,
            children: rawRows.length ? (
              <Table dataSource={rawRows} rowKey="key" loading={isLoading} pagination={{ pageSize: 10 }}
                scroll={{ x: 1150 }} components={RESIZABLE_TABLE_COMPONENTS} columns={rawCols} bordered />
            ) : (
              <Empty description="No raw data points for this company" />
            ),
          },
        ]} />
      </Card>
    </DeepDivePageLayout>
  );
}
