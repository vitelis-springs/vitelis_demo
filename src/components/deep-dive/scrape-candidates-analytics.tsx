"use client";

import type { TableColumnsType } from "antd";
import { Card, Col, Input, Row, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PIE_COLORS, DARK_TOOLTIP_STYLE, DARK_CARD_STYLE } from "../../config/chart-theme";
import {
  ScrapeCandidateItem,
  ScrapeCandidatesParams,
  useGetScrapeCandidates,
} from "../../hooks/api/useDeepDiveService";
import useServerSortedTable from "../../hooks/useServerSortedTable";
import useShowingLabel from "../../hooks/useShowingLabel";
import { useResizableColumns, RESIZABLE_TABLE_COMPONENTS } from "./shared/resizable-table";
import DeepDivePageLayout from "./shared/page-layout";
import PageHeader from "./shared/page-header";
import ChartCard from "./shared/chart-card";
import FilterBar from "./shared/filter-bar";
import StatCard from "./shared/stat-card";
import QueryIdTags from "./shared/query-id-tags";

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: "default",
  scraped: "green",
  failed: "red",
  skipped: "orange",
};

type CandidateRow = ScrapeCandidateItem & { key: number };

export default function ScrapeCandidatesAnalytics({
  reportId,
  companyId,
}: {
  reportId: number;
  companyId: number;
}) {
  const { page, pageSize, offset, sortBy, sortOrder, handleTableChange, resetPage } =
    useServerSortedTable({ defaultSortBy: "created_at" });
  const [search, setSearch] = useState("");

  const queryParams = useMemo((): ScrapeCandidatesParams => ({
    limit: pageSize,
    offset,
    search: search || undefined,
    sortBy,
    sortOrder,
  }), [search, pageSize, offset, sortBy, sortOrder]);

  const { data, isLoading } = useGetScrapeCandidates(reportId, companyId, queryParams);
  const payload = data?.data;

  const total = payload?.total ?? 0;
  const totalFiltered = payload?.totalFiltered ?? 0;
  const agg = payload?.aggregations;
  const items = payload?.items ?? [];

  const showingLabel = useShowingLabel(totalFiltered, total);

  const tableData = useMemo((): CandidateRow[] =>
    items.map((item) => ({ ...item, key: item.id })),
    [items],
  );

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

  const colsDef = useMemo((): TableColumnsType<CandidateRow> => [
    {
      title: "URL", dataIndex: "url", key: "url", width: 300, sorter: true,
      render: (v: string) => (
        <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: "#58bfce", wordBreak: "break-all" }}>
          {v.length > 80 ? `${v.slice(0, 80)}...` : v}
        </a>
      ),
    },
    {
      title: "Title", dataIndex: "title", width: 250,
      render: (v: string | null) => <Text style={{ color: "#d9d9d9" }}>{v || "—"}</Text>,
    },
    {
      title: "Description", dataIndex: "description", width: 300,
      render: (v: string | null) => (
        <div style={{ maxHeight: 120, overflow: "auto", color: "#d9d9d9" }}>
          {v || <span style={{ color: "#595959" }}>—</span>}
        </div>
      ),
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 100, sorter: true,
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? "default"}>{v}</Tag>,
    },
    {
      title: "Query IDs", width: 120,
      render: (_: unknown, row: CandidateRow) => {
        const meta = row.metadata as Record<string, unknown> | null;
        const ids = Array.isArray(meta?.query_ids) ? (meta.query_ids as string[]) : [];
        return <QueryIdTags ids={ids} reportId={reportId} />;
      },
    },
    {
      title: "Agents", width: 150,
      render: (_: unknown, row: CandidateRow) => {
        const meta = row.metadata as Record<string, unknown> | null;
        const agents = Array.isArray(meta?.agents) ? (meta.agents as string[]) : [];
        return agents.length
          ? <Space size={2} wrap>{agents.map((a) => <Tag key={a} color="blue">{a}</Tag>)}</Space>
          : <span style={{ color: "#595959" }}>—</span>;
      },
    },
    {
      title: "Created", dataIndex: "created_at", key: "created_at", width: 140, sorter: true,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
  ], [reportId]);

  const columns = useResizableColumns(colsDef);

  return (
    <DeepDivePageLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Deep Dives", href: "/deep-dive" },
          { label: `Report #${reportId}`, href: `/deep-dive/${reportId}` },
          { label: payload?.company.name ?? `Company #${companyId}`, href: `/deep-dive/${reportId}/companies/${companyId}` },
          { label: "Candidates" },
        ]}
        title={`Scrape Candidates — ${payload?.company.name ?? `Company #${companyId}`}`}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <StatCard label="Total candidates" value={total} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <ChartCard title="Candidates by Query" isEmpty={!queryBarData.length} emptyText="No query data">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queryBarData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis type="number" tick={{ fill: "#d9d9d9" }} />
                <YAxis type="category" dataKey="queryId" tick={{ fill: "#58bfce", fontSize: 11 }} width={50} />
                <Tooltip
                  contentStyle={DARK_TOOLTIP_STYLE}
                  formatter={(value) => [value, "Candidates"]}
                  labelFormatter={(label) => {
                    const item = queryBarData.find((d) => d.queryId === String(label));
                    return item?.goal ?? `Query #${label}`;
                  }}
                />
                <Bar dataKey="count" fill="#58bfce" name="Candidates">
                  {queryBarData.map((entry) => (
                    <Cell key={entry.queryId} fill="#58bfce" cursor="pointer"
                      onClick={() => window.open(`/deep-dive/${reportId}/query?queryId=${entry.queryId}`, "_self")} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard title="Agents Distribution" isEmpty={!agentsPieData.length} emptyText="No agent data">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={agentsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {agentsPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={DARK_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      <FilterBar showingLabel={showingLabel}>
        <Space size="middle">
          <Input.Search
            placeholder="Search url/title/description..."
            allowClear
            style={{ width: 320 }}
            onSearch={(v) => { setSearch(v); resetPage(); }}
          />
        </Space>
      </FilterBar>

      <Card style={DARK_CARD_STYLE}>
        <Table
          dataSource={tableData}
          rowKey="key"
          loading={isLoading}
          columns={columns}
          components={RESIZABLE_TABLE_COMPONENTS}
          scroll={{ x: 1400 }}
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
