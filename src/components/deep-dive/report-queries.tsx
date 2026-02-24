"use client";

import {
  Button, Col, Collapse, Input, message, Progress,
  Row, Space, Spin, Tag, Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReportQueryItem, useGetReportQueries, useUpdateQuery,
} from "../../hooks/api/useDeepDiveService";
import DeepDivePageLayout from "./shared/page-layout";
import PageHeader from "./shared/page-header";
import StatCard from "./shared/stat-card";

const { Text } = Typography;

interface Props {
  reportId: number;
  highlightQueryId: number | null;
}

interface EditState {
  goal: string;
  searchQueries: string[];
}

export default function ReportQueries({ reportId, highlightQueryId }: Props) {
  const { data, isLoading } = useGetReportQueries(reportId);
  const updateMutation = useUpdateQuery(reportId);

  const queries = data?.data?.queries ?? [];
  const reportName = data?.data?.reportName ?? `Report #${reportId}`;

  /* ── edit state ── */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ goal: "", searchQueries: [] });

  /* ── auto-expand highlighted query ── */
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (highlightQueryId && queries.length > 0 && !scrolledRef.current) {
      const key = String(highlightQueryId);
      setActiveKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setTimeout(() => {
        const el = document.querySelector(`[data-query-id="${highlightQueryId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolledRef.current = true;
      }, 300);
    }
  }, [highlightQueryId, queries.length]);

  /* ── summary stats ── */
  const summary = useMemo(() => {
    const totalQueries = queries.length;
    const avgCompletion = totalQueries > 0
      ? Math.round(queries.reduce((sum, q) => sum + q.completionPercent, 0) / totalQueries)
      : 0;
    const totalSources = queries.reduce((sum, q) => sum + q.sourcesCount, 0);
    return { totalQueries, avgCompletion, totalSources };
  }, [queries]);

  /* ── editing handlers ── */
  const startEditing = useCallback((query: ReportQueryItem) => {
    setEditingId(query.id);
    setEditState({ goal: query.goal, searchQueries: [...query.searchQueries] });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditState({ goal: "", searchQueries: [] });
  }, []);

  const updateSearchQuery = useCallback((index: number, value: string) => {
    setEditState((prev) => {
      const next = [...prev.searchQueries];
      next[index] = value;
      return { ...prev, searchQueries: next };
    });
  }, []);

  const removeSearchQuery = useCallback((index: number) => {
    setEditState((prev) => ({
      ...prev,
      searchQueries: prev.searchQueries.filter((_, i) => i !== index),
    }));
  }, []);

  const addSearchQuery = useCallback(() => {
    setEditState((prev) => ({
      ...prev,
      searchQueries: [...prev.searchQueries, ""],
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingId) return;
    if (!editState.goal.trim()) {
      void message.warning("Goal cannot be empty");
      return;
    }
    const filtered = editState.searchQueries.filter((q) => q.trim() !== "");
    try {
      await updateMutation.mutateAsync({
        queryId: editingId,
        payload: { goal: editState.goal.trim(), searchQueries: filtered },
      });
      void message.success("Query updated");
      cancelEditing();
    } catch {
      void message.error("Failed to update query");
    }
  }, [editingId, editState, updateMutation, cancelEditing]);

  /* ── render helpers ── */
  const renderPanelHeader = useCallback(
    (query: ReportQueryItem) => (
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
        <Tag color="blue" style={{ fontFamily: "monospace" }}>#{query.id}</Tag>
        <Text style={{ flex: 1, color: "#d9d9d9" }} ellipsis={{ tooltip: query.goal }}>
          {query.goal.slice(0, 70) + "..." || "No goal"}
        </Text>
        <Progress percent={query.completionPercent} size="small" style={{ width: 120, margin: 0 }} strokeColor="#58bfce" />
        <Tag color="green">{query.sourcesCount} src</Tag>
        <Tag color="orange">{query.candidatesCount} cand</Tag>
      </div>
    ),
    [],
  );

  const renderPanelBody = useCallback(
    (query: ReportQueryItem) => {
      const isEditing = editingId === query.id;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Text strong style={{ color: "#8c8c8c", display: "block", marginBottom: 4 }}>Goal</Text>
            {isEditing ? (
              <Input.TextArea value={editState.goal}
                onChange={(e) => setEditState((prev) => ({ ...prev, goal: e.target.value }))}
                autoSize={{ minRows: 2, maxRows: 6 }} />
            ) : (
              <Text style={{ color: "#d9d9d9", whiteSpace: "pre-wrap" }}>{query.goal || "—"}</Text>
            )}
          </div>
          <div>
            <Text strong style={{ color: "#8c8c8c", display: "block", marginBottom: 4 }}>
              Search Queries ({isEditing ? editState.searchQueries.length : query.searchQueries.length})
            </Text>
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {editState.searchQueries.map((sq, i) => (
                  <Space key={i} style={{ width: "100%" }}>
                    <Input value={sq} onChange={(e) => updateSearchQuery(i, e.target.value)}
                      style={{ flex: 1, minWidth: 400 }} placeholder="Search query..." />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeSearchQuery(i)} />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addSearchQuery} style={{ width: 200 }}>Add query</Button>
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {query.searchQueries.map((sq, i) => <li key={i} style={{ color: "#d9d9d9" }}>{sq}</li>)}
                {query.searchQueries.length === 0 && <Text type="secondary">No search queries</Text>}
              </ul>
            )}
          </div>
          {query.dataPoints.length > 0 && (
            <div>
              <Text strong style={{ color: "#8c8c8c", display: "block", marginBottom: 4 }}>Data Points</Text>
              <Space wrap size={4}>
                {query.dataPoints.map((dp) => <Tag key={dp.id} color="purple">{dp.name || dp.id}</Tag>)}
              </Space>
            </div>
          )}
          <div>
            <Text strong style={{ color: "#8c8c8c", display: "block", marginBottom: 4 }}>Completion</Text>
            <Text style={{ color: "#d9d9d9" }}>
              {query.completedCompanies} / {query.totalCompanies} companies ({query.completionPercent}%)
            </Text>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isEditing ? (
              <>
                <Button type="primary" onClick={handleSave} loading={updateMutation.isPending}>Save</Button>
                <Button onClick={cancelEditing}>Cancel</Button>
              </>
            ) : (
              <Button icon={<EditOutlined />} onClick={() => startEditing(query)}>Edit</Button>
            )}
          </div>
        </div>
      );
    },
    [editingId, editState, handleSave, updateMutation.isPending, cancelEditing, startEditing, updateSearchQuery, removeSearchQuery, addSearchQuery],
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <DeepDivePageLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Deep Dives", href: "/deep-dive" },
          { label: reportName, href: `/deep-dive/${reportId}` },
          { label: "Queries" },
        ]}
        title={`Report Queries — ${reportName}`}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}><StatCard label="Total Queries" value={summary.totalQueries} /></Col>
        <Col xs={24} md={8}><StatCard label="Avg Completion" value={`${summary.avgCompletion}%`} valueColor="#58bfce" /></Col>
        <Col xs={24} md={8}><StatCard label="Total Sources" value={summary.totalSources} valueColor="#52c41a" /></Col>
      </Row>

      {queries.map((query) => (
        <div key={query.id} data-query-id={query.id}>
          <Collapse
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys as string[])}
            style={{ background: "transparent", border: "none", marginBottom: 12 }}
            items={[{
              key: String(query.id),
              label: renderPanelHeader(query),
              children: renderPanelBody(query),
              style: {
                background: "#1f1f1f",
                border: highlightQueryId === query.id ? "2px solid #58bfce" : "1px solid #303030",
                borderRadius: 8,
              },
            }]}
          />
        </div>
      ))}
    </DeepDivePageLayout>
  );
}
