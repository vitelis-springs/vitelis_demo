"use client";

import { Modal, Input, App, Typography } from "antd";
import { useState, useEffect } from "react";
import { useUpdateOrchestrator } from "../../hooks/api/useReportStepsService";

const { Text } = Typography;

interface OrchestratorSettingsModalProps {
  open: boolean;
  metadata: Record<string, unknown> | null;
  reportId: number;
  onClose: () => void;
}

export default function OrchestratorSettingsModal({
  open,
  metadata,
  reportId,
  onClose,
}: OrchestratorSettingsModalProps) {
  const { message } = App.useApp();
  const updateOrch = useUpdateOrchestrator(reportId);

  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setJsonText(JSON.stringify(metadata ?? {}, null, 2));
      setParseError(null);
    }
  }, [open, metadata]);

  const handleChange = (value: string) => {
    setJsonText(value);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const handleSave = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      message.error("Invalid JSON");
      return;
    }

    // Build patch: new/changed values + null for deleted keys
    const patch: Record<string, unknown> = { ...parsed };
    const original = metadata ?? {};
    for (const key of Object.keys(original)) {
      if (!(key in parsed)) {
        patch[key] = null;
      }
    }

    updateOrch.mutate(
      { metadata: patch },
      {
        onSuccess: () => {
          message.success("Settings saved");
          onClose();
        },
        onError: () => {
          message.error("Failed to save settings");
        },
      }
    );
  };

  return (
    <Modal
      title="Orchestrator Settings"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      okButtonProps={{ disabled: !!parseError }}
      confirmLoading={updateOrch.isPending}
      width={600}
      destroyOnHidden
    >
      <div style={{ marginBottom: 8 }}>
        <Text style={{ color: "#8c8c8c", fontSize: 12 }}>
          Edit orchestrator metadata as JSON. Changes will be merged with existing settings.
          Removed keys will be deleted.
        </Text>
      </div>
      <Input.TextArea
        value={jsonText}
        onChange={(e) => handleChange(e.target.value)}
        autoSize={{ minRows: 8, maxRows: 20 }}
        status={parseError ? "error" : undefined}
        style={{
          fontFamily: "monospace",
          fontSize: 13,
          backgroundColor: "#1f1f1f",
          color: "#d9d9d9",
        }}
      />
      {parseError && (
        <Text style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4, display: "block" }}>
          {parseError}
        </Text>
      )}
    </Modal>
  );
}
