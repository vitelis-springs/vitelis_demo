"use client";

import type { TableColumnsType } from "antd";
import {
      Card,
      Col,
      DatePicker,
      Input,
      Row,
      Select,
      Space,
      Table,
      Tag,
      Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
      Bar,
      BarChart,
      CartesianGrid,
      Cell,
      Pie,
      PieChart,
      PolarAngleAxis,
      PolarGrid,
      PolarRadiusAxis,
      Radar,
      RadarChart,
      ResponsiveContainer,
      XAxis,
      YAxis,
} from "recharts";
import {
      BAR_PRIMARY_COLOR,
      CHART_ACTIVE_BAR_STYLE,
      CHART_AXIS_HIGHLIGHT_TICK_STYLE,
      CHART_AXIS_MUTED_TICK_STYLE,
      CHART_AXIS_TICK_STYLE,
      CHART_GRID_STROKE,
      QUALITY_COLORS,
      TIER_COLORS,
      DARK_CARD_STYLE,
      getSeriesColor,
} from "../../config/chart-theme";
import {
      SourceItem,
      SourcesAnalyticsParams,
      useGetSourcesAnalytics,
} from "../../hooks/api/useDeepDiveService";
import useServerSortedTable from "../../hooks/useServerSortedTable";
import useShowingLabel from "../../hooks/useShowingLabel";
import { ChartLegend, ChartTooltip } from "../charts/recharts-theme";
import {
      useResizableColumns,
      RESIZABLE_TABLE_COMPONENTS,
} from "./shared/resizable-table";
import { MarkdownCell } from "./shared/markdown-cell";
import DeepDivePageLayout from "./shared/page-layout";
import PageHeader from "./shared/page-header";
import ChartCard from "./shared/chart-card";
import FilterBar from "./shared/filter-bar";
import StatCard from "./shared/stat-card";
import QueryIdTags from "./shared/query-id-tags";

const { Text } = Typography;
const { RangePicker } = DatePicker;

/* ─────────────── helpers ─────────────── */

type SourceRow = SourceItem & { key: number };

function extractMeta(item: SourceItem, field: string): unknown {
      if (!item.metadata) return null;
      return (item.metadata as Record<string, unknown>)[field] ?? null;
}

