"use client";

import { App, Badge, Button, Card, Col, Input, Layout, Row, Space, Spin, Table, Tag, Tooltip, Typography } from "antd";
import { DownloadOutlined, PlusOutlined, QuestionCircleOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import type { TableRowSelection } from "antd/lib/table/interface";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useGetDeepDiveOverview,
  useGetSalesMinerReportOverview,
  useExportOpportunitiesXlsx,
  type SalesMinerReportCompanyRow,
  type SalesMinerSignalSummaryRow,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveBreadcrumbs from "./breadcrumbs";
import DeepDiveStatusTag from "./status-tag";
import SummaryCards from "./summary-cards";
import AddCompanyModal from "./add-company-modal";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";

const { Content } = Layout;
const { Title, Text } = Typography;

const BG = "#141414";

/* ─── Signal summary cards ─── */

function SignalSummaryCards({ rows }: { rows: SalesMinerSignalSummaryRow[] }) {
  if (!rows.length) return <Text style={{ color: "#595959" }}>No signal data</Text>;

  const THEME_COLORS: Record<string, string> = {
    micro_signal: "#13c2c2",
    macro_signal: "#722ed1",
  };

  const THEME_LABELS: Record<string, string> = {
    micro_signal: "Micro Signals",
    macro_signal: "Macro Signals",
  };

  return (
    <Row gutter={[16, 16]}>
      {rows.map((r) => (
        <Col key={r.themeCode} xs={24} sm={12} md={8}>
          <Card
            size="small"
            style={{ ...DARK_CARD_STYLE, borderLeft: `3px solid ${THEME_COLORS[r.themeCode] ?? "#58bfce"}` }}
          >
            <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
              {THEME_LABELS[r.themeCode] ?? r.themeCode}
            </Text>
            <Title level={3} style={{ margin: 0, color: THEME_COLORS[r.themeCode] ?? "#d9d9d9" }}>
              {r.signalCount.toLocaleString()}
            </Title>
            <Text style={{ color: "#595959", fontSize: 12 }}>
              across {r.companiesCount} companies
              {r.avgStrength !== null ? ` · avg strength ${(r.avgStrength * 100).toFixed(0)}%` : ""}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

/* ─── Companies table ─── */

function CompaniesTable({
  companies,
  reportId,
  showSignals,
  title,
  basePath = "/sales-miner",
}: {
  companies: SalesMinerReportCompanyRow[];
  reportId: number;
  showSignals: boolean;
  title: string;
  basePath?: string;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q),
    );
  }, [companies, search]);

  const rowSelection: TableRowSelection<SalesMinerReportCompanyRow> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    preserveSelectedRowKeys: true,
  };

  const handleDownloadReports = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      params.set("report_id", String(reportId));
      if (selectedRowKeys.length > 0) {
        params.set("company_ids", selectedRowKeys.join(","));
      }

      const response = await fetch(`/api/company-reports/download?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to download reports");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1]
        || `company_reports_${reportId}.zip`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success("Reports downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      message.error(error instanceof Error ? error.message : "Failed to download reports");
    } finally {
      setDownloading(false);
    }
  };

  const colTitle = (label: string, hint: string) => (
    <Space size={4}>
      <span>{label}</span>
      <Tooltip title={hint} placement="top">
        <QuestionCircleOutlined style={{ color: "#595959", fontSize: 12, cursor: "help" }} />
      </Tooltip>
    </Space>
  );

  const columns = useMemo(() => {
    const cols = [
      {
        title: colTitle("ID", "Internal company ID in the system."),
        dataIndex: "id",
        key: "id",
        width: 70,
        sorter: (a: SalesMinerReportCompanyRow, b: SalesMinerReportCompanyRow) => a.id - b.id,
        render: (v: number) => (
          <Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>#{v}</Text>
        ),
      },
      {
        title: colTitle("Company", "Company name as stored in the system."),
        dataIndex: "name",
        key: "name",
        sorter: (a: SalesMinerReportCompanyRow, b: SalesMinerReportCompanyRow) =>
          a.name.localeCompare(b.name),
        render: (v: string) => <Text style={{ color: "#e0e0e0", fontWeight: 600 }}>{v}</Text>,
      },
      {
        title: colTitle(
          "Opportunities",
          "Total number of opportunity candidates identified for this company during the analysis run.",
        ),
        dataIndex: "oppCount",
        key: "oppCount",
        width: 130,
        sorter: (a: SalesMinerReportCompanyRow, b: SalesMinerReportCompanyRow) => a.oppCount - b.oppCount,
        render: (v: number) => (
          <Tag color="blue" style={{ fontWeight: 600, minWidth: 36, textAlign: "center" }}>
            {v ?? 0}
          </Tag>
        ),
      },
      {
        title: colTitle(
          "Avg Priority",
          "Average portfolio priority score across all opportunity candidates for this company. " +
          "Green ≥ 65 (high), yellow ≥ 55 (medium), grey < 55 (low). " +
          "Dash (—) means no opportunities were found.",
        ),
        dataIndex: "avgPriority",
        key: "avgPriority",
        width: 150,
        sorter: (a: SalesMinerReportCompanyRow, b: SalesMinerReportCompanyRow) =>
          (a.avgPriority ?? 0) - (b.avgPriority ?? 0),
        render: (v: number | null) =>
          v !== null ? (
            <Text style={{ color: v >= 65 ? "#52c41a" : v >= 55 ? "#faad14" : "#8c8c8c" }}>
              {v.toFixed(1)}
            </Text>
          ) : (
            <Text style={{ color: "#595959" }}>—</Text>
          ),
      },
    ];

    if (showSignals) {
      cols.push({
        title: colTitle(
          "Signals",
          "Number of individual signal items detected for this company " +
          "(micro and macro signals combined across all signal summary entries).",
        ),
        dataIndex: "signalCount",
        key: "signalCount",
        width: 100,
        sorter: (a: SalesMinerReportCompanyRow, b: SalesMinerReportCompanyRow) => a.signalCount - b.signalCount,
        render: (v: number) => <Badge count={v} color="#13c2c2" overflowCount={999} />,
      });
    }

    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSignals]);

  return (
    <Card
      title={
        <Space>
          <span>{title}</span>
          {selectedRowKeys.length > 0 && (
            <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
              ({selectedRowKeys.length} selected)
            </Typography.Text>
          )}
        </Space>
      }
      style={DARK_CARD_STYLE}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
      extra={
        <Space>
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Download Company Reports</div>
                <div>• Select companies using checkboxes to download specific reports</div>
                <div>• Or click without selection to download all reports</div>
                <div>• Reports will be downloaded as a ZIP archive</div>
              </div>
            }
            placement="bottomRight"
          >
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadReports}
              loading={downloading}
              disabled={companies.length === 0}
              type="primary"
              danger
              style={{
                fontWeight: 600,
                boxShadow: "0 0 12px rgba(255, 77, 79, 0.6)",
              }}
              className="sm-download-reports-btn"
            >
              {selectedRowKeys.length > 0
                ? `Download Reports (${selectedRowKeys.length})`
                : "Download All Reports"}
            </Button>
          </Tooltip>
          <style jsx global>{`
            @keyframes sm-pulse-glow {
              0%, 100% { box-shadow: 0 0 12px rgba(255, 77, 79, 0.6); transform: scale(1); }
              50% { box-shadow: 0 0 24px rgba(255, 77, 79, 0.9); transform: scale(1.02); }
            }
            .sm-download-reports-btn:not(:disabled) {
              animation: sm-pulse-glow 1.5s ease-in-out infinite !important;
            }
            .sm-download-reports-btn:hover:not(:disabled) {
              box-shadow: 0 0 30px rgba(255, 77, 79, 1) !important;
            }
          `}</style>
          <Input
            placeholder="Search by name or ID"
            prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Company
          </Button>
        </Space>
      }
    >
      <Table<SalesMinerReportCompanyRow>
        dataSource={filtered}
        rowKey="id"
        columns={columns}
        rowSelection={rowSelection}
        pagination={{
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ["20", "50", "100"],
          onShowSizeChange: (_, size) => setPageSize(size),
        }}
        size="small"
        style={{ background: BG }}
        onRow={(record) => ({
          onClick: (e) => {
            const target = e.target as HTMLElement;
            if (target.closest(".ant-checkbox-wrapper") || target.closest(".ant-checkbox")) return;
            router.push(`${basePath}/${reportId}/companies/${record.id}`);
          },
          style: { cursor: "pointer" },
        })}
        rowClassName={() => "sm-company-row"}
      />
      <AddCompanyModal
        reportId={reportId}
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
    </Card>
  );
}

/* ─── Entity level view ─── */

function EntityLevelView({ reportId }: { reportId: number }) {
  const { message } = App.useApp();
  const { data, isLoading } = useGetSalesMinerReportOverview(reportId);
  const exportXlsx = useExportOpportunitiesXlsx();

  if (isLoading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (data.data.level !== "entity") return null;
  const { signalSummary, oppSummary, topCompanies } = data.data;

  const totalSignals = signalSummary.reduce((s, r) => s + r.signalCount, 0);
  const totalOpps = oppSummary.reduce((s, r) => s + r.count, 0);
  const totalCompanies = topCompanies.filter((c) => c.isAnalyzed).length;

  return (
    <>
      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} align="stretch">
        <Col xs={24} sm={8} style={{ display: "flex" }}>
          <Card size="small" style={{ ...DARK_CARD_STYLE, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Text style={{ color: "#8c8c8c", display: "block", fontSize: 12 }}>Analyzed</Text>
            <Title level={3} style={{ margin: 0, color: "#58bfce" }}>{totalCompanies}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8} style={{ display: "flex" }}>
          <Card size="small" style={{ ...DARK_CARD_STYLE, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Text style={{ color: "#8c8c8c", display: "block", fontSize: 12 }}>Total Opportunities</Text>
            <Title level={3} style={{ margin: 0, color: "#1677ff" }}>{totalOpps.toLocaleString()}</Title>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              type="primary"
              loading={exportXlsx.isPending}
              style={{ marginTop: 8 }}
              onClick={() => exportXlsx.mutate(reportId, {
                onError: () => void message.error("Failed to export opportunities"),
              })}
            >
              Export XLSX
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={8} style={{ display: "flex" }}>
          <Card size="small" style={{ ...DARK_CARD_STYLE, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Text style={{ color: "#8c8c8c", display: "block", fontSize: 12 }}>Total Signals</Text>
            <Title level={3} style={{ margin: 0, color: "#13c2c2" }}>{totalSignals.toLocaleString()}</Title>
          </Card>
        </Col>
      </Row>

      {/* Companies */}
      <CompaniesTable
        companies={topCompanies}
        reportId={reportId}
        showSignals
        title={`Companies by Priority (${topCompanies.length})`}
      />

      <style jsx global>{`
        .sm-company-row:hover td { background: #2a2a2a !important; }
        .sm-company-row td { transition: background 0.2s ease; }
      `}</style>
    </>
  );
}

/* ─── Account level view ─── */

function AccountLevelView({ reportId }: { reportId: number }) {
  const { message } = App.useApp();
  const { data, isLoading } = useGetSalesMinerReportOverview(reportId);
  const exportXlsx = useExportOpportunitiesXlsx();

  if (isLoading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (data.data.level !== "account") return null;
  const { oppSummary, companies, relatedReportId, accountVersion } = data.data;
  const isV2 = accountVersion === "2";

  const totalOpps = oppSummary.reduce((s, r) => s + r.count, 0);
  const totalSignals = isV2
    ? data.data.signalSummary.reduce((s, r) => s + r.signalCount, 0)
    : 0;

  return (
    <>
      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} align="stretch">
        <Col xs={24} sm={8} style={{ display: "flex" }}>
          <Card size="small" style={{ ...DARK_CARD_STYLE, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Text style={{ color: "#8c8c8c", display: "block", fontSize: 12 }}>Account Companies</Text>
            <Title level={3} style={{ margin: 0, color: "#58bfce" }}>{companies.length}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8} style={{ display: "flex" }}>
          <Card size="small" style={{ ...DARK_CARD_STYLE, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Text style={{ color: "#8c8c8c", display: "block", fontSize: 12 }}>Total Opportunities</Text>
            <Title level={3} style={{ margin: 0, color: "#1677ff" }}>{totalOpps.toLocaleString()}</Title>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              type="primary"
              loading={exportXlsx.isPending}
              style={{ marginTop: 8 }}
              onClick={() => exportXlsx.mutate(relatedReportId ?? reportId, {
                onError: () => void message.error("Failed to export opportunities"),
              })}
            >
              Export XLSX
            </Button>
          </Card>
        </Col>
        {isV2 && (
          <Col xs={24} sm={8} style={{ display: "flex" }}>
            <Card size="small" style={{ ...DARK_CARD_STYLE, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Text style={{ color: "#8c8c8c", display: "block", fontSize: 12 }}>Total Signals</Text>
              <Title level={3} style={{ margin: 0, color: "#13c2c2" }}>{totalSignals.toLocaleString()}</Title>
            </Card>
          </Col>
        )}
        {!isV2 && relatedReportId && (
          <Col xs={24} sm={8} style={{ display: "flex" }}>
            <Card size="small" style={{ ...DARK_CARD_STYLE, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Text style={{ color: "#8c8c8c", display: "block", fontSize: 12 }}>Entity Report</Text>
              <Title level={3} style={{ margin: 0, color: "#722ed1" }}>#{relatedReportId}</Title>
            </Card>
          </Col>
        )}
      </Row>

      {/* Account companies */}
      <CompaniesTable
        companies={companies}
        reportId={reportId}
        showSignals={isV2}
        title={`Account Companies (${companies.length})`}
      />

      <style jsx global>{`
        .sm-company-row:hover td { background: #2a2a2a !important; }
        .sm-company-row td { transition: background 0.2s ease; }
      `}</style>
    </>
  );
}

/* ─── Main component ─── */

export default function SalesMinerDetail({ reportId }: { reportId: number }) {
  const router = useRouter();
  const { data: overviewData } = useGetDeepDiveOverview(reportId);
  const { data: smData, isLoading: smLoading } = useGetSalesMinerReportOverview(reportId);

  const report = overviewData?.data.report;
  const typeLevel = smData?.data.level ?? null;

  const backHref = "/sales-miner";
  const backLabel = "Sales Miner";

  return (
    <Layout style={{ minHeight: "100vh", background: BG }}>
      <Content style={{ padding: 24, background: BG, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1400, width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <DeepDiveBreadcrumbs
              items={[
                { label: backLabel, href: backHref },
                { label: report?.name || `Report #${reportId}` },
              ]}
            />
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  {report?.name || `Report #${reportId}`}
                </Title>
                {report?.status && <DeepDiveStatusTag status={report.status} />}
                {typeLevel && (
                  <Tag color={typeLevel === "account" ? "purple" : "cyan"} style={{ textTransform: "capitalize" }}>
                    {typeLevel} level
                  </Tag>
                )}
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => router.push(`/sales-miner/${reportId}/settings`)}
                >
                  Settings
                </Button>
              </div>
              {report?.description && (
                <Text style={{ color: "#8c8c8c", marginTop: 4, display: "block" }}>{report.description}</Text>
              )}
            </div>
          </div>

          {/* Summary: Companies Analyzed, Orchestrator Status, Settings */}
          <SummaryCards
            reportId={reportId}
            settingsName={report?.settings?.name ?? null}
            basePath="/sales-miner"
            compact
          />

          {/* Content by level */}
          {smLoading && !smData ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
              <Spin size="large" />
            </div>
          ) : typeLevel === "entity" ? (
            <EntityLevelView reportId={reportId} />
          ) : typeLevel === "account" ? (
            <AccountLevelView reportId={reportId} />
          ) : (
            <Text style={{ color: "#8c8c8c" }}>No sales miner data available</Text>
          )}
        </div>
      </Content>
    </Layout>
  );
}
