"use client";

import { FileTextOutlined, ReloadOutlined } from "@ant-design/icons";
import { downloadBlobAsFile, type GeneratedCompanyReport } from "@hooks/api/useGeneratedCompanyReportsService";
import { api } from "../../lib/api-client";
import { App, Button, Card, Layout, Space, Spin, Typography } from "antd";
import mammoth from "mammoth";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "../ui/sidebar";

const { Title, Text } = Typography;
const { Content } = Layout;

interface VitelisSalesReportResultProps {
  report: GeneratedCompanyReport;
  onReset: () => void;
}

function extractFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallback;
    }
  }
  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }
  return fallback;
}

export default function VitelisSalesReportResult({
  report,
  onReset,
}: VitelisSalesReportResultProps) {
  const { notification } = App.useApp();
  const [docxBlob, setDocxBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchReportDocx = useCallback(async () => {
    const response = await api.post("/generated-company-reports", { id: report.id }, { responseType: "blob" });
    const blob = response.data as Blob;
    const fallbackName = `seller-brief-${report.id}.docx`;
    const disposition = response.headers["content-disposition"] as string | undefined ?? null;
    const filename = extractFilename(disposition, fallbackName);
    return { blob, filename };
  }, [report.id]);

  const loadDocx = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { blob, filename } = await fetchReportDocx();
      setDocxBlob({ blob, filename });
      const arrayBuffer = await blob.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(value);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load report");
      notification.error({
        message: "Failed to load report",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchReportDocx, notification]);

  useEffect(() => {
    loadDocx();
  }, [loadDocx]);

  const handleDownload = async () => {
    if (docxBlob) {
      downloadBlobAsFile(docxBlob.blob, docxBlob.filename);
      notification.success({
        message: "Report downloaded",
        description: `${docxBlob.filename} downloaded successfully.`,
      });
      return;
    }
    setIsDownloading(true);
    try {
      const { blob, filename } = await fetchReportDocx();
      setDocxBlob({ blob, filename });
      downloadBlobAsFile(blob, filename);
      notification.success({
        message: "Report downloaded",
        description: `${filename} downloaded successfully.`,
      });
    } catch (err) {
      notification.error({
        message: "Failed to download report",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: "#141414" }}>
        <Content style={{ padding: "24px", background: "#141414", minHeight: "100vh" }}>
          <Card
            style={{ background: "#1f1f1f", border: "1px solid #303030", borderRadius: "12px" }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <Title level={2} style={{ color: "#58bfce", marginBottom: "8px" }}>
                VitelisSales Result Ready
              </Title>
              <Text style={{ color: "#8c8c8c" }}>
                Report ID: {report.id} {report.company_id ? `• Company: ${report.company_id}` : ""}
                {report.report_id ? ` • Use case report: ${report.report_id}` : ""}
              </Text>
            </div>

            <Space style={{ marginBottom: "20px" }}>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={handleDownload}
                loading={isDownloading}
                disabled={!!loadError}
              >
                Download Report
              </Button>
              <Button icon={<ReloadOutlined />} onClick={onReset}>
                Start New Run
              </Button>
            </Space>

            {isLoading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: "#8c8c8c" }}>Loading report preview...</div>
              </div>
            )}

            {loadError && (
              <Card
                style={{
                  background: "#2a1f1f",
                  border: "1px solid #ff4d4f",
                  marginBottom: "16px",
                }}
              >
                <Text style={{ color: "#ffa39e" }}>{loadError}</Text>
                <div style={{ marginTop: 12 }}>
                  <Button size="small" onClick={loadDocx}>
                    Retry
                  </Button>
                </div>
              </Card>
            )}

            {!isLoading && htmlContent && (
              <Card
                title={<Text style={{ color: "#d9d9d9" }}>Report Preview</Text>}
                style={{ background: "#262626", border: "1px solid #434343" }}
                styles={{ body: { padding: "24px" } }}
              >
                <style>{`
                  .vitelis-report-html h1, .vitelis-report-html h2, .vitelis-report-html h3, .vitelis-report-html h4 {
                    color: #58bfce;
                    margin-top: 16px;
                    margin-bottom: 8px;
                  }
                  .vitelis-report-html h1 { font-size: 20px; }
                  .vitelis-report-html h2 { font-size: 18px; }
                  .vitelis-report-html h3 { font-size: 16px; }
                  .vitelis-report-html h4 { font-size: 14px; }
                  .vitelis-report-html p { color: #d9d9d9; margin-bottom: 12px; line-height: 1.6; font-size: 14px; }
                  .vitelis-report-html strong { color: #fff; }
                  .vitelis-report-html a { color: #1890ff; text-decoration: underline; }
                  .vitelis-report-html table { width: 100%; border-collapse: collapse; margin-bottom: 16px; min-width: 400px; }
                  .vitelis-report-html th, .vitelis-report-html td { border: 1px solid #434343; padding: 12px 8px; text-align: left; }
                  .vitelis-report-html th { background: #1f1f1f; color: #58bfce; font-weight: bold; }
                  .vitelis-report-html td { color: #d9d9d9; }
                  .vitelis-report-html ul, .vitelis-report-html ol { margin-bottom: 12px; padding-left: 24px; color: #d9d9d9; }
                  .vitelis-report-html li { margin-bottom: 4px; }
                  .vitelis-report-html blockquote { border-left: 4px solid #58bfce; padding-left: 16px; margin: 16px 0; font-style: italic; color: #8c8c8c; }
                `}</style>
                <div
                  className="vitelis-report-html"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  style={{ color: "#d9d9d9", fontSize: 14, lineHeight: 1.6 }}
                />
              </Card>
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
