"use client";

import { Modal, Input, App, Typography } from "antd";
import { useState, useEffect } from "react";
import type { ConfiguredStep } from "../../hooks/api/useReportStepsService";
import { useUpdateGenerationStepSettings } from "../../hooks/api/useReportStepsService";

const { Text } = Typography;

interface StepSettingsModalProps {
  step: ConfiguredStep | null;
  reportId: number;
  onClose: () => void;
}

export default function StepSettingsModal({
  step,
  reportId,
  onClose,
}: StepSettingsModalProps) {
  const { message } = App.useApp();
  const updateSettings = useUpdateGenerationStepSettings(reportId);

  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (step) {
      setJsonText(JSON.stringify(step.settings ?? {}, null, 2));
      setParseError(null);
    }
  }, [step]);

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
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(jsonText) as Record<string, string>;
    } catch {
      message.error("Invalid JSON");
      return;
    }

    const settings = Object.keys(parsed).length > 0 ? parsed : null;

    updateSettings.mutate(
      { stepId: step!.id, settings },
      {
        onSuccess: (result) => {
          if (result.success) {
            message.success("Settings saved");
            onClose();
          } else {
            message.error(result.error || "Failed to save settings");
          }
        },
        onError: () => {
          message.error("Failed to save settings");
        },
      }
    );
  };

  return (
    <Modal
      title={`Settings: ${step?.name ?? ""}`}
      open={!!step}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      okButtonProps={{ disabled: !!parseError }}
      confirmLoading={updateSettings.isPending}
      width={600}
      destroyOnHidden
    >
      <div style={{ marginBottom: 8 }}>
        <Text style={{ color: "#8c8c8c", fontSize: 12 }}>
          Edit step settings as JSON. Empty object will clear settings.
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
