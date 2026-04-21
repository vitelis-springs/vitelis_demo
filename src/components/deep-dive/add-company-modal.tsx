"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { BulbOutlined, LinkOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useGetIndustries } from "../../hooks/api/useIndustriesService";
import {
  useAddCompanyToReport,
  useSearchCompanies,
  type CompanySearchResult,
} from "../../hooks/api/useDeepDiveService";
import JsonEditor from "./json-editor";

const { Text } = Typography;

interface Props {
  reportId: number;
  open: boolean;
  onClose: () => void;
}

interface NewCompanyFormValues {
  name: string;
  url?: string;
  countryCode?: string;
  industryId: number;
  slug: string;
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

function NewCompanyTab({
  reportId,
  onSuccess,
}: {
  reportId: number;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<NewCompanyFormValues>();
  const { data: industries, isLoading: industriesLoading } = useGetIndustries();
  const addCompany = useAddCompanyToReport(reportId);
  // tracks whether the user has manually edited the slug
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
          name: values.name || null,
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
  }, [form, message]);

  const handleGenerateSlug = useCallback(() => {
    const name = form.getFieldValue("name") as string;
    if (!name?.trim()) { message.warning("Enter company name first"); return; }
    const slug = toSlug(name);
    form.setFieldValue("slug", slug);
    form.validateFields(["slug"]);
    slugManuallyEdited.current = true;
  }, [form, message]);

  const handleSubmit = useCallback(
    async (values: NewCompanyFormValues) => {
      let additionalData: unknown = null;
      if (values.additionalDataJson?.trim()) {
        try { additionalData = JSON.parse(values.additionalDataJson); }
        catch { message.error("Invalid JSON in Additional Data"); return; }
      }

      try {
        await addCompany.mutateAsync({
          mode: "new",
          name: values.name,
          url: values.url || null,
          countryCode: values.countryCode || null,
          industryId: values.industryId ?? null,
          slug: values.slug || null,
          investPortal: values.investPortal || null,
          careerPortal: values.careerPortal || null,
          reportRole: values.reportRole || null,
          additionalData,
        });
        message.success("Company created and linked to report");
        form.resetFields();
        slugManuallyEdited.current = false;
        onSuccess();
      } catch {
        message.error("Failed to create company");
      }
    },
    [addCompany, form, message, onSuccess]
  );

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* ── left: fields ── */}
        <div style={{ flex: "0 0 360px" }}>
          <Form.Item
            name="name"
            label="Company Name"
            rules={[{ required: true, message: "Company name is required" }]}
          >
            <Input
              placeholder="Acme Corp"
              onBlur={(e) => {
                if (!slugManuallyEdited.current) {
                  form.setFieldValue("slug", toSlug(e.target.value));
                  form.validateFields(["slug"]);
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
            extra="Auto-generated from name, you can edit it manually"
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

          <Form.Item
            name="industryId"
            label="Industry"
            rules={[{ required: true, message: "Industry is required" }]}
          >
            <Select
              loading={industriesLoading}
              showSearch
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
            <Typography.Text style={{ fontSize: 14 }}>Additional Data (JSON)</Typography.Text>
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
            <JsonEditor height="calc(90vh - 340px)" />
          </Form.Item>
        </div>
      </div>

      <div style={{ textAlign: "right", marginTop: 16 }}>
        <Button
          type="primary"
          htmlType="submit"
          icon={<PlusOutlined />}
          loading={addCompany.isPending}
        >
          Create & Link
        </Button>
      </div>
    </Form>
  );
}

function ExistingCompanyTab({
  reportId,
  onSuccess,
}: {
  reportId: number;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] =
    useState<CompanySearchResult | null>(null);

  const { data: searchResult, isFetching } = useSearchCompanies(query);
  const addCompany = useAddCompanyToReport(reportId);

  const companies = searchResult?.data ?? [];

  const handleLink = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      await addCompany.mutateAsync({
        mode: "existing",
        companyId: selectedCompany.id,
      });
      message.success(`"${selectedCompany.name}" linked to report`);
      setQuery("");
      setSelectedCompany(null);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to link company";
      message.error(msg);
    }
  }, [addCompany, message, onSuccess, selectedCompany]);

  return (
    <div style={{ paddingTop: 8 }}>
      <Select
        showSearch
        placeholder="Search by company name..."
        filterOption={false}
        onSearch={setQuery}
        loading={isFetching}
        style={{ width: "100%", marginBottom: 16 }}
        allowClear
        onClear={() => {
          setQuery("");
          setSelectedCompany(null);
        }}
        value={selectedCompany?.id ?? null}
        onChange={(value) => {
          const found = companies.find((c) => c.id === value) ?? null;
          setSelectedCompany(found);
        }}
        notFoundContent={
          query.trim().length >= 2 && !isFetching ? (
            <Text type="secondary">No companies found</Text>
          ) : query.trim().length < 2 ? (
            <Text type="secondary">Type at least 2 characters</Text>
          ) : null
        }
        options={companies.map((c) => ({
          value: c.id,
          label: (
            <div>
              <Text style={{ fontWeight: 600 }}>{c.name}</Text>
              {c.countryCode && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {c.countryCode}
                </Text>
              )}
            </div>
          ),
        }))}
      />

      {selectedCompany && (
        <div
          style={{
            background: "#1d1d1d",
            border: "1px solid #303030",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontWeight: 600, display: "block" }}>
            {selectedCompany.name}
          </Text>
          {selectedCompany.countryCode && (
            <Text type="secondary">{selectedCompany.countryCode}</Text>
          )}
          {selectedCompany.url && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedCompany.url}
              </Text>
            </div>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: #{selectedCompany.id}
          </Text>
        </div>
      )}

      <div style={{ textAlign: "right" }}>
        <Button
          type="primary"
          icon={<LinkOutlined />}
          disabled={!selectedCompany}
          loading={addCompany.isPending}
          onClick={handleLink}
        >
          Link to Report
        </Button>
      </div>
    </div>
  );
}

export default function AddCompanyModal({ reportId, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState("new");

  useEffect(() => {
    if (!open) setActiveTab("new");
  }, [open]);

  return (
    <Modal
      title="Add Company to Report"
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ maxWidth: 1400, top: 40 }}
      destroyOnHidden
      styles={{ body: { padding: "16px 24px" } }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "new",
            label: "Create New",
            children: (
              <NewCompanyTab
                reportId={reportId}
                onSuccess={onClose}
              />
            ),
          },
          {
            key: "existing",
            label: "Add Existing",
            children: (
              <ExistingCompanyTab
                reportId={reportId}
                onSuccess={onClose}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}
