'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";
import { useAuth } from "../../../../hooks/useAuth";
import { useGetDeepDiveOverview } from "../../../../hooks/api/useDeepDiveService";
import DeepDiveDetail from "../../../../components/deep-dive/deep-dive-detail";

function ReportDetailRouter({ reportId }: { reportId: number }) {
  const router = useRouter();
  const { data, isLoading } = useGetDeepDiveOverview(reportId);

  useEffect(() => {
    const reportType = data?.data.report.reportType;
    if (!reportType) return;
    if (reportType === "sales_miner") router.replace(`/sales-miner/${reportId}`);
    if (reportType === "biz_miner") router.replace(`/biz-miner/${reportId}`);
    if (reportType === "internal") router.replace(`/vitelis-sales/${reportId}`);
  }, [data, reportId, router]);

  if (isLoading && !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  const reportType = data?.data.report.reportType;
  if (reportType && reportType !== "sales_miner" && reportType !== "biz_miner" && reportType !== "internal") {
    return <DeepDiveDetail reportId={reportId} />;
  }

  // While redirect is in progress
  return (
    <div style={{ minHeight: "100vh", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spin size="large" />
    </div>
  );
}

export default function DeepDiveDetailPage() {
  const { isLoggedIn, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);

  const reportId = Number(params.id);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, router, isLoading]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  if (!isAdmin()) {
    return (
      <div style={{ minHeight: "100vh", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Result
          status="403"
          title="Admin access required"
          subTitle="You do not have permission to view this Deep Dive."
          extra={<Button type="primary" onClick={() => router.push("/history")}>Go to My Reports</Button>}
        />
      </div>
    );
  }

  if (!Number.isFinite(reportId)) {
    return (
      <div style={{ minHeight: "100vh", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Result
          status="404"
          title="Deep Dive not found"
          extra={<Button type="primary" onClick={() => router.push("/deep-dive")}>Back to list</Button>}
        />
      </div>
    );
  }

  return <ReportDetailRouter reportId={reportId} />;
}
