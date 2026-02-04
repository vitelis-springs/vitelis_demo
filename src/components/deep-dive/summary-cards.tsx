"use client";

import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import {
  FileSearchOutlined,
  LinkOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { DeepDiveDetailResponse } from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

export default function SummaryCards({ data }: { data: DeepDiveDetailResponse["data"] }) {
  const { summary, report } = data;

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={<Text style={{ color: "#8c8c8c" }}>Companies Analyzed</Text>}
              value={summary.companiesCount}
              prefix={<TeamOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Space direction="vertical" size={8}>
              <Text style={{ color: "#8c8c8c", fontSize: 14 }}>Orchestrator Status</Text>
              <Space align="center" size="small">
                <SyncOutlined style={{ color: "#58bfce" }} />
                <DeepDiveStatusTag status={summary.orchestratorStatus} />
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Space direction="vertical" size={8}>
              <Text style={{ color: "#8c8c8c", fontSize: 14 }}>Settings</Text>
              <Space align="center" size="small">
                <SettingOutlined style={{ color: "#58bfce" }} />
                <Text style={{ color: "#fff", fontWeight: 600 }}>
                  {report.settings?.name ?? "—"}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={<Text style={{ color: "#8c8c8c" }}>Total Sources</Text>}
              value={summary.totalSources}
              prefix={<FileSearchOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={<Text style={{ color: "#8c8c8c" }}>Scrape Candidates</Text>}
              value={summary.totalScrapeCandidates}
              prefix={<LinkOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card style={DARK_CARD_STYLE}>
            <Statistic
              title={<Text style={{ color: "#8c8c8c" }}>Total Queries</Text>}
              value={summary.totalQueries}
              prefix={<SearchOutlined style={{ color: "#58bfce" }} />}
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
