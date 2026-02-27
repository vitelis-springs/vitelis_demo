"use client";

import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import {
  FileDoneOutlined,
  FileSearchOutlined,
  LinkOutlined,
  RightOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  DeepDiveStatus,
  useGetDeepDiveMetric,
} from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

export default function SummaryCards({
  reportId,
  settingsName,
}: {
  reportId: number;
  settingsName: string | null;
}) {
  const router = useRouter();
  const companiesCount = useGetDeepDiveMetric<number>(reportId, "companies-count");
  const orchestratorStatus = useGetDeepDiveMetric<DeepDiveStatus>(
    reportId,
    "orchestrator-status"
  );
  const totalSources = useGetDeepDiveMetric<number>(reportId, "total-sources");
  const usedSources = useGetDeepDiveMetric<number>(reportId, "used-sources");
  const scrapeCandidates = useGetDeepDiveMetric<number>(
    reportId,
    "total-scrape-candidates"
  );
  const totalQueries = useGetDeepDiveMetric<number>(reportId, "total-queries");

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={
                <Text style={{ color: "#8c8c8c" }}>Companies Analyzed</Text>
              }
              value={
                companiesCount.isLoading
                  ? "..."
                  : (companiesCount.data?.data.value ?? "—")
              }
              prefix={<TeamOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              ...DARK_CARD_STYLE,
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            hoverable
            onClick={() => router.push(`/deep-dive/${reportId}/steps`)}
          >
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Space style={{ width: "100%", justifyContent: "start", gap: 4 }}>
                <Text style={{ color: "#8c8c8c", fontSize: 14 }}>
                  Orchestrator Status
                </Text>
                <RightOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
              </Space>
              <Space align="center" size="small">
                <SyncOutlined style={{ color: "#58bfce" }} />
                {orchestratorStatus.isLoading ? (
                  <Text style={{ color: "#8c8c8c" }}>Loading...</Text>
                ) : orchestratorStatus.data?.data.value ? (
                  <DeepDiveStatusTag status={orchestratorStatus.data.data.value} />
                ) : (
                  <Text style={{ color: "#8c8c8c" }}>—</Text>
                )}
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              ...DARK_CARD_STYLE,
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            hoverable
            onClick={() => router.push(`/deep-dive/${reportId}/settings`)}
          >
            <Space direction="vertical" size={8}>
              <Space style={{ width: "100%", justifyContent: "start", gap: 4 }}>
                <Text style={{ color: "#8c8c8c", fontSize: 14 }}>Settings</Text>
                <RightOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
              </Space>
              <Space align="center" size="small">
                <SettingOutlined style={{ color: "#58bfce" }} />
                <Text style={{ color: "#fff", fontWeight: 600 }}>
                  {settingsName ?? "—"}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={<Text style={{ color: "#8c8c8c" }}>Total Sources</Text>}
              value={
                totalSources.isLoading ? "..." : (totalSources.data?.data.value ?? "—")
              }
              prefix={<FileSearchOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={<Text style={{ color: "#8c8c8c" }}>Used Sources</Text>}
              value={usedSources.isLoading ? "..." : (usedSources.data?.data.value ?? "—")}
              prefix={<FileDoneOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={
                <Text style={{ color: "#8c8c8c" }}>Scrape Candidates</Text>
              }
              value={
                scrapeCandidates.isLoading
                  ? "..."
                  : (scrapeCandidates.data?.data.value ?? "—")
              }
              prefix={<LinkOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{
              ...DARK_CARD_STYLE,
              display: "flex",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            hoverable
            onClick={() => router.push(`/deep-dive/${reportId}/query`)}
          >
            <Statistic
              title={
                <Space
                  style={{ width: "100%", justifyContent: "start", gap: 4 }}
                >
                  <Text style={{ color: "#8c8c8c" }}>Total Queries</Text>
                  <RightOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
                </Space>
              }
              value={
                totalQueries.isLoading ? "..." : (totalQueries.data?.data.value ?? "—")
              }
              prefix={<SearchOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
