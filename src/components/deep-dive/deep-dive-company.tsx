'use client';

import {
  Badge,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Layout,
  Row,
  Col,
  Select,
  Space,
  Steps,
  Table,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import Sidebar from "../ui/sidebar";
import {
  DeepDiveCompanyResponse,
  DeepDiveStatus,
  useGetDeepDiveCompany,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveStatusTag from "./status-tag";

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface SourceFilterValues {
  tier?: number;
  isVectorized?: boolean;
  dateRange?: [Dayjs, Dayjs];
  metaKey?: string;
  metaValue?: string;
  metaGroupBy?: string;
}

const STEP_STATUS: Record<DeepDiveStatus, "finish" | "process" | "wait" | "error"> = {
  DONE: "finish",
  PROCESSING: "process",
  PENDING: "wait",
  ERROR: "error",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function DeepDiveCompany({ reportId, companyId }: { reportId: number; companyId: number }) {
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    sourcesLimit: 50,
    sourcesOffset: 0,
    tier: undefined as number | undefined,
    isVectorized: undefined as boolean | undefined,
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined,
    metaKey: "",
    metaValue: "",
    metaGroupBy: "",
  });

  const { data, isLoading } = useGetDeepDiveCompany(reportId, companyId, {
    sourcesLimit: filters.sourcesLimit,
    sourcesOffset: filters.sourcesOffset,
    tier: filters.tier,
    isVectorized: filters.isVectorized,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    metaKey: filters.metaKey || undefined,
    metaValue: filters.metaValue || undefined,
    metaGroupBy: filters.metaGroupBy || undefined,
  });

  const payload = data?.data;
  const steps = payload?.steps ?? [];
  const kpiResults = payload?.kpiResults ?? [];
  const scrapCandidates = payload?.scrapCandidates ?? [];
  const sources = payload?.sources;

  const stepItems = useMemo(
    () =>
      steps
        .sort((a, b) => a.order - b.order)
        .map((step) => ({
          title: step.definition.name,
          description: (
            <Space direction="vertical" size={2}>
              <DeepDiveStatusTag status={step.status} />
              <Text style={{ color: "#8c8c8c" }}>{formatDate(step.updatedAt)}</Text>
            </Space>
          ),
          status: STEP_STATUS[step.status],
        })),
    [steps]
  );

  const handleFilterChange = (values: SourceFilterValues) => {
    setFilters((prev) => ({
      ...prev,
      sourcesOffset: 0,
      tier: values.tier ?? undefined,
      isVectorized: values.isVectorized ?? undefined,
      metaKey: values.metaKey ?? "",
      metaValue: values.metaValue ?? "",
      metaGroupBy: values.metaGroupBy ?? "",
      dateFrom: values.dateRange?.[0]?.toISOString(),
      dateTo: values.dateRange?.[1]?.toISOString(),
    }));
  };

  const handleReset = () => {
    form.resetFields();
    setFilters({
      sourcesLimit: 50,
      sourcesOffset: 0,
      tier: undefined,
      isVectorized: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      metaKey: "",
      metaValue: "",
      metaGroupBy: "",
    });
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: "#141414" }}>
        <Content
          style={{
            padding: "24px",
            background: "#141414",
            minHeight: "100vh",
          }}
        >
          <div style={{ maxWidth: "1400px", width: "100%" }}>
            <div style={{ marginBottom: "24px" }}>
              <Space direction="vertical" size={4}>
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  {payload?.company.name || `Company #${companyId}`}
                </Title>
                <Text style={{ color: "#8c8c8c" }}>
                  Deep Dive #{reportId} · {payload?.company.countryCode || "—"}
                </Text>
              </Space>
            </div>

            <Card
              title="Step Status"
              style={{
                background: "#1f1f1f",
                border: "1px solid #303030",
                marginBottom: "16px",
              }}
              styles={{ header: { borderBottom: "1px solid #303030" } }}
            >
              {stepItems.length ? (
                <Steps direction="vertical" items={stepItems} />
              ) : (
                <Empty description="No steps" />
              )}
            </Card>

            <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
              <Col xs={24} md={12}>
                <Card
                  title="KPI Results"
                  style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                  styles={{ header: { borderBottom: "1px solid #303030" } }}
                >
                  <Table
                    dataSource={kpiResults}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: "KPI",
                        dataIndex: "name",
                        render: (value: string | null, record: DeepDiveCompanyResponse["data"]["kpiResults"][number]) => (
                          <Space direction="vertical" size={0}>
                            <Text style={{ color: "#fff", fontWeight: 600 }}>{value || record.dataPointId}</Text>
                            <Text style={{ color: "#8c8c8c" }}>{record.type || "—"}</Text>
                          </Space>
                        ),
                      },
                      {
                        title: "Value",
                        dataIndex: "value",
                        render: (value: string | null) => value || "—",
                      },
                      {
                        title: "Manual",
                        dataIndex: "manualValue",
                        render: (value: string | null) => value || "—",
                      },
                      {
                        title: "Updated",
                        dataIndex: "updatedAt",
                        render: (value: string | null) => formatDate(value),
                      },
                    ]}
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card
                  title="Scrap Candidates"
                  style={{ background: "#1f1f1f", border: "1px solid #303030" }}
                  styles={{ header: { borderBottom: "1px solid #303030" } }}
                >
                  <Table
                    dataSource={scrapCandidates}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: "URL",
                        dataIndex: "url",
                        render: (value: string, record: DeepDiveCompanyResponse["data"]["scrapCandidates"][number]) => (
                          <Space direction="vertical" size={2}>
                            <Text style={{ color: "#58bfce" }}>{value}</Text>
                            <Text style={{ color: "#8c8c8c" }}>{record.title || "—"}</Text>
                          </Space>
                        ),
                      },
                      {
                        title: "Status",
                        dataIndex: "status",
                        render: (value: string) => <Badge color="#58bfce" text={value} />,
                      },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title="Sources"
              style={{ background: "#1f1f1f", border: "1px solid #303030" }}
              styles={{ header: { borderBottom: "1px solid #303030" } }}
            >
              <Form
                form={form}
                layout="inline"
                onValuesChange={(_, values) => handleFilterChange(values)}
                initialValues={{
                  tier: filters.tier,
                  isVectorized: filters.isVectorized,
                  metaKey: filters.metaKey,
                  metaValue: filters.metaValue,
                  metaGroupBy: filters.metaGroupBy,
                }}
                style={{ marginBottom: "16px", rowGap: 8 }}
              >
                <Form.Item name="tier" label="Tier">
                  <Select
                    allowClear
                    placeholder="All"
                    style={{ width: 120 }}
                    options={[
                      { label: "1", value: 1 },
                      { label: "2", value: 2 },
                      { label: "3", value: 3 },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="isVectorized" label="Vectorized">
                  <Select
                    allowClear
                    placeholder="All"
                    style={{ width: 140 }}
                    options={[
                      { label: "Yes", value: true },
                      { label: "No", value: false },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="dateRange" label="Date">
                  <RangePicker style={{ width: 240 }} />
                </Form.Item>
                <Form.Item name="metaKey" label="Meta key">
                  <Input placeholder="metadata key" style={{ width: 160 }} />
                </Form.Item>
                <Form.Item name="metaValue" label="Meta value">
                  <Input placeholder="value" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="metaGroupBy" label="Group by">
                  <Input placeholder="metadata key" style={{ width: 160 }} />
                </Form.Item>
                <Form.Item>
                  <Button onClick={handleReset}>Reset</Button>
                </Form.Item>
              </Form>

              <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
                <Col xs={24} md={6}>
                  <Card style={{ background: "#111", border: "1px solid #303030" }}>
                    <Text style={{ color: "#8c8c8c" }}>Total sources</Text>
                    <Title level={3} style={{ margin: 0, color: "#fff" }}>
                      {sources?.total ?? 0}
                    </Title>
                  </Card>
                </Col>
                <Col xs={24} md={9}>
                  <Card style={{ background: "#111", border: "1px solid #303030" }}>
                    <Text style={{ color: "#8c8c8c" }}>By tier</Text>
                    <Space direction="vertical" size={4}>
                      {(sources?.byTier ?? []).map((row) => (
                        <Badge key={String(row.tier)} color="#58bfce" text={`Tier ${row.tier ?? "—"}: ${row.count}`} />
                      ))}
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={9}>
                  <Card style={{ background: "#111", border: "1px solid #303030" }}>
                    <Text style={{ color: "#8c8c8c" }}>Vectorized</Text>
                    <Space direction="vertical" size={4}>
                      {(sources?.byVectorized ?? []).map((row) => (
                        <Badge
                          key={String(row.isVectorized)}
                          color="#58bfce"
                          text={`${row.isVectorized ? "Yes" : "No"}: ${row.count}`}
                        />
                      ))}
                    </Space>
                  </Card>
                </Col>
              </Row>

              {sources?.metadataGroups?.length ? (
                <Card
                  style={{
                    background: "#111",
                    border: "1px solid #303030",
                    marginBottom: "16px",
                  }}
                >
                  <Text style={{ color: "#8c8c8c" }}>Metadata groups</Text>
                  <Space direction="vertical" size={4}>
                    {sources.metadataGroups.map((row) => (
                      <Badge
                        key={`${row.value}-${row.count}`}
                        color="#58bfce"
                        text={`${row.value ?? "(null)"}: ${row.count}`}
                      />
                    ))}
                  </Space>
                </Card>
              ) : null}

              <Table
                dataSource={sources?.items ?? []}
                rowKey="id"
                loading={isLoading}
                pagination={{
                  current: (filters.sourcesOffset || 0) / (filters.sourcesLimit || 50) + 1,
                  pageSize: filters.sourcesLimit,
                  total: sources?.total ?? 0,
                  showSizeChanger: true,
                  onChange: (nextPage, nextSize) => {
                    setFilters((prev) => ({
                      ...prev,
                      sourcesLimit: nextSize ?? prev.sourcesLimit,
                      sourcesOffset: (nextPage - 1) * (nextSize ?? prev.sourcesLimit),
                    }));
                  },
                }}
                columns={[
                  {
                    title: "Source",
                    dataIndex: "url",
                    render: (value: string, record: DeepDiveCompanyResponse["data"]["sources"]["items"][number]) => (
                      <Space direction="vertical" size={2}>
                        <Text style={{ color: "#58bfce" }}>{value}</Text>
                        <Text style={{ color: "#8c8c8c" }}>{record.title || "—"}</Text>
                      </Space>
                    ),
                  },
                  {
                    title: "Tier",
                    dataIndex: "tier",
                    width: 80,
                  },
                  {
                    title: "Date",
                    dataIndex: "date",
                    width: 140,
                    render: (value: string | null) => (value ? value.split("T")[0] : "—"),
                  },
                  {
                    title: "Vectorized",
                    dataIndex: "isVectorized",
                    width: 110,
                    render: (value: boolean | null) => (value ? "Yes" : "No"),
                  },
                  {
                    title: "Summary",
                    dataIndex: "summary",
                    render: (value: string | null) => value || "—",
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
