"use client";

import { App, Button, Layout, Space, Typography } from "antd";
import { FileExcelOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  useGetDeepDiveOverview,
  useGetDeepDiveKpiChart,
  useGetDeepDiveCompanies,
  useExportReport,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveStatusTag from "./status-tag";
import SummaryCards from "./summary-cards";
import KpiChartSection from "./kpi-chart-section";
import CompaniesTable from "./companies-table";
import DeepDiveBreadcrumbs from "./breadcrumbs";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function DeepDiveDetail({ reportId }: { reportId: number }) {
  const { message } = App.useApp();
  const { data: overviewData } = useGetDeepDiveOverview(reportId);
  const { data: kpiData, isLoading: isKpiLoading } = useGetDeepDiveKpiChart(reportId);
  const { data: companiesData, isLoading: isCompaniesLoading } =
    useGetDeepDiveCompanies(reportId);

  const report = overviewData?.data.report;
  const router = useRouter();
  const exportReport = useExportReport(reportId);

  const allCategories = useMemo(() => kpiData?.data.categories ?? [], [kpiData]);
  const kpiChart = useMemo(() => kpiData?.data.kpiChart ?? [], [kpiData]);
  const companies = useMemo(
    () => companiesData?.data.companies ?? [],
    [companiesData]
  );

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
                  { label: report?.name || `Deep Dive #${reportId}` },
                ]}
              />
              <Space align="center" size="middle">
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  {report?.name || `Deep Dive #${reportId}`}
                </Title>
                {report?.status && (
                  <DeepDiveStatusTag status={report.status} />
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
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => router.push(`/deep-dive/${reportId}/settings`)}
                >
                  Settings
                </Button>
              </Space>
              <Text style={{ color: "#8c8c8c" }}>
                {report?.description || "Report overview and execution progress."}
              </Text>
              <Space size="middle" style={{ marginTop: 4 }}>
                {report?.useCase && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Use Case:{" "}
                    <Text style={{ color: "#d9d9d9" }}>{report.useCase.name}</Text>
                  </Text>
                )}
                {report?.settings && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Settings:{" "}
                    <Text style={{ color: "#d9d9d9" }}>{report.settings.name}</Text>
                  </Text>
                )}
              </Space>
            </Space>
          </div>

          <SummaryCards reportId={reportId} settingsName={report?.settings?.name ?? null} />
          <KpiChartSection
            reportId={reportId}
            kpiChart={kpiChart}
            allCategories={allCategories}
            loading={isKpiLoading}
          />
          <CompaniesTable
            reportId={reportId}
            companies={companies}
            loading={isCompaniesLoading}
          />

        </div>
      </Content>
    </Layout>
  );
}
