"use client";

import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { LinkOutlined, SendOutlined } from "@ant-design/icons";
import { useCallback, useState } from "react";
import {
  useGetDeepDiveDetail,
  useTryQuery,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveBreadcrumbs from "./breadcrumbs";
import MetadataFilterBuilder from "./metadata-filter-builder";

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

interface ChunkMetadata {
  title?: string;
  url?: string;
  total_score?: number;
  tier?: number;
  date?: number | string;
  categories?: string[];
  tags?: string[];
  company_id?: number;
  source?: string;
  [key: string]: unknown;
}

interface ChunkDocument {
  pageContent: string;
  metadata: ChunkMetadata;
}

interface ChunkResult {
  document: ChunkDocument;
  score: number;
}

const SCORE_COLORS: Record<string, string> = {
  high: "#52c41a",
  medium: "#faad14",
  low: "#ff4d4f",
};

function getScoreColor(score: number): string {
  if (score >= 0.5) return SCORE_COLORS.high!;
  if (score >= 0.3) return SCORE_COLORS.medium!;
  return SCORE_COLORS.low!;
}

function ChunkCard({ chunk, index }: { chunk: ChunkResult; index: number }) {
  const { document: doc, score } = chunk;
  const meta = doc.metadata;
  const title = meta.title || `Chunk #${index + 1}`;

  return (
    <Card
      size="small"
      style={{ background: "#1f1f1f", borderColor: "#303030" }}
      title={
        <Space size="middle" style={{ width: "100%", flexWrap: "wrap" }}>
          <Badge
            count={`${(score * 100).toFixed(1)}%`}
            style={{ backgroundColor: getScoreColor(score) }}
          />
          <Text
            style={{ color: "#d9d9d9", maxWidth: 500, fontWeight: 500 }}
            ellipsis={{ tooltip: title }}
          >
            {title}
          </Text>
          {meta.url && (
            <a href={meta.url} target="_blank" rel="noopener noreferrer">
              <LinkOutlined style={{ color: "#58bfce" }} />
            </a>
          )}
        </Space>
      }
      extra={
        <Space size={4}>
          {meta.tier != null && (
            <Tag color="blue">Tier {meta.tier}</Tag>
          )}
          {meta.date != null && (
            <Tag color="default">{String(meta.date)}</Tag>
          )}
          {meta.total_score != null && (
            <Tag color="purple">Quality: {meta.total_score}</Tag>
          )}
        </Space>
      }
    >
      <Paragraph
        style={{ color: "#a6a6a6", marginBottom: 8, whiteSpace: "pre-wrap" }}
        ellipsis={{ rows: 4, expandable: true, symbol: "Show more" }}
      >
        {doc.pageContent}
      </Paragraph>

      {meta.categories && meta.categories.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          {meta.categories.map((cat) => (
            <Tag key={cat} color="cyan" style={{ marginBottom: 4 }}>
              {cat}
            </Tag>
          ))}
        </div>
      )}

      {meta.tags && meta.tags.length > 0 && (
        <div>
          {meta.tags.map((tag) => (
            <Tag key={tag} style={{ marginBottom: 4 }}>
              {tag}
            </Tag>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function TryQueryPage({ reportId }: { reportId: number }) {
  const { data } = useGetDeepDiveDetail(reportId);
  const companies = data?.data?.companies ?? [];
  const reportName = data?.data?.report.name;

  const [query, setQuery] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [metadataFilters, setMetadataFilters] = useState<Record<string, unknown>>({});
  const tryQuery = useTryQuery(reportId);

  const handleFiltersChange = useCallback((filters: Record<string, unknown>) => {
    setMetadataFilters(filters);
  }, []);

  const handleRun = () => {
    if (!query.trim() || companyId === null) return;
    const hasFilters = Object.keys(metadataFilters).length > 0;
    tryQuery.mutate({
      query: query.trim(),
      companyId,
      metadataFilters: hasFilters ? metadataFilters : undefined,
    });
  };

  const chunks = Array.isArray(tryQuery.data?.data)
    ? (tryQuery.data.data as ChunkResult[])
    : null;

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Content style={{ padding: 24, background: "#141414", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1400, width: "100%" }}>
          <div style={{ marginBottom: 24 }}>
            <DeepDiveBreadcrumbs
              items={[
                { label: "Deep Dives", href: "/deep-dive" },
                { label: reportName || `Deep Dive #${reportId}`, href: `/deep-dive/${reportId}` },
                { label: "Try Query" },
              ]}
            />
            <Title level={3} style={{ margin: "12px 0 0", color: "#58bfce" }}>
              Try Query
            </Title>
          </div>

          {/* Input form */}
          <Card
            style={{ background: "#1f1f1f", borderColor: "#303030", marginBottom: 24 }}
          >
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Text style={{ display: "block", marginBottom: 4, color: "#8c8c8c" }}>
                  Company
                </Text>
                <Select
                  placeholder="Select company"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="label"
                  value={companyId}
                  onChange={setCompanyId}
                  options={companies.map((c) => ({ label: c.name, value: c.id }))}
                />
              </div>

              <div>
                <Text style={{ display: "block", marginBottom: 4, color: "#8c8c8c" }}>
                  Query
                </Text>
                <Input.TextArea
                  rows={3}
                  placeholder="Enter your vector search query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleRun();
                    }
                  }}
                />
              </div>

              <MetadataFilterBuilder onChange={handleFiltersChange} />

              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={tryQuery.isPending}
                disabled={!query.trim() || companyId === null}
                onClick={handleRun}
              >
                Run Query
              </Button>
            </Space>
          </Card>

          {/* Results */}
          {tryQuery.isPending && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <Spin size="large" />
            </div>
          )}

          {tryQuery.isError && (
            <Card style={{ background: "#2a1215", borderColor: "#58181c" }}>
              <Text style={{ color: "#ff4d4f" }}>
                {tryQuery.error?.message || "Query execution failed"}
              </Text>
            </Card>
          )}

          {chunks && chunks.length === 0 && (
            <Empty description="No results found" />
          )}

          {chunks && chunks.length > 0 && (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Text style={{ color: "#8c8c8c" }}>
                {chunks.length} chunk{chunks.length !== 1 ? "s" : ""} found
              </Text>
              {chunks.map((chunk, i) => (
                <ChunkCard key={i} chunk={chunk} index={i} />
              ))}
            </Space>
          )}
        </div>
      </Content>
    </Layout>
  );
}
