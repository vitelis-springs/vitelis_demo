"use client";

import {
  FileSearchOutlined,
  LinkOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DeepDiveCompanyRow,
  DeepDiveStatus,
  KpiChartItem,
  useGetDeepDiveDetail,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveStatusTag from "./status-tag";

const { Content } = Layout;
const { Title, Text } = Typography;

const CHART_PALETTE = [
  "#58bfce",
  "#7c4dff",
  "#ff9800",
  "#4caf50",
  "#f44336",
  "#e91e63",
  "#00bcd4",
  "#ffeb3b",
  "#9c27b0",
  "#8bc34a",
];

function getColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]!;
}

// --- localStorage persistence ---

interface ChartFilters {
  tab: "all" | "custom" | "top";
  selectedCompanyIds: number[];
  selectedCategories: string[];
  topN: number;
  topSortCategory: string;
}

const STORAGE_PREFIX = "dd-chart-filters-";

function loadFilters(reportId: number): ChartFilters | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${reportId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ChartFilters;
  } catch {
    return null;
  }
}

function saveFilters(reportId: number, filters: ChartFilters) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${reportId}`,
      JSON.stringify(filters),
    );
  } catch {
    /* quota exceeded — ignore */
  }
}

// --- Chart sub-component ---

function KpiStackedChart({
  data,
  categories,
}: {
  data: KpiChartItem[];
  categories: string[];
}) {
  if (data.length === 0 || categories.length === 0) {
    return <Empty description="No KPI data for selected filters" />;
  }

  const formatAxisTick = (value: any): string => {
    const words = (value as string).split(" ");
    const first = words[0];
    return `${first}`;
  };


  return (
    <div style={{ height: 620 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 30, right: 40, left: 0, bottom: 100 }}
          barGap={50}
          maxBarSize={100}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
          <XAxis
            dataKey="company"
            tickFormatter={formatAxisTick}
            stroke="#a7a3a3"
            tick={{ fill: "#a7a3a3", fontSize: 14 }}
            interval={0}
            angle={-45}
            textAnchor="start"
            dy={20}
            height={100}
            label={{
              value: "Companies",
              position: "insideBottom",
              dy: 80,
              style: { fill: "#8c8c8c" },
            }}
          />
          <YAxis
            stroke="#8c8c8c"
            tick={{ fill: "#8c8c8c" }}
            label={{
              value: "Score",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#8c8c8c" },
            }}
          />
          
          <Tooltip
            contentStyle={{
              background: "#1f1f1f",
              border: "1px solid #303030",
              borderRadius: 6,
            }}
            labelStyle={{
              // color: "#fff",
              fontWeight: 600,
            }}
            itemStyle={
              {
                //color: "#d9d9d9"
              }
            }
          />
          <Legend wrapperStyle={{ color: "#d9d9d9" }} />
          <BarStack
            radius={10}
          >
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              stackId="kpi"
              fill={getColor(index)}
              name={category}
              textAnchor="middle"
            />
          ))}
        </BarStack>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Main component ---

export default function DeepDiveDetail({ reportId }: { reportId: number }) {
  const router = useRouter();
  const { data, isLoading } = useGetDeepDiveDetail(reportId);
  const payload = data?.data;

  const allCategories = useMemo(() => payload?.categories ?? [], [payload]);
  const kpiChart = useMemo(() => payload?.kpiChart ?? [], [payload]);
  const companies = useMemo(() => payload?.companies ?? [], [payload]);

  // --- Filter state with localStorage init ---
  const [activeTab, setActiveTab] = useState<"all" | "custom" | "top">("all");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [topN, setTopN] = useState(5);
  const [topSortCategory, setTopSortCategory] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadFilters(reportId);
    if (saved) {
      setActiveTab(saved.tab);
      setSelectedCompanyIds(saved.selectedCompanyIds);
      setSelectedCategories(saved.selectedCategories);
      if (saved.topN) setTopN(saved.topN);
      if (saved.topSortCategory) setTopSortCategory(saved.topSortCategory);
    }
    setFiltersLoaded(true);
  }, [reportId]);

  // Save to localStorage on change
  const persistFilters = useCallback(
    (updates: Partial<ChartFilters>) => {
      const current: ChartFilters = {
        tab: updates.tab ?? activeTab,
        selectedCompanyIds: updates.selectedCompanyIds ?? selectedCompanyIds,
        selectedCategories: updates.selectedCategories ?? selectedCategories,
        topN: updates.topN ?? topN,
        topSortCategory: updates.topSortCategory ?? topSortCategory,
      };
      saveFilters(reportId, current);
    },
    [
      reportId,
      activeTab,
      selectedCompanyIds,
      selectedCategories,
      topN,
      topSortCategory,
    ],
  );

  // --- Filtered data ---
  const topNData = useMemo(() => {
    if (kpiChart.length === 0) return [];
    const sortKey = topSortCategory || null;
    return [...kpiChart]
      .sort((a, b) => {
        if (sortKey) {
          const aVal =
            typeof a[sortKey] === "number" ? (a[sortKey] as number) : 0;
          const bVal =
            typeof b[sortKey] === "number" ? (b[sortKey] as number) : 0;
          return bVal - aVal;
        }
        // Default: sort by sum of all categories
        const aSum = allCategories.reduce(
          (s, c) => s + (typeof a[c] === "number" ? (a[c] as number) : 0),
          0,
        );
        const bSum = allCategories.reduce(
          (s, c) => s + (typeof b[c] === "number" ? (b[c] as number) : 0),
          0,
        );
        return bSum - aSum;
      })
      .slice(0, topN);
  }, [kpiChart, allCategories, topN, topSortCategory]);

  const customData = useMemo(() => {
    if (kpiChart.length === 0) return [];
    const filtered =
      selectedCompanyIds.length > 0
        ? kpiChart.filter((item) =>
            selectedCompanyIds.includes(item.companyId as number),
          )
        : kpiChart;
    return filtered;
  }, [kpiChart, selectedCompanyIds]);

  const visibleCategories = useMemo(() => {
    if (activeTab === "all") return allCategories;
    return selectedCategories.length > 0 ? selectedCategories : allCategories;
  }, [activeTab, allCategories, selectedCategories]);

  // --- Company options for autocomplete ---
  const companyOptions = useMemo(
    () =>
      kpiChart.map((item) => ({
        label: item.company as string,
        value: item.companyId as number,
      })),
    [kpiChart],
  );

  const categoryOptions = useMemo(
    () => allCategories.map((cat) => ({ label: cat, value: cat })),
    [allCategories],
  );

  if (isLoading || !filtersLoaded) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#141414" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Content
        style={{ padding: 24, background: "#141414", minHeight: "100vh" }}
      >
        <div style={{ maxWidth: 1400, width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={4}>
              <Space align="center" size="middle">
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  {payload?.report.name || `Deep Dive #${reportId}`}
                </Title>
                {payload?.report.status && (
                  <DeepDiveStatusTag status={payload.report.status} />
                )}
              </Space>
              <Text style={{ color: "#8c8c8c" }}>
                {payload?.report.description ||
                  "Report overview and execution progress."}
              </Text>
              <Space size="middle" style={{ marginTop: 4 }}>
                {payload?.report.useCase && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Use Case:{" "}
                    <Text style={{ color: "#d9d9d9" }}>
                      {payload.report.useCase.name}
                    </Text>
                  </Text>
                )}
                {payload?.report.settings && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Settings:{" "}
                    <Text style={{ color: "#d9d9d9" }}>
                      {payload.report.settings.name}
                    </Text>
                  </Text>
                )}
              </Space>
            </Space>
          </div>

          {/* Summary Cards — Row 1 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card
                style={{ background: "#1f1f1f", border: "1px solid #303030" }}
              >
                <Statistic
                  title={
                    <Text style={{ color: "#8c8c8c" }}>Companies Analyzed</Text>
                  }
                  value={payload?.summary.companiesCount ?? 0}
                  prefix={<TeamOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card
                style={{ background: "#1f1f1f", border: "1px solid #303030" }}
              >
                <Space direction="vertical" size={8}>
                  <Text style={{ color: "#8c8c8c", fontSize: 14 }}>
                    Orchestrator Status
                  </Text>
                  <Space align="center" size="small">
                    <SyncOutlined style={{ color: "#58bfce" }} />
                    {payload?.summary.orchestratorStatus && (
                      <DeepDiveStatusTag
                        status={payload.summary.orchestratorStatus}
                      />
                    )}
                  </Space>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card
                style={{ background: "#1f1f1f", border: "1px solid #303030" }}
              >
                <Space direction="vertical" size={8}>
                  <Text style={{ color: "#8c8c8c", fontSize: 14 }}>
                    Settings
                  </Text>
                  <Space align="center" size="small">
                    <SettingOutlined style={{ color: "#58bfce" }} />
                    <Text style={{ color: "#fff", fontWeight: 600 }}>
                      {payload?.report.settings?.name ?? "—"}
                    </Text>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Summary Cards — Row 2 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <Card
                style={{ background: "#1f1f1f", border: "1px solid #303030" }}
              >
                <Statistic
                  title={
                    <Text style={{ color: "#8c8c8c" }}>Total Sources</Text>
                  }
                  value={payload?.summary.totalSources ?? 0}
                  prefix={<FileSearchOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card
                style={{ background: "#1f1f1f", border: "1px solid #303030" }}
              >
                <Statistic
                  title={
                    <Text style={{ color: "#8c8c8c" }}>Scrape Candidates</Text>
                  }
                  value={payload?.summary.totalScrapeCandidates ?? 0}
                  prefix={<LinkOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card
                style={{ background: "#1f1f1f", border: "1px solid #303030" }}
              >
                <Statistic
                  title={
                    <Text style={{ color: "#8c8c8c" }}>Total Queries</Text>
                  }
                  value={payload?.summary.totalQueries ?? 0}
                  prefix={<SearchOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
          </Row>

          {/* KPI Stacked Bar Chart with Tabs */}
          <Card
            title="KPI Scores by Company"
            style={{
              background: "#1f1f1f",
              border: "1px solid #303030",
              marginBottom: 24,
            }}
            styles={{ header: { borderBottom: "1px solid #303030" } }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                const tab = key as "all" | "custom" | "top";
                setActiveTab(tab);
                persistFilters({ tab });
              }}
              items={[
                {
                  key: "all",
                  label: "All Companies",
                  children: (
                    <KpiStackedChart
                      data={kpiChart}
                      categories={allCategories}
                    />
                  ),
                },
                {
                  key: "custom",
                  label: "Custom Filter",
                  children: (
                    <div>
                      <Space wrap style={{ marginBottom: 16 }}>
                        <Select
                          mode="multiple"
                          placeholder="Filter companies…"
                          value={selectedCompanyIds}
                          onChange={(value) => {
                            setSelectedCompanyIds(value);
                            persistFilters({ selectedCompanyIds: value });
                          }}
                          options={companyOptions}
                          style={{ minWidth: 300 }}
                          maxTagCount="responsive"
                          allowClear
                          showSearch
                          filterOption={(input, option) =>
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                        />
                        <Select
                          mode="multiple"
                          placeholder="Filter categories…"
                          value={selectedCategories}
                          onChange={(value) => {
                            setSelectedCategories(value);
                            persistFilters({ selectedCategories: value });
                          }}
                          options={categoryOptions}
                          style={{ minWidth: 250 }}
                          maxTagCount="responsive"
                          allowClear
                        />
                      </Space>
                      <KpiStackedChart
                        data={customData}
                        categories={visibleCategories}
                      />
                    </div>
                  ),
                },
                {
                  key: "top",
                  label: `Top ${topN}`,
                  children: (
                    <div>
                      <Space wrap style={{ marginBottom: 16 }}>
                        <Text style={{ color: "#8c8c8c" }}>Show top</Text>
                        <Select
                          value={topN}
                          onChange={(value) => {
                            setTopN(value);
                            persistFilters({ topN: value });
                          }}
                          options={[
                            { label: "5", value: 5 },
                            { label: "10", value: 10 },
                            { label: "15", value: 15 },
                          ]}
                          style={{ width: 70 }}
                        />
                        <Text style={{ color: "#8c8c8c" }}>sorted by</Text>
                        <Select
                          value={topSortCategory || undefined}
                          onChange={(value) => {
                            setTopSortCategory(value ?? "");
                            persistFilters({ topSortCategory: value ?? "" });
                          }}
                          placeholder="Total score"
                          options={categoryOptions}
                          style={{ minWidth: 180 }}
                          allowClear
                        />
                      </Space>
                      <KpiStackedChart
                        data={topNData}
                        categories={allCategories}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {/* Companies Table */}
          <Card
            title="Companies"
            style={{ background: "#1f1f1f", border: "1px solid #303030" }}
            styles={{ header: { borderBottom: "1px solid #303030" } }}
          >
            <Table<DeepDiveCompanyRow>
              dataSource={companies}
              rowKey="id"
              loading={isLoading}
              pagination={{ pageSize: 20 }}
              columns={[
                {
                  title: "Company",
                  dataIndex: "name",
                  render: (value: string, record) => (
                    <Space direction="vertical" size={2}>
                      <Text style={{ color: "#fff", fontWeight: 600 }}>
                        {value}
                      </Text>
                      {record.countryCode && (
                        <Text style={{ color: "#8c8c8c" }}>
                          {record.countryCode}
                        </Text>
                      )}
                    </Space>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  width: 120,
                  render: (value: DeepDiveStatus) => (
                    <DeepDiveStatusTag status={value} />
                  ),
                },
                {
                  title: "",
                  width: 120,
                  render: (_, record) => (
                    <Button
                      type="link"
                      onClick={() =>
                        router.push(
                          `/deep-dive/${reportId}/companies/${record.id}`,
                        )
                      }
                    >
                      View
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
