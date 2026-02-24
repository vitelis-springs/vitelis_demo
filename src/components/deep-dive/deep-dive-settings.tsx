"use client";

import { Alert, App, Button, Card, Input, Layout, Radio, Select, Space, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  useGetDeepDiveSettings,
  useUpdateDeepDiveSettings,
  type ReportSettingsOption,
  type ValidatorSettingsOption,
  type ReportSettingsActionPayload,
  type ValidatorSettingsActionPayload,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveBreadcrumbs from "./breadcrumbs";

const { Content } = Layout;
const { Title, Text } = Typography;

type EditMode = "reuse" | "create";
type CreateStrategy = "clone" | "blank";

interface ReportSettingsDraft {
  mode: EditMode;
  reuseId: number | null;
  strategy: CreateStrategy;
  baseId: number | null;
  name: string;
  masterFileId: string;
  prefix: string;
  jsonText: string;
  parseError: string | null;
}

interface ValidatorSettingsDraft {
  mode: EditMode;
  reuseId: number | null;
  strategy: CreateStrategy;
  baseId: number | null;
  name: string;
  jsonText: string;
  parseError: string | null;
}

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

function resolveInitialReportDraft(
  current: ReportSettingsOption | null,
  options: ReportSettingsOption[]
): ReportSettingsDraft {
  const fallback = current ?? options[0] ?? null;
  return {
    mode: "reuse",
    reuseId: current?.id ?? options[0]?.id ?? null,
    strategy: "clone",
    baseId: fallback?.id ?? null,
    name: "",
    masterFileId: fallback?.masterFileId ?? "",
    prefix:
      fallback?.prefix === null || fallback?.prefix === undefined
        ? ""
        : String(fallback.prefix),
    jsonText: safeStringify(fallback?.settings ?? {}),
    parseError: null,
  };
}

function resolveInitialValidatorDraft(
  current: ValidatorSettingsOption | null,
  options: ValidatorSettingsOption[]
): ValidatorSettingsDraft {
  const fallback = current ?? options[0] ?? null;
  return {
    mode: "reuse",
    reuseId: current?.id ?? options[0]?.id ?? null,
    strategy: "clone",
    baseId: fallback?.id ?? null,
    name: "",
    jsonText: safeStringify(fallback?.settings ?? {}),
    parseError: null,
  };
}

export default function DeepDiveSettings({ reportId }: { reportId: number }) {
  const { message } = App.useApp();
  const { data, isLoading } = useGetDeepDiveSettings(reportId);
  const updateSettings = useUpdateDeepDiveSettings(reportId);

  const reportOptions = useMemo(
    () => data?.data.options.reportSettings ?? [],
    [data]
  );
  const validatorOptions = useMemo(
    () => data?.data.options.validatorSettings ?? [],
    [data]
  );

  const [reportDraft, setReportDraft] = useState<ReportSettingsDraft | null>(null);
  const [validatorDraft, setValidatorDraft] = useState<ValidatorSettingsDraft | null>(null);

  useEffect(() => {
    if (!data) return;
    setReportDraft(
      resolveInitialReportDraft(
        data.data.current.reportSettings,
        data.data.options.reportSettings
      )
    );
    setValidatorDraft(
      resolveInitialValidatorDraft(
        data.data.current.validatorSettings,
        data.data.options.validatorSettings
      )
    );
  }, [data]);

  const handleReportJsonChange = (value: string) => {
    if (!reportDraft) return;
    const parsed = parseJsonObject(value);
    setReportDraft({
      ...reportDraft,
      jsonText: value,
      parseError: parsed.ok ? null : parsed.error,
    });
  };

  const handleValidatorJsonChange = (value: string) => {
    if (!validatorDraft) return;
    const parsed = parseJsonObject(value);
    setValidatorDraft({
      ...validatorDraft,
      jsonText: value,
      parseError: parsed.ok ? null : parsed.error,
    });
  };

  const onReportCloneBaseChange = (baseId: number) => {
    if (!reportDraft) return;
    const base = reportOptions.find((option) => option.id === baseId);
    setReportDraft({
      ...reportDraft,
      baseId,
      masterFileId: base?.masterFileId ?? "",
      prefix:
        base?.prefix === null || base?.prefix === undefined
          ? ""
          : String(base.prefix),
      jsonText: safeStringify(base?.settings ?? {}),
      parseError: null,
    });
  };

  const onValidatorCloneBaseChange = (baseId: number) => {
    if (!validatorDraft) return;
    const base = validatorOptions.find((option) => option.id === baseId);
    setValidatorDraft({
      ...validatorDraft,
      baseId,
      jsonText: safeStringify(base?.settings ?? {}),
      parseError: null,
    });
  };

  const buildReportAction = (): { action?: ReportSettingsActionPayload; error?: string } => {
    if (!reportDraft) return { error: "Report settings form is not initialized" };

    if (reportDraft.mode === "reuse") {
      if (!reportDraft.reuseId) return { error: "Select report settings to reuse" };
      return { action: { mode: "reuse", id: reportDraft.reuseId } };
    }

    const parsed = parseJsonObject(reportDraft.jsonText);
    if (!parsed.ok) return { error: `Report settings JSON: ${parsed.error}` };

    if (reportDraft.strategy === "clone") {
      if (!reportDraft.baseId) return { error: "Select report settings template to clone" };
      return {
        action: {
          mode: "create",
          strategy: "clone",
          baseId: reportDraft.baseId,
          name: reportDraft.name.trim() || undefined,
          settings: parsed.value,
        },
      };
    }

    const name = reportDraft.name.trim();
    if (!name) return { error: "Report settings name is required" };

    const masterFileId = reportDraft.masterFileId.trim();
    if (!masterFileId) return { error: "masterFileId is required for blank report settings" };

    let parsedPrefix: number | null = null;
    const rawPrefix = reportDraft.prefix.trim();
    if (rawPrefix) {
      const asNumber = Number(rawPrefix);
      if (!Number.isInteger(asNumber)) {
        return { error: "Prefix must be an integer" };
      }
      parsedPrefix = asNumber;
    }

    return {
      action: {
        mode: "create",
        strategy: "blank",
        name,
        masterFileId,
        prefix: parsedPrefix,
        settings: parsed.value,
      },
    };
  };

  const buildValidatorAction = (): { action?: ValidatorSettingsActionPayload; error?: string } => {
    if (!validatorDraft) return { error: "Validator settings form is not initialized" };

    if (validatorDraft.mode === "reuse") {
      if (!validatorDraft.reuseId) return { error: "Select validator settings to reuse" };
      return { action: { mode: "reuse", id: validatorDraft.reuseId } };
    }

    const parsed = parseJsonObject(validatorDraft.jsonText);
    if (!parsed.ok) return { error: `Validator settings JSON: ${parsed.error}` };

    if (validatorDraft.strategy === "clone") {
      if (!validatorDraft.baseId) return { error: "Select validator settings template to clone" };
      return {
        action: {
          mode: "create",
          strategy: "clone",
          baseId: validatorDraft.baseId,
          name: validatorDraft.name.trim() || undefined,
          settings: parsed.value,
        },
      };
    }

    const name = validatorDraft.name.trim();
    if (!name) return { error: "Validator settings name is required" };

    return {
      action: {
        mode: "create",
        strategy: "blank",
        name,
        settings: parsed.value,
      },
    };
  };

  const handleSave = () => {
    const report = buildReportAction();
    if (!report.action) {
      message.error(report.error ?? "Invalid report settings");
      return;
    }

    const validator = buildValidatorAction();
    if (!validator.action) {
      message.error(validator.error ?? "Invalid validator settings");
      return;
    }

    updateSettings.mutate(
      {
        reportSettingsAction: report.action,
        validatorSettingsAction: validator.action,
      },
      {
        onSuccess: () => {
          message.success("Settings saved");
        },
        onError: () => {
          message.error("Failed to save settings");
        },
      }
    );
  };

  if (isLoading || !data || !reportDraft || !validatorDraft) {
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
        <div style={{ maxWidth: 1200, width: "100%" }}>
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={4}>
              <DeepDiveBreadcrumbs
                items={[
                  { label: "Deep Dives", href: "/deep-dive" },
                  {
                    label: data.data.report.name || `Deep Dive #${reportId}`,
                    href: `/deep-dive/${reportId}`,
                  },
                  { label: "Settings" },
                ]}
              />
              <Space align="center" size="middle">
                <Title level={2} style={{ margin: 0, color: "#58bfce" }}>
                  Report Settings
                </Title>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={updateSettings.isPending}
                >
                  Save
                </Button>
              </Space>
              <Text style={{ color: "#8c8c8c" }}>
                Configure report settings and validator settings using JSON.
              </Text>
            </Space>
          </div>

          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message="How to use this page"
              description={
                <div style={{ color: "#bfbfbf" }}>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Pick mode for each section: <strong>Reuse existing</strong> or <strong>Create new</strong>.</li>
                    <li>If you choose <strong>Create new</strong>, select <strong>Clone template</strong> or <strong>Blank JSON</strong>.</li>
                    <li>JSON must be an object (example: <code>{"{ \"key\": \"value\" }"}</code>), not an array.</li>
                    <li>
                      For <strong>Report Settings</strong> + <strong>Blank JSON</strong>, fill <code>Name</code> and
                      <code> masterFileId</code> (prefix is optional integer).
                    </li>
                    <li>Click <strong>Save</strong> at the top to apply both sections.</li>
                  </ol>
                </div>
              }
            />

            <Card
              title="Report Settings"
              styles={{ header: { color: "#d9d9d9", background: "#1f1f1f" }, body: { background: "#1f1f1f" } }}
              style={{ border: "1px solid #303030" }}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Text style={{ color: "#8c8c8c" }}>
                  Current: {data.data.current.reportSettings?.name ?? "Not selected"}
                </Text>

                <Radio.Group
                  value={reportDraft.mode}
                  onChange={(e) =>
                    setReportDraft({ ...reportDraft, mode: e.target.value as EditMode })
                  }
                  options={[
                    { label: "Reuse existing", value: "reuse" },
                    { label: "Create new", value: "create" },
                  ]}
                />

                {reportDraft.mode === "reuse" ? (
                  <Select
                    value={reportDraft.reuseId ?? undefined}
                    onChange={(value) =>
                      setReportDraft({ ...reportDraft, reuseId: value })
                    }
                    options={reportOptions.map((option) => ({
                      value: option.id,
                      label: `${option.name} (#${option.id})`,
                    }))}
                    placeholder="Select report settings"
                    showSearch
                    optionFilterProp="label"
                  />
                ) : (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Select
                      value={reportDraft.strategy}
                      onChange={(value) =>
                        setReportDraft({ ...reportDraft, strategy: value as CreateStrategy })
                      }
                      options={[
                        { value: "clone", label: "Clone template" },
                        { value: "blank", label: "Blank JSON" },
                      ]}
                    />

                    {reportDraft.strategy === "clone" ? (
                      <>
                        <Select
                          value={reportDraft.baseId ?? undefined}
                          onChange={onReportCloneBaseChange}
                          options={reportOptions.map((option) => ({
                            value: option.id,
                            label: `${option.name} (#${option.id})`,
                          }))}
                          placeholder="Select template"
                          showSearch
                          optionFilterProp="label"
                        />
                        <Input
                          value={reportDraft.name}
                          onChange={(e) =>
                            setReportDraft({ ...reportDraft, name: e.target.value })
                          }
                          placeholder="Optional new name"
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          value={reportDraft.name}
                          onChange={(e) =>
                            setReportDraft({ ...reportDraft, name: e.target.value })
                          }
                          placeholder="Name"
                        />
                        <Input
                          value={reportDraft.masterFileId}
                          onChange={(e) =>
                            setReportDraft({ ...reportDraft, masterFileId: e.target.value })
                          }
                          placeholder="masterFileId"
                        />
                        <Input
                          value={reportDraft.prefix}
                          onChange={(e) =>
                            setReportDraft({ ...reportDraft, prefix: e.target.value })
                          }
                          placeholder="Prefix (optional integer)"
                        />
                      </>
                    )}

                    <Input.TextArea
                      value={reportDraft.jsonText}
                      onChange={(e) => handleReportJsonChange(e.target.value)}
                      autoSize={{ minRows: 10, maxRows: 24 }}
                      status={reportDraft.parseError ? "error" : undefined}
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        backgroundColor: "#141414",
                        color: "#d9d9d9",
                      }}
                    />
                    {reportDraft.parseError && (
                      <Text style={{ color: "#ff4d4f", fontSize: 12 }}>
                        {reportDraft.parseError}
                      </Text>
                    )}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              title="Validator Settings"
              styles={{ header: { color: "#d9d9d9", background: "#1f1f1f" }, body: { background: "#1f1f1f" } }}
              style={{ border: "1px solid #303030" }}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Text style={{ color: "#8c8c8c" }}>
                  Current: {data.data.current.validatorSettings?.name ?? "Not selected"}
                </Text>

                <Radio.Group
                  value={validatorDraft.mode}
                  onChange={(e) =>
                    setValidatorDraft({ ...validatorDraft, mode: e.target.value as EditMode })
                  }
                  options={[
                    { label: "Reuse existing", value: "reuse" },
                    { label: "Create new", value: "create" },
                  ]}
                />

                {validatorDraft.mode === "reuse" ? (
                  <Select
                    value={validatorDraft.reuseId ?? undefined}
                    onChange={(value) =>
                      setValidatorDraft({ ...validatorDraft, reuseId: value })
                    }
                    options={validatorOptions.map((option) => ({
                      value: option.id,
                      label: `${option.name} (#${option.id})`,
                    }))}
                    placeholder="Select validator settings"
                    showSearch
                    optionFilterProp="label"
                  />
                ) : (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Select
                      value={validatorDraft.strategy}
                      onChange={(value) =>
                        setValidatorDraft({ ...validatorDraft, strategy: value as CreateStrategy })
                      }
                      options={[
                        { value: "clone", label: "Clone template" },
                        { value: "blank", label: "Blank JSON" },
                      ]}
                    />

                    {validatorDraft.strategy === "clone" ? (
                      <>
                        <Select
                          value={validatorDraft.baseId ?? undefined}
                          onChange={onValidatorCloneBaseChange}
                          options={validatorOptions.map((option) => ({
                            value: option.id,
                            label: `${option.name} (#${option.id})`,
                          }))}
                          placeholder="Select template"
                          showSearch
                          optionFilterProp="label"
                        />
                        <Input
                          value={validatorDraft.name}
                          onChange={(e) =>
                            setValidatorDraft({ ...validatorDraft, name: e.target.value })
                          }
                          placeholder="Optional new name"
                        />
                      </>
                    ) : (
                      <Input
                        value={validatorDraft.name}
                        onChange={(e) =>
                          setValidatorDraft({ ...validatorDraft, name: e.target.value })
                        }
                        placeholder="Name"
                      />
                    )}

                    <Input.TextArea
                      value={validatorDraft.jsonText}
                      onChange={(e) => handleValidatorJsonChange(e.target.value)}
                      autoSize={{ minRows: 10, maxRows: 24 }}
                      status={validatorDraft.parseError ? "error" : undefined}
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        backgroundColor: "#141414",
                        color: "#d9d9d9",
                      }}
                    />
                    {validatorDraft.parseError && (
                      <Text style={{ color: "#ff4d4f", fontSize: 12 }}>
                        {validatorDraft.parseError}
                      </Text>
                    )}
                  </Space>
                )}
              </Space>
            </Card>
          </Space>
        </div>
      </Content>
    </Layout>
  );
}
