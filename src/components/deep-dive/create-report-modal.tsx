"use client";

import { useEffect, useState } from "react";
import { App, Button, Checkbox, Divider, Form, Input, InputNumber, Modal, Select, Spin, Tag, Typography } from "antd";
import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import {
  useCreateReport,
  useGetNextReportId,
  useGetReportCloneData,
  type CloneOptions,
  type CreateReportPayload,
} from "../../hooks/api/useDeepDiveService";

const { Text, Title } = Typography;

interface UseCase {
  id: number;
  name: string;
}

interface Props {
  reportType: "biz_miner" | "sales_miner";
  useCases: UseCase[];
  onCreated?: (id: number) => void;
  // When set — opens modal in clone mode
  cloneFromId?: number | null;
  onCloneClose?: () => void;
}

interface FormValues {
  name: string;
  description?: string;
  useCaseId?: number;
  rsName?: string;
  rsMasterFileId?: string;
  rsPrefix?: number;
  rsJson?: string;
  svsName?: string;
  svsJson?: string;
}

const DEFAULT_CLONE_OPTIONS: CloneOptions = {
  orchestrator: true,
  kpiModel: false,
  companies: false,
};

function JsonTextArea({
  value,
  onChange,
  placeholder,
  rows = 16,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const isValid = !value || (() => { try { JSON.parse(value); return true; } catch { return false; } })();

  function handleFormat() {
    if (!value?.trim()) return;
    try {
      onChange?.(JSON.stringify(JSON.parse(value), null, 2));
    } catch { /* invalid JSON — ignore */ }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <Button size="small" type="text" disabled={!value || !isValid} onClick={handleFormat}
          style={{ fontSize: 11, color: "#595959" }}>
          Format JSON
        </Button>
      </div>
      <Input.TextArea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder ?? "{}"}
        rows={rows}
        status={value && !isValid ? "error" : undefined}
        style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
      />
      {value && !isValid && (
        <Text type="danger" style={{ fontSize: 11 }}>Invalid JSON</Text>
      )}
    </div>
  );
}

