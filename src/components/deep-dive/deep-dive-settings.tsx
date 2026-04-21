"use client";

import { App, Button, Divider, Input, InputNumber, Layout, Select, Space, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  useGetDeepDiveSettings,
  useUpdateDeepDiveSettings,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveBreadcrumbs from "./breadcrumbs";
import { buildReportHref, resolveReportSection } from "./shared/report-route";
import JsonEditor from "./json-editor";

const { Content } = Layout;
const { Title, Text } = Typography;

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function parseJsonObject(text: string):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "JSON must be an object" };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

interface Draft {
  name: string;
  description: string;
  useCaseId: number | null;
  rsName: string;
  rsMasterFileId: string;
  rsPrefix: number | null;
  rsJson: string;
  svsName: string;
  svsJson: string;
}

export default function DeepDiveSettings({ reportId, backHref }: { reportId: number; backHref?: string }) {
  const { message } = App.useApp();
  const { data, isLoading } = useGetDeepDiveSettings(reportId);
  const updateSettings = useUpdateDeepDiveSettings(reportId);
  const reportSection = resolveReportSection(backHref);

  const useCaseOptions = useMemo(() => data?.data.options.useCases ?? [], [data]);

  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!data) return;
    const rs = data.data.current.reportSettings;
    const svs = data.data.current.validatorSettings;
    setDraft({
      name: data.data.report.name ?? "",
      description: data.data.report.description ?? "",
      useCaseId: data.data.report.useCaseId ?? null,
      rsName: rs?.name ?? "",
      rsMasterFileId: rs?.masterFileId ?? "",
      rsPrefix: rs?.prefix ?? null,
      rsJson: safeStringify(rs?.settings ?? {}),
      svsName: svs?.name ?? "",
      svsJson: safeStringify(svs?.settings ?? {}),
    });
  }, [data]);

  const set = (patch: Partial<Draft>) => setDraft((prev) => prev ? { ...prev, ...patch } : prev);

  const handleSave = () => {
    if (!draft) return;

    const name = draft.name.trim();
    if (!name) {
      message.error("Report name is required");
      return;
    }

    const rsJsonResult = parseJsonObject(draft.rsJson);
    if (!rsJsonResult.ok) {
      message.error(`Report Settings JSON: ${rsJsonResult.error}`);
      return;
    }

    const svsJsonResult = parseJsonObject(draft.svsJson);
    if (!svsJsonResult.ok) {
      message.error(`Source Validation Settings JSON: ${svsJsonResult.error}`);
      return;
    }

    updateSettings.mutate(
      {
        reportInfo: {
          name,
          description: draft.description.trim() || null,
          useCaseId: draft.useCaseId,
        },
        reportSettings: {
          name: draft.rsName.trim() || undefined,
          masterFileId: draft.rsMasterFileId.trim() || undefined,
          prefix: draft.rsPrefix,
          settings: rsJsonResult.value,
        },
        validatorSettings: {
          name: draft.svsName.trim() || undefined,
          settings: svsJsonResult.value,
        },
      },
      {
        onSuccess: () => message.success("Settings saved"),
        onError: () => message.error("Failed to save settings"),
      }
    );
  };

  if (isLoading || !data || !draft) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#141414" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#141414" }}>
      <Content style={{ padding: 24, background: "#141414", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1400, width: "100%" }}>
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={4}>
              <DeepDiveBreadcrumbs
                items={[
                  reportSection,
                  {
                    label: data.data.report.name || `Report #${reportId}`,
                    href: backHref ?? buildReportHref(backHref, reportId),
                  },
                  { label: "Settings" },
                ]}
              />
              <Space align="center" size="middle">
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  Settings
                </Title>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={updateSettings.isPending}
                >
                  Save
                </Button>
              </Space>
            </Space>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px", alignItems: "start" }}>

            {/* Left column */}
            <div>
              <Title level={5} style={{ color: "#d9d9d9", marginTop: 0, marginBottom: 16 }}>General</Title>

              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                  Report Name <span style={{ color: "#ff4d4f" }}>*</span>
                </Text>
                <Input
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Q2 2026 Analysis"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                  Description
                </Text>
                <Input.TextArea
                  value={draft.description}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              {useCaseOptions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                    Use Case
                  </Text>
                  <Select
                    value={draft.useCaseId ?? undefined}
                    onChange={(v) => set({ useCaseId: v ?? null })}
                    options={useCaseOptions.map((uc) => ({ value: uc.id, label: uc.name }))}
                    placeholder="Select use case"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <Divider style={{ borderColor: "#303030", marginTop: 8 }} />

              <Title level={5} style={{ color: "#d9d9d9", marginBottom: 16 }}>Report Settings</Title>

              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                  Settings Name
                </Text>
                <Input
                  value={draft.rsName}
                  onChange={(e) => set({ rsName: e.target.value })}
                  placeholder="Defaults to report name"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 16 }}>
                <div>
                  <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                    Master File ID
                  </Text>
                  <Input
                    value={draft.rsMasterFileId}
                    onChange={(e) => set({ rsMasterFileId: e.target.value })}
                    placeholder="Google Sheets / Drive file ID"
                  />
                </div>
                <div>
                  <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                    Prefix
                  </Text>
                  <InputNumber
                    value={draft.rsPrefix}
                    onChange={(v) => set({ rsPrefix: v })}
                    style={{ width: "100%" }}
                    placeholder="Optional integer"
                  />
                </div>
              </div>

              <div>
                <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                  Settings JSON
                </Text>
                <JsonEditor
                  value={draft.rsJson}
                  onChange={(v) => set({ rsJson: v })}
                  height={420}
                />
              </div>
            </div>

            {/* Right column */}
            <div>
              <Title level={5} style={{ color: "#d9d9d9", marginTop: 0, marginBottom: 16 }}>Source Validation Settings</Title>

              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                  Settings Name
                </Text>
                <Input
                  value={draft.svsName}
                  onChange={(e) => set({ svsName: e.target.value })}
                  placeholder="Defaults to report name"
                />
              </div>

              <div>
                <Text style={{ color: "#8c8c8c", fontSize: 12, display: "block", marginBottom: 4 }}>
                  Settings JSON
                </Text>
                <JsonEditor
                  value={draft.svsJson}
                  onChange={(v) => set({ svsJson: v })}
                  height={600}
                />
              </div>
            </div>

          </div>
        </div>
      </Content>
    </Layout>
  );
}
