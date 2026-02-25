"use client";

import { SendOutlined } from "@ant-design/icons";
import { useGetGeneratedCompanyReport } from "@hooks/api/useGeneratedCompanyReportsService";
import { useVitelisSalesWorkflow } from "@hooks/api/useN8NService";
import { useGetVitelisSalesAnalyze, useVitelisSalesAnalyzeService } from "@hooks/api/useVitelisSalesAnalyzeService";
import { App, Button, Card, Form, Input, InputNumber, Layout, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import Sidebar from "../ui/sidebar";
import VitelisSalesAnimation from "./VitelisSalesAnimation";
import VitelisSalesReportResult from "./VitelisSalesReportResult";

const { Title, Text } = Typography;
const { Content } = Layout;

interface VitelisSalesQuizData {
  companyName: string;
  url: string;
  useCase?: string;
  industry_id: number;
}

interface VitelisSalesQuizProps {
  onComplete?: (data: VitelisSalesQuizData) => void;
}

export default function VitelisSalesQuiz({ onComplete }: VitelisSalesQuizProps) {
  const { notification } = App.useApp();
  const [form] = Form.useForm<VitelisSalesQuizData>();
  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string>("");
  const [quizData, setQuizData] = useState<VitelisSalesQuizData | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { mutateAsync: runWorkflow, isPending: isWorkflowPending } =
    useVitelisSalesWorkflow();
  const {
    createVitelisSalesAnalyze,
    updateVitelisSalesAnalyze,
  } = useVitelisSalesAnalyzeService();

  const { data: analyzeData, isLoading: isLoadingAnalyze } = useGetVitelisSalesAnalyze(
    analyzeId || undefined,
    { enabled: !!analyzeId, refetchInterval: 5000 }
  );

  const { data: generatedReport, isLoading: isLoadingGeneratedReport } =
    useGetGeneratedCompanyReport(
      {
        id: analyzeData?.generatedReportId,
        companyId: analyzeData?.companyId,
        reportId: analyzeData?.reportId,
      },
      {
        enabled:
          showResults &&
          Boolean(
            analyzeData?.generatedReportId ||
              (analyzeData?.companyId && analyzeData?.reportId)
          ),
        refetchInterval: 5000,
      }
    );

  useEffect(() => {
    if (!analyzeData) {
      return;
    }

    if (analyzeData.status === "finished") {
      setExecutionId("");
      setShowResults(true);
      return;
    }

    if (analyzeData.executionId && analyzeData.status === "progress") {
      setExecutionId(analyzeData.executionId);
      setShowResults(false);
      return;
    }
  }, [analyzeData]);

  const onFinish = async (values: VitelisSalesQuizData) => {
    try {
      const created = await createVitelisSalesAnalyze.mutateAsync({
        companyName: values.companyName,
        url: values.url,
        useCase: values.useCase || "",
        industry_id: Number(values.industry_id),
        status: "progress",
        currentStep: 1,
      });

      const createdId = created._id.toString();
      setAnalyzeId(createdId);

      const result = await runWorkflow({
        data: {
          companyName: values.companyName,
          url: values.url,
          useCase: values.useCase || "",
          industry_id: Number(values.industry_id),
        },
      });

      if (!result?.executionId) {
        throw new Error("N8N did not return executionId");
      }

      const nextExecutionId = result.executionId.toString();
      setExecutionId(nextExecutionId);

      await updateVitelisSalesAnalyze.mutateAsync({
        id: createdId,
        executionId: nextExecutionId,
        executionStatus: "started",
        executionStep: 0,
      });

      setQuizData(values);
      setExecutionId(nextExecutionId);
      setShowResults(false);
      onComplete?.(values);
      notification.success({
        message: "VitelisSales run started",
        description: "Workflow was started successfully.",
      });
    } catch (error) {
      notification.error({
        message: "Failed to start VitelisSales workflow",
        description:
          error instanceof Error ? error.message : "Unexpected error happened",
      });
    }
  };

  const handleNewRun = () => {
    setAnalyzeId(null);
    setExecutionId("");
    setQuizData(null);
    setShowResults(false);
    form.resetFields();
  };

  const handleAnimationComplete = () => {
    setExecutionId("");
    setShowResults(true);
  };

  if (analyzeId && isLoadingAnalyze) {
    return (
      <div
        style={{
          padding: "24px",
          background: "#141414",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
          <div style={{ textAlign: "center" }}>
            <Spin size="large" style={{ marginBottom: "16px" }} />
            <Title level={3} style={{ color: "#d9d9d9" }}>
              Loading your VitelisSales progress...
            </Title>
          </div>
        </Card>
      </div>
    );
  }

  if (executionId && quizData) {
    return (
      <VitelisSalesAnimation
        title="VitelisSales Analysis in Progress"
        description="Your sales intelligence analysis is being processed. This may take a few minutes."
        executionId={executionId}
        companyName={quizData.companyName}
        executionStep={analyzeData?.executionStep}
        analyzeId={analyzeId || undefined}
        analyzeData={analyzeData}
        onComplete={handleAnimationComplete}
      />
    );
  }

  if (showResults) {
    if (isLoadingGeneratedReport) {
      return (
        <div
          style={{
            padding: "24px",
            background: "#141414",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
            <div style={{ textAlign: "center" }}>
              <Spin size="large" style={{ marginBottom: "16px" }} />
              <Title level={3} style={{ color: "#d9d9d9" }}>
                Loading generated report...
              </Title>
            </div>
          </Card>
        </div>
      );
    }

    if (generatedReport) {
      return <VitelisSalesReportResult report={generatedReport} onReset={handleNewRun} />;
    }

    return (
      <Layout style={{ minHeight: "100vh", background: "#141414" }}>
        <Sidebar />
        <Layout style={{ marginLeft: 280, background: "#141414" }}>
          <Content style={{ padding: "24px", background: "#141414", minHeight: "100vh" }}>
            <Card style={{ background: "#1f1f1f", border: "1px solid #303030" }}>
              <Title level={3} style={{ color: "#d9d9d9" }}>
                Analysis finished, generated report is not available yet
              </Title>
              <Button onClick={handleNewRun}>Start New Run</Button>
            </Card>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: "#141414" }}>
        <Content
          style={{
            padding: "24px",
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <Card
            style={{
              background: "#1f1f1f",
              border: "1px solid #303030",
              marginBottom: "24px",
            }}
            styles={{ body: { padding: "24px 28px" } }}
          >
            <Title level={2} style={{ color: "#fff", marginBottom: 8 }}>
              VitelisSales Intelligence
            </Title>
            <Text style={{ color: "#8c8c8c" }}>
              Admin-only flow for triggering VitelisSales n8n workflow.
            </Text>
          </Card>

          <Card
            style={{ background: "#1f1f1f", border: "1px solid #303030" }}
            styles={{ body: { padding: "24px 28px" } }}
          >
            <Form<VitelisSalesQuizData>
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ useCase: "", industry_id: 24 }}
            >
              <Form.Item
                name="companyName"
                label={<Text style={{ color: "#d9d9d9" }}>Company Name</Text>}
                rules={[
                  { required: true, message: "Company name is required" },
                  { min: 2, message: "Company name must contain at least 2 characters" },
                ]}
              >
                <Input
                  placeholder="e.g., Kawasaki Heavy Industries (Global)"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="url"
                label={<Text style={{ color: "#d9d9d9" }}>Company URL</Text>}
                rules={[
                  { required: true, message: "Company URL is required" },
                  {
                    pattern:
                      /^https?:\/\/(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(\.[a-zA-Z]{2,})(\/.*)?$/,
                    message: "Please enter a valid URL",
                  },
                ]}
              >
                <Input placeholder="https://global.kawasaki.com" size="large" />
              </Form.Item>

              <Form.Item
                name="useCase"
                label={<Text style={{ color: "#d9d9d9" }}>Use Case</Text>}
              >
                <Input placeholder="Optional" size="large" />
              </Form.Item>

              <Form.Item
                name="industry_id"
                label={<Text style={{ color: "#d9d9d9" }}>Industry ID</Text>}
                rules={[
                  { required: true, message: "Industry ID is required" },
                  { type: "number", min: 1, message: "Industry ID must be positive" },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  size="large"
                  placeholder="e.g., 24"
                />
              </Form.Item>

              <Button
                htmlType="submit"
                type="primary"
                size="large"
                icon={<SendOutlined />}
                loading={
                  createVitelisSalesAnalyze.isPending ||
                  updateVitelisSalesAnalyze.isPending ||
                  isWorkflowPending
                }
              >
                Run VitelisSales Workflow
              </Button>
            </Form>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