function extractStringArray(item: SourceItem, field: string): string[] {
      const value = extractMeta(item, field);
      return Array.isArray(value)
            ? value.filter((v): v is string => typeof v === "string")
            : [];
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
      const [isValid, setIsValid] = useState<boolean | undefined>(true);
      const [agent, setAgent] = useState<string | undefined>();
      const [category, setCategory] = useState<string | undefined>();
      const [tag, setTag] = useState<string | undefined>();
      const [dateRange, setDateRange] = useState<
            [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
      >(null);
      const [search, setSearch] = useState("");

      const {
            page,
            pageSize,
            offset,
            sortBy,
            sortOrder,
            handleTableChange,
            resetPage,
      } = useServerSortedTable({ defaultSortBy: "created_at" });

      const queryParams = useMemo(
            (): SourcesAnalyticsParams => ({
                  limit: pageSize,
                  offset,
                  tier,
                  qualityClass,
                  isValid,
                  agent,
                  category,
                  tag,
                  dateFrom: dateRange?.[0]?.toISOString(),
                  dateTo: dateRange?.[1]?.toISOString(),
                  search: search || undefined,
                  sortBy,
                  sortOrder,
            }),
            [
                  tier,
                  qualityClass,
                  isValid,
                  agent,
                  category,
                  tag,
                  dateRange,
                  search,
                  pageSize,
                  offset,
                  sortBy,
                  sortOrder,
            ],
      );

      const { data, isLoading } = useGetSourcesAnalytics(
            reportId,
            companyId,
            queryParams,
      );
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
            const total =
                  s.relevance +
                  s.authority +
                  s.freshness +
                  s.originality +
                  s.security +
                  s.extractability;
            return Math.round((total / 30) * 100);
      }, [agg?.scores]);

      const validPercent = totalFiltered > 0 ? validCount : 0;
      const vectorizedPercent =
            totalFiltered > 0
                  ? Math.round((vectorizedCount / totalFiltered) * 100)
                  : 0;
      const showingLabel = useShowingLabel(totalFiltered, totalUnfiltered);

      /* ── chart data ── */
      const radarData = useMemo(() => {
            if (!agg?.scores) return [];
            const s = agg.scores;
            return [
                  {
                        axis: "Relevance",
                        value: Math.round(s.relevance * 10) / 10,
                  },
                  {
                        axis: "Authority",
                        value: Math.round(s.authority * 10) / 10,
                  },
                  {
                        axis: "Freshness",
                        value: Math.round(s.freshness * 10) / 10,
                  },
                  {
                        axis: "Originality",
                        value: Math.round(s.originality * 10) / 10,
                  },
                  { axis: "Security", value: Math.round(s.security * 10) / 10 },
                  {
                        axis: "Extractability",
                        value: Math.round(s.extractability * 10) / 10,
                  },
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
                  goal: row.goal
                        ? row.goal.length > 50
                              ? `${row.goal.slice(0, 50)}...`
                              : row.goal
                        : `Query #${row.query_id}`,
                  count: row.count,
            }));
      }, [agg?.queryIds]);

      const agentsPieData = useMemo(
            () =>
                  (agg?.agents ?? [])
                        .slice(0, 10)
                        .map((row) => ({ name: row.value, value: row.count })),
            [agg?.agents],
      );
      const categoriesPieData = useMemo(
            () =>
                  (agg?.categories ?? [])
                        .slice(0, 10)
                        .map((row) => ({ name: row.value, value: row.count })),
            [agg?.categories],
      );

      /* ── filter options ── */
      const agentOptions = useMemo(
            () =>
                  (agg?.agents ?? []).map((a) => ({
                        label: `${a.value} (${a.count})`,
                        value: a.value,
                  })),
            [agg?.agents],
      );
      const categoryOptions = useMemo(
            () =>
                  (agg?.categories ?? []).map((c) => ({
                        label: `${c.value} (${c.count})`,
                        value: c.value,
                  })),
            [agg?.categories],
      );
      const tagOptions = useMemo(
            () =>
                  (agg?.tags ?? []).map((t) => ({
                        label: `${t.value} (${t.count})`,
                        value: t.value,
                  })),
            [agg?.tags],
      );

      /* ── table ── */
      const tableData = useMemo(
            (): SourceRow[] => items.map((item) => ({ ...item, key: item.id })),
            [items],
      );

      const colsDef = useMemo(
            (): TableColumnsType<SourceRow> => [
                  {
                        title: "Title",
                        dataIndex: "title",
                        key: "title",
                        width: 200,
                        sorter: true,
                        render: (v: string | null) => (
                              <MarkdownCell>{v}</MarkdownCell>
                        ),
                  },
                  {
                        title: "URL",
                        dataIndex: "url",
                        width: 200,
                        render: (v: string) => (
                              <a
                                    href={v}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                          color: "#58bfce",
                                          wordBreak: "break-all",
                                    }}
                              >
                                    {v.length > 60 ? `${v.slice(0, 60)}...` : v}
                              </a>
                        ),
                  },
                  {
                        title: "Tier",
                        dataIndex: "tier",
                        key: "tier",
                        width: 70,
                        sorter: true,
                        render: (v: number | null) => (
                              <Tag color={TIER_COLORS[v ?? 0]}>{v ?? "—"}</Tag>
                        ),
                  },
                  {
                        title: "Score",
                        width: 80,
                        render: (_: unknown, row: SourceRow) => {
                              const score = extractMeta(row, "total_score");
                              return (
                                    <Text style={{ color: "#d9d9d9" }}>
                                          {score != null ? `${score}/30` : "—"}
                                    </Text>
                              );
                        },
                  },
                  {
                        title: "Valid",
                        width: 80,
                        render: (_: unknown, row: SourceRow) => {
                              const valid = extractMeta(row, "isValid");
                              if (valid === true)
                                    return <Tag color="green">Yes</Tag>;
                              if (valid === false)
                                    return <Tag color="red">No</Tag>;
                              return "—";
                        },
                  },
                  {
                        title: "Query IDs",
                        width: 120,
                        render: (_: unknown, row: SourceRow) => (
                              <QueryIdTags
                                    ids={extractStringArray(row, "query_ids")}
                                    reportId={reportId}
                              />
                        ),
                  },
                  {
                        title: "Tags",
                        width: 180,
                        render: (_: unknown, row: SourceRow) => {
                              const tags = extractStringArray(row, "tags");
                              return tags.length ? (
                                    <Space size={2} wrap>
                                          {tags.map((t) => (
                                                <Tag key={t}>{t}</Tag>
                                          ))}
                                    </Space>
                              ) : (
                                    "—"
                              );
                        },
                  },
                  {
                        title: "Agents",
                        width: 150,
                        render: (_: unknown, row: SourceRow) => {
                              const agents = extractStringArray(row, "agents");
                              return agents.length ? (
                                    <Space size={2} wrap>
                                          {agents.map((a) => (
                                                <Tag key={a} color="blue">
                                                      {a}
                                                </Tag>
                                          ))}
                                    </Space>
                              ) : (
                                    "—"
                              );
                        },
                  },
                  {
                        title: "Categories",
                        width: 150,
                        render: (_: unknown, row: SourceRow) => {
                              const cats = extractStringArray(
                                    row,
                                    "categories",
                              );
                              return cats.length ? (
                                    <Space size={2} wrap>
                                          {cats.map((c) => (
                                                <Tag key={c} color="cyan">
                                                      {c}
                                                </Tag>
                                          ))}
                                    </Space>
                              ) : (
                                    "—"
                              );
                        },
                  },
                  {
                        title: "Reasoning",
                        width: 300,
                        render: (_: unknown, row: SourceRow) => (
                              <MarkdownCell>
                                    {
                                          extractMeta(row, "reasoning") as
                                                | string
                                                | null
                                    }
                              </MarkdownCell>
                        ),
                  },
                  {
                        title: "Date",
                        dataIndex: "date",
                        key: "created_at",
                        width: 110,
                        sorter: true,
                        render: (v: string | null) =>
                              v ? dayjs(v).format("YYYY-MM-DD") : "—",
                  },
            ],
            [reportId],
      );

      const columns = useResizableColumns(colsDef);

      /* ─────────────── render ─────────────── */
      return (
            <DeepDivePageLayout>
                  <PageHeader
                        breadcrumbs={[
                              { label: "Deep Dives", href: "/deep-dive" },
                              {
                                    label: `Report #${reportId}`,
                                    href: `/deep-dive/${reportId}`,
                              },
                              {
                                    label:
                                          payload?.company.name ??
                                          `Company #${companyId}`,
                                    href: `/deep-dive/${reportId}/companies/${companyId}`,
                              },
                              { label: "Sources" },
                        ]}
                        title={`Sources Analytics — ${payload?.company.name ?? `Company #${companyId}`}`}
                  />

                  {/* ── summary cards ── */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} md={6}>
                              <StatCard
                                    label="Total sources"
                                    value={totalUnfiltered}
                              />
                        </Col>
                        <Col xs={24} md={6}>
                              <StatCard
                                    label="Valid count"
                                    value={`${validPercent}/${totalUnfiltered}`}
                                    valueColor="#52c41a"
                              />
                        </Col>
                        <Col xs={24} md={6}>
                              <StatCard
                                    label="Avg quality score"
                                    value={`${avgQualityScore}%`}
                                    valueColor="#faad14"
                              />
                        </Col>
                        <Col xs={24} md={6}>
                              <StatCard
                                    label="Vectorized %"
                                    value={`${vectorizedPercent}%`}
                                    valueColor="#58bfce"
                              />
                        </Col>
                  </Row>

                  {/* ── charts ── */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} lg={12}>
                              <ChartCard
                                    title="Quality Scores Radar"
                                    isEmpty={!radarData.length}
                                    emptyText="No score data"
                              >
                                    <ResponsiveContainer
                                          width="100%"
                                          height="100%"
                                    >
                                          <RadarChart
                                                data={radarData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius="75%"
                                          >
                                                <PolarGrid
                                                      stroke={CHART_GRID_STROKE}
                                                />
                                                <PolarAngleAxis
                                                      dataKey="axis"
                                                      tick={
                                                            CHART_AXIS_TICK_STYLE
                                                      }
                                                />
                                                <PolarRadiusAxis
                                                      domain={[0, 5]}
                                                      tick={
                                                            CHART_AXIS_MUTED_TICK_STYLE
                                                      }
                                                      axisLine={false}
                                                />
                                                <ChartTooltip />
                                                <Radar
                                                      name="Avg Score"
                                                      dataKey="value"
                                                      stroke={BAR_PRIMARY_COLOR}
                                                      fill={BAR_PRIMARY_COLOR}
                                                      fillOpacity={0.3}
                                                      strokeWidth={2}
                                                />
                                          </RadarChart>
                                    </ResponsiveContainer>
                              </ChartCard>
                        </Col>
                        <Col xs={24} lg={12}>
                              <ChartCard
                                    title="Quality Class Distribution"
                                    isEmpty={!qualityPieData.length}
                                    emptyText="No quality class data"
                              >
                                    <ResponsiveContainer
                                          width="100%"
                                          height="100%"
                                    >
                                          <PieChart>
                                                <Pie
                                                      data={qualityPieData}
                                                      dataKey="value"
                                                      nameKey="name"
                                                      cx="50%"
                                                      cy="50%"
                                                      outerRadius={100}
                                                >
                                                      {qualityPieData.map(
                                                            (entry, index) => (
                                                                  <Cell
                                                                        key={
                                                                              entry.name
                                                                        }
                                                                        fill={
                                                                              QUALITY_COLORS[
                                                                                    entry
                                                                                          .name
                                                                              ] ??
                                                                              getSeriesColor(
                                                                                    entry.name,
                                                                                    index,
                                                                              )
                                                                        }
                                                                  />
                                                            ),
                                                      )}
                                                </Pie>
                                                <ChartTooltip />
                                                <ChartLegend />
                                          </PieChart>
                                    </ResponsiveContainer>
                              </ChartCard>
                        </Col>
                        <Col xs={24} lg={12}>
                              <ChartCard
                                    title="Sources by Query"
                                    isEmpty={!queryBarData.length}
                                    emptyText="No query data"
                              >
                                    <ResponsiveContainer
                                          width="100%"
                                          height="100%"
                                    >
                                          <BarChart
                                                data={queryBarData}
                                                layout="vertical"
                                                margin={{ left: 20 }}
                                          >
                                                <CartesianGrid
                                                      strokeDasharray="3 3"
                                                      stroke={CHART_GRID_STROKE}
                                                />
                                                <XAxis
                                                      type="number"
                                                      tick={
                                                            CHART_AXIS_TICK_STYLE
                                                      }
                                                />
                                                <YAxis
                                                      type="category"
                                                      dataKey="queryId"
                                                      tick={
                                                            CHART_AXIS_HIGHLIGHT_TICK_STYLE
                                                      }
                                                      width={50}
                                                />
                                                <ChartTooltip
                                                      formatter={(value) => [
                                                            value,
                                                            "Sources",
                                                      ]}
                                                      labelFormatter={(label) =>
                                                            queryBarData.find(
                                                                  (d) =>
                                                                        d.queryId ===
                                                                        String(
                                                                              label,
                                                                        ),
                                                            )?.goal ??
                                                            `Query #${label}`
                                                      }
                                                />
                                                <Bar
                                                      dataKey="count"
                                                      fill={BAR_PRIMARY_COLOR}
                                                      name="Sources"
                                                      activeBar={
                                                            CHART_ACTIVE_BAR_STYLE
                                                      }
                                                >
                                                      {queryBarData.map(
                                                            (entry) => (
                                                                  <Cell
                                                                        key={
                                                                              entry.queryId
                                                                        }
                                                                        fill={
                                                                              BAR_PRIMARY_COLOR
                                                                        }
                                                                        cursor="pointer"
                                                                        onClick={() =>
                                                                              window.open(
                                                                                    `/deep-dive/${reportId}/query?queryId=${entry.queryId}`,
                                                                                    "_self",
                                                                              )
                                                                        }
                                                                  />
                                                            ),
                                                      )}
                                                </Bar>
                                          </BarChart>
                                    </ResponsiveContainer>
                              </ChartCard>
                        </Col>
                        <Col xs={24} lg={12}>
                              <Row gutter={[16, 16]}>
                                    <Col span={12}>
                                          <ChartCard
                                                title="Agents"
                                                height={280}
                                                headerFontSize={13}
                                                isEmpty={!agentsPieData.length}
                                                emptyText="No agent data"
                                          >
                                                <ResponsiveContainer
                                                      width="100%"
                                                      height="100%"
                                                >
                                                      <PieChart>
                                                            <Pie
                                                                  data={
                                                                        agentsPieData
                                                                  }
                                                                  dataKey="value"
                                                                  nameKey="name"
                                                                  cx="50%"
                                                                  cy="50%"
                                                                  outerRadius={
                                                                        70
                                                                  }
                                                                  label={false}
                                                            >
                                                                  {agentsPieData.map(
                                                                        (
                                                                              entry,
                                                                              i,
                                                                        ) => (
                                                                              <Cell
                                                                                    key={
                                                                                          entry.name
                                                                                    }
                                                                                    fill={getSeriesColor(
                                                                                          entry.name,
                                                                                          i,
                                                                                    )}
                                                                              />
                                                                        ),
                                                                  )}
                                                            </Pie>
                                                            <ChartTooltip />
                                                            <ChartLegend
                                                                  wrapperStyle={{
                                                                        fontSize: 11,
                                                                  }}
                                                            />
                                                      </PieChart>
                                                </ResponsiveContainer>
                                          </ChartCard>
                                    </Col>
                                    <Col span={12}>
                                          <ChartCard
                                                title="Categories"
                                                height={280}
                                                headerFontSize={13}
                                                isEmpty={
                                                      !categoriesPieData.length
                                                }
                                                emptyText="No category data"
                                          >
                                                <ResponsiveContainer
                                                      width="100%"
                                                      height="100%"
                                                >
                                                      <PieChart>
                                                            <Pie
                                                                  data={
                                                                        categoriesPieData
                                                                  }
                                                                  dataKey="value"
                                                                  nameKey="name"
                                                                  cx="50%"
                                                                  cy="50%"
                                                                  outerRadius={
                                                                        70
                                                                  }
                                                                  label={false}
                                                            >
                                                                  {categoriesPieData.map(
                                                                        (
                                                                              entry,
                                                                              i,
                                                                        ) => (
                                                                              <Cell
                                                                                    key={
                                                                                          entry.name
                                                                                    }
                                                                                    fill={getSeriesColor(
                                                                                          entry.name,
                                                                                          i,
                                                                                    )}
                                                                              />
                                                                        ),
                                                                  )}
                                                            </Pie>
                                                            <ChartTooltip />
                                                            <ChartLegend
                                                                  wrapperStyle={{
                                                                        fontSize: 11,
                                                                  }}
                                                            />
                                                      </PieChart>
                                                </ResponsiveContainer>
                                          </ChartCard>
                                    </Col>
                              </Row>
                        </Col>
                  </Row>

                  {/* ── filters ── */}
                  <FilterBar showingLabel={showingLabel}>
                        <Space wrap size="middle">
                              <Select
                                    placeholder="Tier"
                                    allowClear
                                    style={{ width: 100 }}
                                    value={tier}
                                    onChange={(v) => {
                                          setTier(v);
                                          resetPage();
                                    }}
                                    options={[0, 1, 2, 3].map((t) => ({
                                          label: `Tier ${t}`,
                                          value: t,
                                    }))}
                              />
                              <Select
                                    placeholder="Quality"
                                    allowClear
                                    style={{ width: 120 }}
                                    value={qualityClass}
                                    onChange={(v) => {
                                          setQualityClass(v);
                                          resetPage();
                                    }}
                                    options={["HIGH", "MEDIUM", "LOW"].map(
                                          (q) => ({ label: q, value: q }),
                                    )}
                              />
                              <Select
                                    placeholder="Valid"
                                    allowClear
                                    style={{ width: 100 }}
                                    value={isValid}
                                    onChange={(v) => {
                                          setIsValid(v);
                                          resetPage();
                                    }}
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
                                    onChange={(v) => {
                                          setAgent(v);
                                          resetPage();
                                    }}
                                    options={agentOptions}
                              />
                              <Select
                                    placeholder="Category"
                                    allowClear
                                    showSearch
                                    style={{ width: 180 }}
                                    value={category}
                                    onChange={(v) => {
                                          setCategory(v);
                                          resetPage();
                                    }}
                                    options={categoryOptions}
                              />
                              <Select
                                    placeholder="Tag"
                                    allowClear
                                    showSearch
                                    style={{ width: 180 }}
                                    value={tag}
                                    onChange={(v) => {
                                          setTag(v);
                                          resetPage();
                                    }}
                                    options={tagOptions}
                              />
                              <RangePicker
                                    value={
                                          dateRange
                                                ? [dateRange[0], dateRange[1]]
                                                : null
                                    }
                                    onChange={(dates) => {
                                          setDateRange(
                                                dates as
                                                      | [
                                                              dayjs.Dayjs | null,
                                                              dayjs.Dayjs | null,
                                                        ]
                                                      | null,
                                          );
                                          resetPage();
                                    }}
                                    style={{ width: 260 }}
                              />
                              <Input.Search
                                    placeholder="Search title/url..."
                                    allowClear
                                    style={{ width: 220 }}
                                    onSearch={(v) => {
                                          setSearch(v);
                                          resetPage();
                                    }}
                              />
                        </Space>
                  </FilterBar>

                  {/* ── table ── */}
                  <Card style={DARK_CARD_STYLE}>
                        <Table
                              dataSource={tableData}
                              rowKey="key"
                              loading={isLoading}
                              columns={columns}
                              components={RESIZABLE_TABLE_COMPONENTS}
                              scroll={{ x: 1600 }}
                              bordered
                              onChange={handleTableChange}
                              pagination={{
                                    current: page,
                                    pageSize,
                                    total: totalFiltered,
                                    showSizeChanger: true,
                                    pageSizeOptions: ["10", "25", "50", "100"],
                              }}
                        />
                  </Card>
            </DeepDivePageLayout>
      );
}
