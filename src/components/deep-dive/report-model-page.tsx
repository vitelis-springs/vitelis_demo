"use client";

import { ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Input,
  Result,
  Row,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
  useGetReportModel,
  useReplaceReportModel,
  type ReportModelItem,
} from "../../hooks/api/useDeepDiveService";
import {
  parseReportModelWorkbook,
  type ParsedReportModelWorkbook,
} from "../../shared/report-model-xlsx";
import { buildReportHref, resolveReportSection } from "./shared/report-route";
import DeepDivePageLayout from "./shared/page-layout";
import PageHeader from "./shared/page-header";
import StatCard from "./shared/stat-card";

const { Text, Paragraph } = Typography;

const BASE_COLUMN_MIN_WIDTH = 180;
const WIDE_COLUMN_MIN_WIDTH = 280;

interface ReportModelPageProps {
  reportId: number;
  backHref?: string;
}

interface ImportErrorState {
  message: string;
  missingDataPointIds: string[];
}

function getTypeTagColor(type: string | null): string {
  if (type === "kpi_category") return "gold";
  if (type === "kpi_driver") return "blue";
  if (type === "raw_data_point") return "green";
  return "default";
}

function extractImportError(error: unknown): ImportErrorState {
  const responseData = (
    error as {
      response?: {
        data?: {
          error?: string;
          details?: {
            missingDataPointIds?: string[];
          };
        };
      };
    }
  ).response?.data;

  return {
    message: responseData?.error ?? "Failed to update report model",
    missingDataPointIds: responseData?.details?.missingDataPointIds ?? [],
  };
}

function getShortDataPointId(dataPointId: string, type: string | null): string {
  if (type) {
    const prefix = `${type}_`;
    if (dataPointId.startsWith(prefix)) {
      return dataPointId.slice(prefix.length);
    }
  }

  return dataPointId.split("_").pop() ?? dataPointId;
}

function stringifyCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyCellValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }

  return String(value);
}

function getCellColumnWidth(values: unknown[]): number {
  const hasComplexValue = values.some(
    (value) => Array.isArray(value) || (!!value && typeof value === "object"),
  );

  if (hasComplexValue) return WIDE_COLUMN_MIN_WIDTH;

  const maxLength = values.reduce((acc, value) => {
    return Math.max(acc, stringifyCellValue(value).length);
  }, 0);

  if (maxLength > 80) return WIDE_COLUMN_MIN_WIDTH;
  if (maxLength > 35) return 220;
  return BASE_COLUMN_MIN_WIDTH;
}

function renderDynamicValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <Text style={{ color: "#8c8c8c" }}>—</Text>;
  }

  if (typeof value === "boolean") {
    return <Tag color={value ? "success" : "error"}>{value ? "true" : "false"}</Tag>;
  }

  if (typeof value === "number") {
    return <Text style={{ color: "#d9d9d9" }}>{value}</Text>;
  }

  const text = stringifyCellValue(value);

  return (
    <Tooltip title={text} placement="topLeft">
      <Paragraph
        style={{ marginBottom: 0, color: "#d9d9d9" }}
        ellipsis={{ rows: 4, expandable: true }}
      >
        {text}
      </Paragraph>
    </Tooltip>
  );
}

