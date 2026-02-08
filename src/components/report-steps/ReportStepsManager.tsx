"use client";

import { Layout, Space, Typography, Spin, Row, Col, message } from "antd";
import { useState } from "react";
import {
  useGetReportSteps,
  useAddStepToReport,
  useRemoveStepFromReport,
  useUpdateStepOrder,
} from "../../hooks/api/useReportStepsService";
import { useGetDeepDiveDetail } from "../../hooks/api/useDeepDiveService";
import DeepDiveBreadcrumbs from "../deep-dive/breadcrumbs";
import OrchestratorControl from "./OrchestratorControl";
import ConfiguredStepsList from "./ConfiguredStepsList";
import AvailableStepsList from "./AvailableStepsList";
import CompanyStepsTable from "./CompanyStepsTable";

const { Content } = Layout;
const { Title, Text } = Typography;

interface ReportStepsManagerProps {
  reportId: number;
}

export default function ReportStepsManager({ reportId }: ReportStepsManagerProps) {
  const [addingStepId, setAddingStepId] = useState<number | null>(null);
  const [removingStepId, setRemovingStepId] = useState<number | null>(null);

  const { data: reportData, isLoading: reportLoading } = useGetDeepDiveDetail(reportId);
  const { data: stepsData, isLoading: stepsLoading } = useGetReportSteps(reportId);

  const addStep = useAddStepToReport(reportId);
  const removeStep = useRemoveStepFromReport(reportId);
  const updateStepOrder = useUpdateStepOrder(reportId);

  const report = reportData?.data?.report;
  const configured = stepsData?.data?.configured ?? [];
  const available = stepsData?.data?.available ?? [];

  const handleAddStep = (stepId: number) => {
    setAddingStepId(stepId);
    addStep.mutate(stepId, {
      onSuccess: (result) => {
        if (result.success) {
          message.success("Step added");
        } else {
          message.error(result.error || "Failed to add step");
        }
        setAddingStepId(null);
      },
      onError: () => {
        message.error("Failed to add step");
        setAddingStepId(null);
      },
    });
  };

  const handleRemoveStep = (stepId: number) => {
    setRemovingStepId(stepId);
    removeStep.mutate(stepId, {
      onSuccess: (result) => {
        if (result.success) {
          message.success("Step removed");
        } else {
          message.error(result.error || "Failed to remove step");
        }
        setRemovingStepId(null);
      },
      onError: () => {
        message.error("Failed to remove step");
        setRemovingStepId(null);
      },
    });
  };

  const handleUpdateOrder = (stepId: number, order: number) => {
    updateStepOrder.mutate({ stepId, order }, {
      onError: () => {
        message.error("Failed to update step order");
      },
    });
  };

  if (reportLoading || stepsLoading) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#141414" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Content style={{ padding: 24, background: "#141414", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1600, width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={4}>
              <DeepDiveBreadcrumbs
                items={[
                  { label: "Deep Dives", href: "/deep-dive" },
                  {
                    label: report?.name || `Deep Dive #${reportId}`,
                    href: `/deep-dive/${reportId}`,
                  },
                  { label: "Steps" },
                ]}
              />
              <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                Step Configuration
              </Title>
              <Text style={{ color: "#8c8c8c" }}>
                Manage report generation steps and monitor execution progress.
              </Text>
            </Space>
          </div>

          {/* Orchestrator Control */}
          <div style={{ marginBottom: 24 }}>
            <OrchestratorControl reportId={reportId} />
          </div>

          {/* Steps Configuration */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
              <ConfiguredStepsList
                steps={configured}
                loading={stepsLoading}
                onRemove={handleRemoveStep}
                onUpdateOrder={handleUpdateOrder}
                removingStepId={removingStepId}
                updatingOrder={updateStepOrder.isPending}
              />
            </Col>
            <Col xs={24} lg={10}>
              <AvailableStepsList
                steps={available}
                loading={stepsLoading}
                onAdd={handleAddStep}
                addingStepId={addingStepId}
              />
            </Col>
          </Row>

          {/* Company Steps Matrix */}
          <CompanyStepsTable reportId={reportId} />
        </div>
      </Content>
    </Layout>
  );
}
