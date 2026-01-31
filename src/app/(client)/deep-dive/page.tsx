'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";
import { useAuth } from "../../../hooks/useAuth";
import DeepDiveList from "../../../components/deep-dive/deep-dive-list";

export default function DeepDivePage() {
  const { isLoggedIn, isAdmin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

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
          subTitle="You do not have permission to view Deep Dive admin panel."
          extra={
            <Button type="primary" onClick={() => router.push("/history")}>
              Go to My Reports
            </Button>
          }
        />
      </div>
    );
  }

  return <DeepDiveList />;
}