function buildTypeColumns(
  typeItems: ReportModelItem[],
  isUpdating: boolean,
  onToggleInclude: (dataPointId: string, includeToReport: boolean) => Promise<void>,
) {
  const dynamicKeys = Array.from(
    typeItems.reduce((keys, item) => {
      Object.keys(item.settings ?? {}).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );

  return [
    {
      title: "Include",
      key: "includeToReport",
      dataIndex: "includeToReport",
      width: 120,
      fixed: "left" as const,
      render: (value: boolean, row: ReportModelItem) => (
        <Switch
          checked={value}
          checkedChildren="on"
          unCheckedChildren="off"
          disabled={isUpdating}
          onChange={(checked) => {
            void onToggleInclude(row.dataPointId, checked);
          }}
        />
      ),
    },
    {
      title: "ID",
      key: "shortDataPointId",
      width: 130,
      fixed: "left" as const,
      render: (_value: unknown, row: ReportModelItem) => (
        <Tooltip title={row.dataPointId}>
          <Text code style={{ color: "#d9d9d9" }}>
            {getShortDataPointId(row.dataPointId, row.type)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Name",
      key: "name",
      dataIndex: "name",
      width: 320,
      fixed: "left" as const,
      render: (value: string | null) => (
        <Paragraph
          style={{ marginBottom: 0, color: value ? "#d9d9d9" : "#8c8c8c" }}
          ellipsis={{ rows: 3, expandable: true }}
        >
          {value || "—"}
        </Paragraph>
      ),
    },
    {
      title: "Manual",
      key: "manualMethod",
      dataIndex: "manualMethod",
      width: 120,
      render: (value: boolean | null) =>
        value === null ? (
          <Text style={{ color: "#8c8c8c" }}>—</Text>
        ) : (
          <Tag color={value ? "gold" : "default"}>{value ? "manual" : "auto"}</Tag>
        ),
    },
    ...dynamicKeys.map((key) => ({
      title: key,
      key,
      width: getCellColumnWidth(typeItems.map((item) => item.settings?.[key])),
      render: (_value: unknown, row: ReportModelItem) =>
        renderDynamicValue(row.settings?.[key]),
    })),
  ];
}

export default function ReportModelPage({
  reportId,
  backHref,
}: ReportModelPageProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [parsedWorkbook, setParsedWorkbook] =
    useState<ParsedReportModelWorkbook | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [importError, setImportError] = useState<ImportErrorState | null>(null);
  const [activeType, setActiveType] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetReportModel(reportId);
  const replaceModel = useReplaceReportModel(reportId);

  const reportSection = resolveReportSection(backHref);
  const reportHref = backHref ?? buildReportHref(backHref, reportId);
  const reportName = data?.data.report.name ?? `Report #${reportId}`;
  const useCaseName = data?.data.report.useCase?.name ?? null;
  const items = data?.data.items ?? [];
  const summary = data?.data.summary;

  const filteredItems = deferredSearchValue
    ? items.filter((item) =>
        [
          item.dataPointId,
          getShortDataPointId(item.dataPointId, item.type),
          item.name ?? "",
          item.type ?? "",
          item.manualMethod === null ? "" : item.manualMethod ? "manual" : "auto",
          ...Object.values(item.settings ?? {}).map((value) => stringifyCellValue(value)),
        ].some((value) => value.toLowerCase().includes(deferredSearchValue)),
      )
    : items;

  const typeOrder = (summary?.byType ?? []).map((item) => item.type);
  const itemsByType = new Map<string, ReportModelItem[]>();

  filteredItems.forEach((item) => {
    const type = item.type ?? "unknown";
    const typeItems = itemsByType.get(type);
    if (typeItems) {
      typeItems.push(item);
      return;
    }

    itemsByType.set(type, [item]);
  });

  const visibleTypes = typeOrder.filter((type) => itemsByType.has(type));
  const previewRows = parsedWorkbook?.rows.slice(0, 50) ?? [];

  useEffect(() => {
    if (!visibleTypes.length) {
      setActiveType("");
      return;
    }

    if (!activeType || !visibleTypes.includes(activeType)) {
      setActiveType(visibleTypes[0] ?? "");
    }
  }, [activeType, visibleTypes]);

  const handleSelectFile = () => {
    if (isParsingFile || replaceModel.isPending) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      void message.error("Only .xlsx files are supported");
      return;
    }

    setIsParsingFile(true);
    setImportError(null);

    try {
      const workbook = await parseReportModelWorkbook(file);
      startTransition(() => {
        setParsedWorkbook(workbook);
        setSelectedFileName(file.name);
      });
      void message.success(`Parsed ${workbook.rows.length} rows from ${file.name}`);
    } catch (parseError) {
      const errorMessage =
        parseError instanceof Error ? parseError.message : "Failed to parse XLSX file";
      void message.error(errorMessage);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleClearPreview = () => {
    startTransition(() => {
      setParsedWorkbook(null);
      setSelectedFileName(null);
      setImportError(null);
    });
  };

  const handleApplyModel = async () => {
    if (!parsedWorkbook) {
      void message.warning("Select and parse an XLSX file first");
      return;
    }

    setImportError(null);

    try {
      await replaceModel.mutateAsync({
        rows: parsedWorkbook.rows.map((row) => ({
          dataPointId: row.dataPointId,
          includeToReport: row.includeToReport,
        })),
      });

      startTransition(() => {
        setParsedWorkbook(null);
        setSelectedFileName(null);
      });

      void message.success("Report model updated");
    } catch (mutationError) {
      const parsedError = extractImportError(mutationError);
      setImportError(parsedError);
      void message.error(parsedError.message);
    }
  };

  const handleToggleInclude = async (
    dataPointId: string,
    includeToReport: boolean,
  ) => {
    setImportError(null);

    try {
      await replaceModel.mutateAsync({
        rows: items.map((item) => ({
          dataPointId: item.dataPointId,
          includeToReport:
            item.dataPointId === dataPointId ? includeToReport : item.includeToReport,
        })),
      });
      void message.success("Model row updated");
    } catch (mutationError) {
      const parsedError = extractImportError(mutationError);
      setImportError(parsedError);
      void message.error(parsedError.message);
    }
  };

  if (isLoading) {
    return (
      <DeepDivePageLayout maxWidth="none">
        <PageHeader
          breadcrumbs={[
            reportSection,
            { label: `Report #${reportId}`, href: reportHref },
            { label: "Model" },
          ]}
          title={`KPI Model — Report #${reportId}`}
        />
        <div
          style={{
            minHeight: 360,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin size="large" />
        </div>
      </DeepDivePageLayout>
    );
  }

  if (error || !data) {
    return (
      <DeepDivePageLayout maxWidth="none">
        <PageHeader
          breadcrumbs={[
            reportSection,
            { label: `Report #${reportId}`, href: reportHref },
            { label: "Model" },
          ]}
          title={`KPI Model — Report #${reportId}`}
        />
        <Result
          status="error"
          title="Failed to load report model"
          subTitle="The report model could not be loaded."
          extra={
            <Space>
              <Button onClick={() => void refetch()} icon={<ReloadOutlined />}>
                Retry
              </Button>
              <Button type="primary" onClick={() => router.push(reportHref)}>
                Back to report
              </Button>
            </Space>
          }
        />
      </DeepDivePageLayout>
    );
  }

  return (
    <DeepDivePageLayout maxWidth="none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />

      <PageHeader
        breadcrumbs={[
          reportSection,
          { label: reportName, href: reportHref },
          { label: "Model" },
        ]}
        title={`KPI Model — ${reportName}`}
        extra={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void refetch()}
              loading={isFetching}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleSelectFile}
              loading={isParsingFile}
              disabled={replaceModel.isPending}
            >
              Select XLSX
            </Button>
          </Space>
        }
      />

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Text style={{ color: "#8c8c8c" }}>
            Upload an XLSX file to replace the KPI model for this Biz Miner report.
          </Text>
          {useCaseName ? (
            <div style={{ marginTop: 6 }}>
              <Text style={{ color: "#8c8c8c" }}>
                Use Case: <Text style={{ color: "#d9d9d9" }}>{useCaseName}</Text>
              </Text>
            </div>
          ) : null}
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <StatCard label="Rows in Model" value={summary?.total ?? 0} />
          </Col>
          <Col xs={24} md={8}>
            <StatCard
              label="Included in Report"
              value={summary?.included ?? 0}
              valueColor="#52c41a"
            />
          </Col>
          <Col xs={24} md={8}>
            <StatCard
              label="Excluded from Report"
              value={summary?.excluded ?? 0}
              valueColor="#faad14"
            />
          </Col>
        </Row>

        <Card title="Import From XLSX" style={DARK_CARD_STYLE}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message="This action replaces the entire KPI model for the report."
              description={
                <Space direction="vertical" size={4}>
                  <Text>
                    Required column: <Text code>data_point_id</Text> or <Text code>id</Text>.
                  </Text>
                  <Text>
                    Optional column: <Text code>include_to_report</Text>.
                  </Text>
                  <Text>
                    Duplicate <Text code>data_point_id</Text> values are allowed, but the
                    last row wins.
                  </Text>
                </Space>
              }
            />

            <Space wrap size="middle">
              <Button
                icon={<UploadOutlined />}
                onClick={handleSelectFile}
                loading={isParsingFile}
                disabled={replaceModel.isPending}
              >
                Choose file
              </Button>
              <Button
                type="primary"
                onClick={() => void handleApplyModel()}
                loading={replaceModel.isPending}
                disabled={!parsedWorkbook || isParsingFile}
              >
                Apply model
              </Button>
              <Button
                onClick={handleClearPreview}
                disabled={!parsedWorkbook || isParsingFile || replaceModel.isPending}
              >
                Clear preview
              </Button>
              {selectedFileName ? (
                <Text style={{ color: "#8c8c8c" }}>
                  Selected file: <Text style={{ color: "#d9d9d9" }}>{selectedFileName}</Text>
                </Text>
              ) : null}
            </Space>

            {parsedWorkbook ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <StatCard label="Parsed Rows" value={parsedWorkbook.rows.length} />
                </Col>
                <Col xs={24} md={8}>
                  <StatCard
                    label="Duplicate IDs"
                    value={parsedWorkbook.duplicateDataPointIds.length}
                    valueColor={
                      parsedWorkbook.duplicateDataPointIds.length ? "#faad14" : "#d9d9d9"
                    }
                  />
                </Col>
                <Col xs={24} md={8}>
                  <StatCard
                    label="Skipped Rows"
                    value={parsedWorkbook.skippedRowNumbers.length}
                    valueColor={
                      parsedWorkbook.skippedRowNumbers.length ? "#ff7875" : "#d9d9d9"
                    }
                  />
                </Col>
              </Row>
            ) : null}

            {parsedWorkbook?.duplicateDataPointIds.length ? (
              <Alert
                type="warning"
                showIcon
                message="Duplicate data_point_id values were detected"
                description={
                  <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true }}>
                    {parsedWorkbook.duplicateDataPointIds.join(", ")}
                  </Paragraph>
                }
              />
            ) : null}

            {parsedWorkbook?.skippedRowNumbers.length ? (
              <Alert
                type="warning"
                showIcon
                message="Some rows were skipped because data_point_id was empty"
                description={
                  <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true }}>
                    {parsedWorkbook.skippedRowNumbers.join(", ")}
                  </Paragraph>
                }
              />
            ) : null}

            {importError ? (
              <Alert
                type="error"
                showIcon
                message={importError.message}
                description={
                  importError.missingDataPointIds.length ? (
                    <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true }}>
                      Missing data_point_id values: {importError.missingDataPointIds.join(", ")}
                    </Paragraph>
                  ) : undefined
                }
              />
            ) : null}
          </Space>
        </Card>

        {parsedWorkbook ? (
          <Card
            title={`Parsed Preview — ${parsedWorkbook.sheetName}`}
            extra={
              <Text style={{ color: "#8c8c8c" }}>
                Showing {previewRows.length} of {parsedWorkbook.rows.length} rows
              </Text>
            }
            style={DARK_CARD_STYLE}
          >
            <Table
              rowKey={(row) => `${row.rowNumber}-${row.dataPointId}`}
              dataSource={previewRows}
              pagination={false}
              scroll={{ x: 720 }}
              columns={[
                {
                  title: "Row",
                  dataIndex: "rowNumber",
                  key: "rowNumber",
                  width: 90,
                },
                {
                  title: "data_point_id",
                  dataIndex: "dataPointId",
                  key: "dataPointId",
                  render: (value: string) => (
                    <Text code style={{ color: "#d9d9d9" }}>
                      {value}
                    </Text>
                  ),
                },
                {
                  title: "include_to_report",
                  dataIndex: "includeToReport",
                  key: "includeToReport",
                  width: 180,
                  render: (value: boolean) => (
                    <Tag color={value ? "success" : "error"}>
                      {value ? "included" : "excluded"}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        ) : null}

        <Card
          title="Current Report Model"
          extra={
            <Space wrap>
              <Input
                allowClear
                placeholder="Search by id, name, type, or any field"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                style={{ width: 360 }}
              />
              <Text style={{ color: "#8c8c8c" }}>
                {filteredItems.length} / {items.length} rows
              </Text>
            </Space>
          }
          style={DARK_CARD_STYLE}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {summary?.byType.length ? (
              <Space wrap>
                {summary.byType.map((item) => (
                  <Tag key={item.type} color={getTypeTagColor(item.type)}>
                    {item.type}: {item.count}
                  </Tag>
                ))}
              </Space>
            ) : null}

            {visibleTypes.length ? (
              <Tabs
                activeKey={activeType}
                onChange={setActiveType}
                items={visibleTypes.map((type) => {
                  const typeItems = itemsByType.get(type) ?? [];

                  return {
                    key: type,
                    label: (
                      <Space size={8}>
                        <Tag color={getTypeTagColor(type)} style={{ marginInlineEnd: 0 }}>
                          {type}
                        </Tag>
                        <Text style={{ color: "#8c8c8c" }}>{typeItems.length}</Text>
                      </Space>
                    ),
                    children: (
                      <Table<ReportModelItem>
                        rowKey="id"
                        dataSource={typeItems}
                        pagination={{ pageSize: 20, showSizeChanger: false }}
                        scroll={{ x: "max-content" }}
                        size="small"
                        columns={buildTypeColumns(
                          typeItems,
                          replaceModel.isPending,
                          handleToggleInclude,
                        )}
                      />
                    ),
                  };
                })}
              />
            ) : (
              <Result
                status="info"
                title="No rows match the current filter"
                subTitle="Try a different search query or clear the filter."
              />
            )}
          </Space>
        </Card>
      </Space>
    </DeepDivePageLayout>
  );
}