export default function CreateReportModal({ reportType, useCases, onCreated, cloneFromId, onCloneClose }: Props) {
  const [open, setOpen] = useState(false);
  const [cloneOptions, setCloneOptions] = useState<CloneOptions>(DEFAULT_CLONE_OPTIONS);
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const { mutateAsync: createReport, isPending } = useCreateReport();

  // Clone mode: controlled externally via cloneFromId
  const isCloneMode = cloneFromId != null;
  const isOpen = isCloneMode ? true : open;

  const { data: nextIdData, refetch: refetchNextId } = useGetNextReportId(isOpen);
  const { data: cloneData, isLoading: cloneLoading } = useGetReportCloneData(cloneFromId ?? null);

  const nextId = nextIdData?.data.nextId ?? null;
  const typeLabel = reportType === "biz_miner" ? "Biz Miner" : "Sales Miner";

  // Reset clone options when modal opens/closes
  useEffect(() => {
    if (isOpen) setCloneOptions(DEFAULT_CLONE_OPTIONS);
  }, [isOpen]);

  // Fill form from clone data (all fields except prefix)
  useEffect(() => {
    if (!cloneData?.data || !isOpen) return;
    const d = cloneData.data;
    form.setFieldsValue({
      name: d.name,
      description: d.description || undefined,
      useCaseId: d.useCaseId ?? undefined,
      rsName: d.reportSettings?.name,
      rsMasterFileId: d.reportSettings?.masterFileId,
      rsJson: d.reportSettings?.settings
        ? JSON.stringify(d.reportSettings.settings, null, 2)
        : undefined,
      svsName: d.sourceValidationSettings?.name,
      svsJson: d.sourceValidationSettings?.settings
        ? JSON.stringify(d.sourceValidationSettings.settings, null, 2)
        : undefined,
    });
  }, [cloneData, isOpen, form]);

  // Auto-fill prefix when nextId is loaded
  useEffect(() => {
    if (isOpen && nextId !== null) {
      form.setFieldValue("rsPrefix", nextId * 1_000_000);
    }
  }, [isOpen, nextId, form]);

  function parseJsonField(raw?: string): object | undefined {
    if (!raw?.trim()) return undefined;
    try { return JSON.parse(raw); } catch { return undefined; }
  }

  function isJsonValid(raw?: string) {
    if (!raw?.trim()) return true;
    try { JSON.parse(raw); return true; } catch { return false; }
  }

  async function handleOk() {
    const values = await form.validateFields();

    const rsJson = values.rsJson?.trim();
    const svsJson = values.svsJson?.trim();

    if (rsJson && !isJsonValid(rsJson)) {
      message.error("Report Settings JSON is invalid");
      return;
    }
    if (svsJson && !isJsonValid(svsJson)) {
      message.error("Source Validation Settings JSON is invalid");
      return;
    }

    try {
      const result = await createReport({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        useCaseId: values.useCaseId,
        reportType,
        reportSettings: {
          name: values.rsName?.trim() || values.name.trim(),
          masterFileId: values.rsMasterFileId?.trim() ?? "",
          prefix: values.rsPrefix,
          settings: parseJsonField(rsJson) ?? {},
        },
        sourceValidationSettings: {
          name: values.svsName?.trim() || values.name.trim(),
          settings: parseJsonField(svsJson) ?? {},
        },
        ...(isCloneMode && cloneFromId != null
          ? { cloneFromId, cloneOptions }
          : {}),
      } satisfies CreateReportPayload);
      message.success(`Report "${result.data.name}" created`);
      handleClose();
      onCreated?.(result.data.id);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;

      if (status === 409 || code === "ID_CONFLICT") {
        message.warning("ID уже занят — обновляем...");
        const { data: fresh } = await refetchNextId();
        const newId = fresh?.data.nextId ?? null;
        if (newId !== null) {
          form.setFieldValue("rsPrefix", newId * 1_000_000);
          message.info(`Новый ID: ${newId}. Попробуйте снова.`);
        }
      } else {
        message.error("Failed to create report");
      }
    }
  }

  function handleClose() {
    form.resetFields();
    setOpen(false);
    onCloneClose?.();
  }

  // Clone options checkboxes (only in clone mode)
  const cloneOptionsSection = isCloneMode && (
    <div style={{ marginBottom: 16 }}>
      <Title level={5} style={{ color: "#d9d9d9", marginTop: 0, marginBottom: 10 }}>
        Copy from donor
      </Title>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <Checkbox
          checked={cloneOptions.orchestrator}
          onChange={(e) => setCloneOptions((prev) => ({ ...prev, orchestrator: e.target.checked }))}
        >
          Orchestrator &amp; Steps
        </Checkbox>
        {reportType === "biz_miner" && (
          <Checkbox
            checked={cloneOptions.kpiModel}
            onChange={(e) => setCloneOptions((prev) => ({ ...prev, kpiModel: e.target.checked }))}
          >
            KPI Model
          </Checkbox>
        )}
        <Checkbox
          checked={cloneOptions.companies}
          onChange={(e) => setCloneOptions((prev) => ({ ...prev, companies: e.target.checked }))}
        >
          Companies
        </Checkbox>
      </div>
      <Divider style={{ borderColor: "#303030", marginTop: 16, marginBottom: 0 }} />
    </div>
  );

  return (
    <>
      {/* Standalone "New Report" button — hidden in clone mode */}
      {!isCloneMode && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New {typeLabel} Report
        </Button>
      )}

      <Modal
        open={isOpen}
        title={
          <span>
            {isCloneMode ? `Clone Report #${cloneFromId}` : `New ${typeLabel} Report`}
            {nextId !== null && (
              <Tag color="blue" style={{ marginLeft: 12, fontWeight: 400 }}>
                ID: {nextId}
              </Tag>
            )}
          </span>
        }
        onOk={handleOk}
        onCancel={handleClose}
        okText={isCloneMode ? "Clone" : "Create"}
        confirmLoading={isPending}
        width="90vw"
        style={{ maxWidth: 1400, top: 24 }}
        styles={{
          body: {
            maxHeight: "calc(85vh - 110px)",
            overflowY: "auto",
            padding: "16px 24px",
          },
        }}
        destroyOnClose
      >
        {cloneLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Form form={form} layout="vertical">
            {cloneOptionsSection}

            {/* Two-column layout: left = general info, right = settings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px", alignItems: "start" }}>

              {/* Left column — general */}
              <div>
                <Title level={5} style={{ color: "#d9d9d9", marginTop: 0, marginBottom: 16 }}>General</Title>

                <Form.Item name="name" label="Report Name" rules={[{ required: true, message: "Name is required" }]}>
                  <Input placeholder="e.g. Q2 2026 Analysis" />
                </Form.Item>

                <Form.Item name="description" label="Description">
                  <Input.TextArea rows={3} placeholder="Optional description" />
                </Form.Item>

                {useCases.length > 0 && (
                  <Form.Item name="useCaseId" label="Use Case">
                    <Select
                      allowClear
                      placeholder="Select use case"
                      options={useCases.map((uc) => ({ value: uc.id, label: uc.name }))}
                    />
                  </Form.Item>
                )}

                <Divider style={{ borderColor: "#303030", marginTop: 8 }} />

                <Title level={5} style={{ color: "#d9d9d9", marginBottom: 16 }}>Report Settings</Title>

                <Form.Item name="rsName" label="Settings Name">
                  <Input placeholder="Defaults to report name" />
                </Form.Item>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <Form.Item name="rsMasterFileId" label="Master File ID">
                    <Input placeholder="Google Sheets / Drive file ID" />
                  </Form.Item>
                  <Form.Item name="rsPrefix" label="Prefix">
                    <InputNumber style={{ width: "100%" }} />
                  </Form.Item>
                </div>

                <Form.Item name="rsJson" label="Settings JSON" style={{ marginBottom: 0 }}>
                  <JsonTextArea placeholder='{"key": "value"}' rows={14} />
                </Form.Item>
              </div>

              {/* Right column — source validation */}
              <div>
                <Title level={5} style={{ color: "#d9d9d9", marginTop: 0, marginBottom: 16 }}>Source Validation Settings</Title>

                <Form.Item name="svsName" label="Settings Name">
                  <Input placeholder="Defaults to report name" />
                </Form.Item>

                <Form.Item name="svsJson" label="Settings JSON" style={{ marginBottom: 0 }}>
                  <JsonTextArea placeholder='{"filters": {}}' rows={28} />
                </Form.Item>
              </div>
            </div>
          </Form>
        )}
      </Modal>
    </>
  );
}

// Standalone clone button for use in table rows
export function CloneReportButton({ onClone }: { onClone: () => void }) {
  return (
    <Button
      type="text"
      icon={<CopyOutlined />}
      size="small"
      onClick={(e) => { e.stopPropagation(); onClone(); }}
      title="Clone report"
    />
  );
}
