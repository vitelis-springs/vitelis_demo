'use client';

import {
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import {
  TeamOutlined,
  SyncOutlined,
  FileSearchOutlined,
  LinkOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  DeepDiveCompanyRow,
  DeepDiveStatus,
  useGetDeepDiveDetail,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveStatusTag from "./status-tag";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

export default function DeepDiveDetail({ reportId }: { reportId: number }) {
  const router = useRouter();
  const { data, isLoading } = useGetDeepDiveDetail(reportId);
  const payload = data?.data;

  const categories = useMemo(() => payload?.categories ?? [], [payload]);
  const kpiChart = useMemo(() => payload?.kpiChart ?? [], [payload]);
  const companies = useMemo(() => payload?.companies ?? [], [payload]);

  if (isLoading) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#141414" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
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
              <Space align="center" size="middle">
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  {payload?.report.name || `Deep Dive #${reportId}`}
                </Title>
                {payload?.report.status && (
                  <DeepDiveStatusTag status={payload.report.status} />
                )}
              </Space>
              <Text style={{ color: "#8c8c8c" }}>
                {payload?.report.description || "Report overview and execution progress."}
              </Text>
              <Space size="middle" style={{ marginTop: 4 }}>
                {payload?.report.useCase && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Use Case: <Text style={{ color: "#d9d9d9" }}>{payload.report.useCase.name}</Text>
                  </Text>
                )}
                {payload?.report.settings && (
                  <Text style={{ color: "#8c8c8c" }}>
                    Settings: <Text style={{ color: "#d9d9d9" }}>{payload.report.settings.name}</Text>
                  </Text>
                )}
              </Space>
            </Space>
          </div>

          {/* Summary Cards — Row 1 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                <Statistic
                  title={<Text style={{ color: "#8c8c8c" }}>Companies Analyzed</Text>}
                  value={payload?.summary.companiesCount ?? 0}
                  prefix={<TeamOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                <Space direction="vertical" size={8}>
                  <Text style={{ color: "#8c8c8c", fontSize: 14 }}>Orchestrator Status</Text>
                  <Space align="center" size="small">
                    <SyncOutlined style={{ color: "#58bfce" }} />
                    {payload?.summary.orchestratorStatus && (
                      <DeepDiveStatusTag status={payload.summary.orchestratorStatus} />
                    )}
                  </Space>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                <Space direction="vertical" size={8}>
                  <Text style={{ color: "#8c8c8c", fontSize: 14 }}>Settings</Text>
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
              <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                <Statistic
                  title={<Text style={{ color: "#8c8c8c" }}>Total Sources</Text>}
                  value={payload?.summary.totalSources ?? 0}
                  prefix={<FileSearchOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                <Statistic
                  title={<Text style={{ color: "#8c8c8c" }}>Scrape Candidates</Text>}
                  value={payload?.summary.totalScrapeCandidates ?? 0}
                  prefix={<LinkOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
                <Statistic
                  title={<Text style={{ color: "#8c8c8c" }}>Total Queries</Text>}
                  value={payload?.summary.totalQueries ?? 0}
                  prefix={<SearchOutlined style={{ color: "#58bfce" }} />}
                  valueStyle={{ color: "#fff" }}
                />
              </Card>
            </Col>
          </Row>

          {/* KPI Stacked Bar Chart */}
          <Card
            title="KPI Scores by Company"
            style={{ background: "#1f1f1f", border: "1px solid #303030", marginBottom: 24 }}
            styles={{ header: { borderBottom: "1px solid #303030" } }}
          >
            {kpiChart.length > 0 && categories.length > 0 ? (
              <div style={{ height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kpiChart} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                    <XAxis
                      dataKey="company"
                      stroke="#8c8c8c"
                      tick={{ fill: "#8c8c8c", fontSize: 12 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={80}
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
                      labelStyle={{ color: "#fff", fontWeight: 600 }}
                      itemStyle={{ color: "#d9d9d9" }}
                    />
                    <Legend wrapperStyle={{ color: "#d9d9d9" }} />
                    {categories.map((category, index) => (
                      <Bar
                        key={category}
                        dataKey={category}
                        stackId="kpi"
                        fill={getColor(index)}
                        name={category}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="No KPI data available" />
            )}
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
                      <Text style={{ color: "#fff", fontWeight: 600 }}>{value}</Text>
                      {record.countryCode && (
                        <Text style={{ color: "#8c8c8c" }}>{record.countryCode}</Text>
                      )}
                    </Space>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  width: 120,
                  render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
                },
                {
                  title: "",
                  width: 120,
                  render: (_, record) => (
                    <Button
                      type="link"
                      onClick={() => router.push(`/deep-dive/${reportId}/companies/${record.id}`)}
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
