"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Tooltip,
  Typography,
} from "antd";
import { BulbOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { useGetIndustries } from "../../hooks/api/useIndustriesService";
import {
  useUpdateCompany,
  type CompanyUpdatePayload,
} from "../../hooks/api/useDeepDiveService";
import JsonEditor from "./json-editor";

const { Text } = Typography;

interface CompanyData {
  id: number;
  name: string;
  countryCode?: string | null;
  url?: string | null;
  industryId?: number | null;
  slug?: string | null;
  investPortal?: string | null;
  careerPortal?: string | null;
  reportRole?: string | null;
  additionalData?: unknown;
}

interface Props {
  reportId: number;
  company: CompanyData;
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  name: string;
  slug: string;
  url?: string;
  countryCode?: string;
  industryId?: number;
  investPortal?: string;
  careerPortal?: string;
  reportRole?: string;
  additionalDataJson?: string;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function EditCompanyModal({ reportId, company, open, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const { data: industries, isLoading: industriesLoading } = useGetIndustries();
  const updateCompany = useUpdateCompany(reportId, company.id);
  const slugManuallyEdited = useRef(false);
  const [generating, setGenerating] = useState(false);
  const watchedName = Form.useWatch("name", form);
  const watchedUrl = Form.useWatch("url", form);
  const canGenerate = !!watchedName?.trim() && !!watchedUrl?.trim();

  const handleGenerate = useCallback(async () => {
    const values = form.getFieldsValue();
    setGenerating(true);
    try {
      const res = await fetch("https://vitelis.app.n8n.cloud/webhook/company-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name || company.name,
          url: values.url || null,
          invest_portal: values.investPortal || null,
          career_portal: values.careerPortal || null,
        }),
      });
      if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
      const data = await res.json();
      form.setFieldValue("additionalDataJson", JSON.stringify(data, null, 2));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Webhook call failed");
    } finally {
      setGenerating(false);
    }
  }, [company.name, form, message]);

  useEffect(() => {
    if (open) {
      slugManuallyEdited.current = false;
      form.setFieldsValue({
        name: company.name,
        slug: company.slug ?? "",
        url: company.url ?? "",
        countryCode: company.countryCode ?? "",
        industryId: company.industryId ?? undefined,
        investPortal: company.investPortal ?? "",
        careerPortal: company.careerPortal ?? "",
        reportRole: company.reportRole ?? "",
        additionalDataJson:
          company.additionalData != null
            ? JSON.stringify(company.additionalData, null, 2)
            : "",
      });
    }
  }, [open, company, form]);

  const handleGenerateSlug = useCallback(() => {
    const name = form.getFieldValue("name") as string;
    if (!name?.trim()) { message.warning("Enter company name first"); return; }
    const slug = toSlug(name);
    form.setFieldValue("slug", slug);
    form.validateFields(["slug"]);
    slugManuallyEdited.current = true;
  }, [form, message]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      let additionalData: unknown = null;
      if (values.additionalDataJson?.trim()) {
        try {
          additionalData = JSON.parse(values.additionalDataJson);
        } catch {
          message.error("Invalid JSON in Additional Data");
          return;
        }
      }

      const payload: CompanyUpdatePayload = {
        name: values.name,
        slug: values.slug || null,
        url: values.url || null,
        countryCode: values.countryCode || null,
        industryId: values.industryId ?? null,
        investPortal: values.investPortal || null,
        careerPortal: values.careerPortal || null,
        reportRole: values.reportRole || null,
        additionalData,
      };

      try {
        const result = await updateCompany.mutateAsync(payload);
        if (!result.success) {
          message.error(result.error || "Failed to update company");
          return;
        }
        message.success("Company updated");
        onClose();
      } catch {
        message.error("Failed to update company");
      }
    },
    [message, onClose, updateCompany]
  );

  return (
    <Modal
      title={`Edit Company: ${company.name}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ maxWidth: 1400, top: 40 }}
      destroyOnHidden
      styles={{ body: { padding: "16px 24px" } }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* ── left: fields ── */}
          <div style={{ flex: "0 0 400px" }}>
            <Form.Item
              name="name"
              label="Company Name"
              rules={[{ required: true, message: "Company name is required" }]}
            >
              <Input
                placeholder="Acme Corp"
                onBlur={(e) => {
                  if (!slugManuallyEdited.current && !form.getFieldValue("slug")) {
                    form.setFieldValue("slug", toSlug(e.target.value));
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="slug"
              label="Slug"
              rules={[
                { required: true, message: "Slug is required" },
                {
                  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message: "Only lowercase letters, numbers and hyphens",
                },
              ]}
            >
              <Input
                placeholder="acme-corp"
                onChange={() => { slugManuallyEdited.current = true; }}
                addonAfter={
                  <Tooltip title="Generate slug from company name">
                    <ReloadOutlined
                      onClick={handleGenerateSlug}
                      style={{ cursor: "pointer" }}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>

            <Form.Item
              name="url"
              label="Website URL"
              rules={[
                { required: true, message: "Website URL is required" },
                { type: "url", message: "Enter a valid URL" },
              ]}
            >
              <Input placeholder="https://acme.com" />
            </Form.Item>

            <Form.Item
              name="investPortal"
              label="Invest Portal"
              rules={[{ type: "url", message: "Enter a valid URL" }]}
            >
              <Input placeholder="https://investors.acme.com" />
            </Form.Item>

            <Form.Item
              name="careerPortal"
              label="Career Portal"
              rules={[{ type: "url", message: "Enter a valid URL" }]}
            >
              <Input placeholder="https://careers.acme.com" />
            </Form.Item>

            <Form.Item name="countryCode" label="Country Code">
              <Input placeholder="US" maxLength={50} style={{ width: 120 }} />
            </Form.Item>

            <Form.Item name="industryId" label="Industry">
              <Select
                loading={industriesLoading}
                showSearch
                allowClear
                placeholder="Select industry"
                optionFilterProp="label"
                options={industries?.map((i) => ({ value: i.id, label: i.name }))}
              />
            </Form.Item>

            <Form.Item name="reportRole" label="Report Role" style={{ marginBottom: 0 }}>
              <Input placeholder="e.g. competitor, partner" />
            </Form.Item>
          </div>

          {/* ── right: JSON ── */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 14 }}>Additional Data (JSON)</Text>
              <Button
                size="small"
                icon={<BulbOutlined />}
                loading={generating}
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                Generate
              </Button>
            </div>
            <Form.Item name="additionalDataJson" style={{ marginBottom: 0 }}>
              <JsonEditor height="calc(90vh - 280px)" />
            </Form.Item>
          </div>
        </div>

        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={updateCompany.isPending}
          >
            Save Changes
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
