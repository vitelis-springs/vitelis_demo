"use client";

import { App, Button, Layout, Space, Spin, Typography } from "antd";
import { FileExcelOutlined, SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useGetDeepDiveDetail, useExportReport } from "../../hooks/api/useDeepDiveService";
import DeepDiveStatusTag from "./status-tag";
import SummaryCards from "./summary-cards";
import KpiChartSection from "./kpi-chart-section";
import CompaniesTable from "./companies-table";
import DeepDiveBreadcrumbs from "./breadcrumbs";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function DeepDiveDetail({ reportId }: { reportId: number }) {
  const { message } = App.useApp();
  const { data, isLoading } = useGetDeepDiveDetail(reportId);
  const payload = data?.data;
  const router = useRouter();
  const exportReport = useExportReport(reportId);

  const allCategories = useMemo(() => payload?.categories ?? [], [payload]);
  const kpiChart = useMemo(() => payload?.kpiChart ?? [], [payload]);
  const companies = useMemo(() => payload?.companies ?? [], [payload]);

  if (isLoading || !payload) {
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
      <Content style={{ padding: 24, background: "#141414", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1400, width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={4}>
              <DeepDiveBreadcrumbs
                items={[
                  { label: "Deep Dives", href: "/deep-dive" },
                  { label: payload.report.name || `Deep Dive #${reportId}` },
                ]}
              />
              <Space align="center" size="middle">
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  {payload.report.name || `Deep Dive #${reportId}`}
                </Title>
                {payload.report.status && (
                  <DeepDiveStatusTag status={payload.report.status} />
                )}
                <Button
                  icon={<FileExcelOutlined />}
                  loading={exportReport.isPending}
                  onClick={() => {
                    exportReport.mutate(undefined, {
                      onError: () => void message.error("Failed to export report"),
                    });
                  }}
                >
                  Export Report
                </Button>
                <Button
                  icon={<SearchOutlined />}
                  onClick={() => router.push(`/deep-dive/${reportId}/try-query`)}
                >
                  Try Query
                </Button>
              </Space>
              <Text style={{ color: "#8c8c8c" }}>
                {payload.report.description || "Report overview and execution progress."}
              </Text>
              <Space size="middle" style={{ marginTop: 4 }}>
                {payload.report.useCase && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Use Case:{" "}
                    <Text style={{ color: "#d9d9d9" }}>{payload.report.useCase.name}</Text>
                  </Text>
                )}
                {payload.report.settings && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Settings:{" "}
                    <Text style={{ color: "#d9d9d9" }}>{payload.report.settings.name}</Text>
                  </Text>
                )}
              </Space>
            </Space>
          </div>

          <SummaryCards data={payload} />
          <KpiChartSection
            reportId={reportId}
            kpiChart={kpiChart}
            allCategories={allCategories}
          />
          <CompaniesTable
            reportId={reportId}
            companies={companies}
            loading={isLoading}
          />

        </div>
      </Content>
    </Layout>
  );
}
