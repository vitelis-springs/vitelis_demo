"use client";

import {
  Card,
  Table,
  Spin,
  Typography,
  Tooltip,
  Select,
  Input,
  Space,
  Row,
  Col,
  Button,
} from "antd";
import { FilterOutlined, ClearOutlined } from "@ant-design/icons";
import type { ColumnsType, TableProps } from "antd/es/table";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
import {
  useGetStepsMatrix,
  useUpdateStepStatus,
  type StepStatus,
  type StepsMatrixRow,
} from "../../hooks/api/useReportStepsService";
import StepStatusBadge from "./StepStatusBadge";
import { useStepsMatrixFilters } from "./use-steps-matrix-filters";

const { Text } = Typography;
const { Search } = Input;

interface CompanyStepsTableProps {
  reportId: number;
}

const STATUS_OPTIONS: Array<{ value: StepStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "DONE", label: "Done" },
  { value: "ERROR", label: "Error" },
];

const STATUS_BG: Record<StepStatus, string> = {
  PENDING: "rgba(140, 140, 140, 0.08)",
  PROCESSING: "rgba(24, 144, 255, 0.10)",
  DONE: "rgba(82, 196, 26, 0.10)",
  ERROR: "rgba(255, 77, 79, 0.10)",
};

type TableRowType = StepsMatrixRow & { companyName: string; key: number };

export default function CompanyStepsTable({ reportId }: CompanyStepsTableProps) {
  const { data, isLoading } = useGetStepsMatrix(reportId, {
    refetchInterval: 60000,
  });
  const updateStatus = useUpdateStepStatus(reportId);

  const matrix = data?.data;

  const {
    ready,
    searchCompany,
    setSearchCompany,
    selectedStatuses,
    setSelectedStatuses,
    selectedStepIds,
    setSelectedStepIds,
    sortField,
    sortOrder,
    filteredData,
    visibleSteps,
    stepOptions,
    statusOptions,
    resetFilters,
    handleTableChange,
  } = useStepsMatrixFilters(
    reportId,
    matrix?.companies ?? [],
    matrix?.steps ?? [],
    matrix?.matrix ?? []
  );

  if (isLoading || !matrix || !ready) {
    return (
      <Card style={DARK_CARD_STYLE} styles={{ header: DARK_CARD_HEADER_STYLE }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  const handleStatusChange = (
    companyId: number,
    stepId: number,
    status: StepStatus
  ) => {
    updateStatus.mutate({ companyId, stepId, status });
  };

  const hasActiveFilters =
    searchCompany.trim() !== "" ||
    selectedStatuses.length > 0 ||
    selectedStepIds.length > 0;

  // Build table columns dynamically based on visible steps
  const columns: ColumnsType<TableRowType> = [
    {
      title: "ID",
      dataIndex: "companyId",
      key: "companyId",
      fixed: "left",
      width: 70,
      sorter: true,
      sortOrder: sortField === "companyId" ? sortOrder : null,
      render: (value: number) => (
        <Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>
          #{value}
        </Text>
      ),
    },
    {
      title: "Company",
      dataIndex: "companyName",
      key: "companyName",
      fixed: "left",
      width: 180,
      sorter: true,
      sortOrder: sortField === "companyName" ? sortOrder : null,
      render: (value: string) => (
        <Text style={{ color: "#d9d9d9", fontWeight: 500 }} ellipsis>
          {value}
        </Text>
      ),
    },
    ...visibleSteps.map((step) => ({
      title: (
        <Tooltip title={`Step #${step.order}: ${step.name}`}>
          <Text style={{ color: "#8c8c8c", fontSize: 12 }} ellipsis>
            {step.name}
          </Text>
        </Tooltip>
      ),
      key: `step-${step.id}`,
      dataIndex: `step-${step.id}`,
      width: 130,
      sorter: true,
      sortOrder: sortField === `step-${step.id}` ? sortOrder : null,
      onCell: (record: TableRowType) => {
        const st =
          record.statuses.find((s) => s.stepId === step.id)?.status ??
          "PENDING";
        return { style: { backgroundColor: STATUS_BG[st] } };
      },
      render: (_: unknown, record: TableRowType) => {
        const stepStatus = record.statuses.find((s) => s.stepId === step.id);
        const currentStatus = stepStatus?.status ?? "PENDING";

        return (
          <Select
            size="small"
            value={currentStatus}
            onChange={(value) =>
              handleStatusChange(record.companyId, step.id, value)
            }
            loading={
              updateStatus.isPending &&
              updateStatus.variables?.companyId === record.companyId &&
              updateStatus.variables?.stepId === step.id
            }
            style={{ width: 115 }}
            options={STATUS_OPTIONS}
            optionRender={(option) => (
              <StepStatusBadge status={option.value as StepStatus} />
            )}
          />
        );
      },
    })),
  ];

  return (
    <Card
      title={
        <Space>
          <span>Company Steps Matrix</span>
          <Text style={{ color: "#8c8c8c", fontWeight: 400, fontSize: 14 }}>
            ({filteredData.length} / {matrix.matrix.length})
          </Text>
        </Space>
      }
      style={DARK_CARD_STYLE}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
    >
      {/* Filters */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Search
            placeholder="Search by company name or ID..."
            value={searchCompany}
            onChange={(e) => setSearchCompany(e.target.value)}
            allowClear
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            mode="multiple"
            placeholder="Filter by status"
            value={selectedStatuses}
            onChange={setSelectedStatuses}
            options={statusOptions}
            style={{ width: "100%" }}
            maxTagCount={2}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            mode="multiple"
            placeholder="Show specific steps"
            value={selectedStepIds}
            onChange={setSelectedStepIds}
            options={stepOptions}
            style={{ width: "100%" }}
            maxTagCount={2}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Button
            icon={<ClearOutlined />}
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            style={{ width: "100%" }}
          >
            Clear
          </Button>
        </Col>
      </Row>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div style={{ marginBottom: 12 }}>
          <Space size={4}>
            <FilterOutlined style={{ color: "#58bfce" }} />
            <Text style={{ color: "#8c8c8c", fontSize: 12 }}>
              Filters active:
              {searchCompany && ` search="${searchCompany}"`}
              {selectedStatuses.length > 0 &&
                ` statuses=[${selectedStatuses.join(", ")}]`}
              {selectedStepIds.length > 0 &&
                ` steps=[${selectedStepIds.length} selected]`}
            </Text>
          </Space>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        onChange={handleTableChange as TableProps<TableRowType>["onChange"]}
        scroll={{ x: "max-content" }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} companies`,
        }}
        size="small"
      />
    </Card>
  );
}
