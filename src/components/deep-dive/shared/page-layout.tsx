"use client";

import { Layout } from "antd";
import Sidebar from "../../ui/sidebar";

const { Content } = Layout;

const BG = "#141414";

export default function DeepDivePageLayout({
  children,
  maxWidth = 1400,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <Layout style={{ minHeight: "100vh", background: BG }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: BG }}>
        <Content style={{ padding: 24, background: BG, minHeight: "100vh" }}>
          <div style={{ maxWidth, width: "100%" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
