"use client";

import { Card, Select, Skeleton, Space, Tabs, Typography } from "antd";
import { KpiChartItem } from "../../hooks/api/useDeepDiveService";
import { useChartFilters } from "./use-chart-filters";
import KpiStackedChart from "./kpi-stacked-chart";

const { Text } = Typography;

export default function KpiChartSection({
  reportId,
  kpiChart,
  allCategories,
  loading,
}: {
  reportId: number;
  kpiChart: KpiChartItem[];
  allCategories: string[];
  loading: boolean;
}) {
  const f = useChartFilters(reportId, kpiChart, allCategories);

  if (loading) {
    return (
      <Card
        title="KPI Scores by Company"
        style={{
          background: "#1f1f1f",
          border: "1px solid #303030",
          marginBottom: 24,
        }}
        styles={{ header: { borderBottom: "1px solid #303030" } }}
      >
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  if (!f.ready) return null;

  return (
    <Card
      title="KPI Scores by Company"
      style={{ background: "#1f1f1f", border: "1px solid #303030", marginBottom: 24 }}
      styles={{ header: { borderBottom: "1px solid #303030" } }}
    >
      <Tabs
        activeKey={f.activeTab}
        onChange={(key) => {
          const tab = key as typeof f.activeTab;
          f.setActiveTab(tab);
          f.persist({ tab });
        }}
        items={[
          {
            key: "all",
            label: "All Companies",
            children: <KpiStackedChart data={kpiChart} categories={allCategories} />,
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
                    value={f.selectedCompanyIds}
                    onChange={(v) => { f.setSelectedCompanyIds(v); f.persist({ selectedCompanyIds: v }); }}
                    options={f.companyOptions}
                    style={{ minWidth: 300 }}
                    maxTagCount="responsive"
                    allowClear
                    showSearch
                    filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                  <Select
                    mode="multiple"
                    placeholder="Filter categories…"
                    value={f.selectedCategories}
                    onChange={(v) => { f.setSelectedCategories(v); f.persist({ selectedCategories: v }); }}
                    options={f.categoryOptions}
                    style={{ minWidth: 250 }}
                    maxTagCount="responsive"
                    allowClear
                  />
                </Space>
                <KpiStackedChart data={f.customData} categories={f.visibleCategories} />
              </div>
            ),
          },
          {
            key: "top",
            label: `Top ${f.topN}`,
            children: (
              <div>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Text style={{ color: "#8c8c8c" }}>Show top</Text>
                  <Select
                    value={f.topN}
                    onChange={(v) => { f.setTopN(v); f.persist({ topN: v }); }}
                    options={[{ label: "5", value: 5 }, { label: "10", value: 10 }, { label: "15", value: 15 }]}
                    style={{ width: 70 }}
                  />
                  <Text style={{ color: "#8c8c8c" }}>sorted by</Text>
                  <Select
                    value={f.topSortCategory || undefined}
                    onChange={(v) => { f.setTopSortCategory(v ?? ""); f.persist({ topSortCategory: v ?? "" }); }}
                    placeholder="Total score"
                    options={f.categoryOptions}
                    style={{ minWidth: 180 }}
                    allowClear
                  />
                </Space>
                <KpiStackedChart data={f.topNData} categories={allCategories} />
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
