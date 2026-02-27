"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";
import { useAuth } from "../../../../../hooks/useAuth";
import DeepDiveSettings from "../../../../../components/deep-dive/deep-dive-settings";

export default function DeepDiveSettingsPage() {
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
      <div
        style={{
          minHeight: "100vh",
          background: "#141414",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (!isAdmin()) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#141414",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Result
          status="403"
          title="Admin access required"
          subTitle="You do not have permission to manage deep dive settings."
          extra={
            <Button type="primary" onClick={() => router.push("/history")}>
              Go to My Reports
            </Button>
          }
        />
      </div>
    );
  }

  if (!Number.isFinite(reportId)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#141414",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Result
          status="404"
          title="Deep Dive not found"
          extra={
            <Button type="primary" onClick={() => router.push("/deep-dive")}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  return <DeepDiveSettings reportId={reportId} />;
}
