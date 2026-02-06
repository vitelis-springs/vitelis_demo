"use client";

import { Button, Input, InputNumber, Select, Space, Tag, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useState } from "react";

const { Text } = Typography;

type PineconeOperator =
  | "$eq"
  | "$ne"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$in"
  | "$nin"
  | "$exists";

type Connector = "$and" | "$or";

interface FilterRow {
  id: number;
  field: string;
  operator: PineconeOperator;
  value: string;
  connector: Connector;
}

const KNOWN_FIELDS = [
  { label: "tier", value: "tier", type: "number" as const },
  { label: "date", value: "date", type: "number" as const },
  { label: "total_score", value: "total_score", type: "number" as const },
  { label: "authority", value: "authority", type: "number" as const },
  { label: "freshness", value: "freshness", type: "number" as const },
  { label: "originality", value: "originality", type: "number" as const },
  { label: "security", value: "security", type: "number" as const },
  { label: "extractability", value: "extractability", type: "number" as const },
  { label: "source", value: "source", type: "string" as const },
  { label: "use_case", value: "use_case", type: "string" as const },
  { label: "industry_id", value: "industry_id", type: "number" as const },
];

const OPERATORS: Array<{ label: string; value: PineconeOperator; description: string }> = [
  { label: "=", value: "$eq", description: "Equal" },
  { label: "≠", value: "$ne", description: "Not equal" },
  { label: ">", value: "$gt", description: "Greater than" },
  { label: "≥", value: "$gte", description: "Greater or equal" },
  { label: "<", value: "$lt", description: "Less than" },
  { label: "≤", value: "$lte", description: "Less or equal" },
  { label: "in", value: "$in", description: "In list (comma-separated)" },
  { label: "not in", value: "$nin", description: "Not in list (comma-separated)" },
  { label: "exists", value: "$exists", description: "Field exists" },
];

function getFieldType(field: string): "number" | "string" {
  return KNOWN_FIELDS.find((f) => f.value === field)?.type ?? "string";
}

function parseFilterValue(
  rawValue: string,
  operator: PineconeOperator,
  fieldType: "number" | "string",
): unknown {
  if (operator === "$exists") return true;

  if (operator === "$in" || operator === "$nin") {
    const parts = rawValue.split(",").map((s) => s.trim()).filter(Boolean);
    return fieldType === "number" ? parts.map(Number) : parts;
  }

  if (fieldType === "number") return Number(rawValue);
  return rawValue;
}

function toCondition(row: FilterRow): Record<string, unknown> {
  const fieldType = getFieldType(row.field);
  const parsed = parseFilterValue(row.value, row.operator, fieldType);
  return { [row.field]: { [row.operator]: parsed } };
}

/**
 * Groups consecutive rows by their connector into Pinecone-compatible
 * $and / $or blocks, then merges groups under a top-level $and.
 *
 * Example rows: A, AND B, AND C, OR D, OR E, AND F
 * Groups:       [$and: A,B,C]  [$or: D,E]  [$and: F]
 * Result:       { $and: [ {$and:[A,B,C]}, {$or:[D,E]}, F ] }
 *
 * If only one group exists the outer $and wrapper is omitted.
 */
function buildFilterObject(rows: FilterRow[]): Record<string, unknown> {
  const valid = rows.filter(
    (r) => r.field && (r.operator === "$exists" || r.value !== ""),
  );

  if (valid.length === 0) return {};
  if (valid.length === 1) return toCondition(valid[0]!);

  // Split into groups of consecutive same-connector rows
  const groups: Array<{ connector: Connector; conditions: Array<Record<string, unknown>> }> = [];

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i]!;
    const cond = toCondition(row);

    if (i === 0) {
      // First row starts its own group; connector of the *second* row decides
      const nextConnector = valid[1]?.connector ?? "$and";
      groups.push({ connector: nextConnector, conditions: [cond] });
      continue;
    }

    const currentGroup = groups[groups.length - 1]!;
    if (row.connector === currentGroup.connector) {
      currentGroup.conditions.push(cond);
    } else {
      groups.push({ connector: row.connector, conditions: [cond] });
    }
  }

  // Flatten each group into a Pinecone expression
  const expressions = groups.map((g) => {
    if (g.conditions.length === 1) return g.conditions[0]!;
    return { [g.connector]: g.conditions };
  });

  if (expressions.length === 1) return expressions[0]!;

  // Multiple groups → combine under top-level $and
  return { $and: expressions };
}

let nextId = 1;

interface MetadataFilterBuilderProps {
  onChange: (filters: Record<string, unknown>) => void;
}

export default function MetadataFilterBuilder({ onChange }: MetadataFilterBuilderProps) {
  const [rows, setRows] = useState<FilterRow[]>([]);

  const emit = (current: FilterRow[]) => {
    onChange(buildFilterObject(current));
  };

  const addRow = () => {
    const updated: FilterRow[] = [
      ...rows,
      { id: nextId++, field: "tier", operator: "$eq", value: "", connector: "$and" },
    ];
    setRows(updated);
  };

  const removeRow = (id: number) => {
    const updated = rows.filter((r) => r.id !== id);
    setRows(updated);
    emit(updated);
  };

  const updateRow = (id: number, patch: Partial<FilterRow>) => {
    const updated = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRows(updated);
    emit(updated);
  };

  const toggleConnector = (id: number) => {
    const updated = rows.map((r) =>
      r.id === id ? { ...r, connector: (r.connector === "$and" ? "$or" : "$and") as Connector } : r,
    );
    setRows(updated);
    emit(updated);
  };

  return (
    <div>
      <Space size={4} style={{ marginBottom: 8 }}>
        <Text style={{ color: "#8c8c8c" }}>Metadata Filters</Text>
        <Tag color="default" style={{ fontSize: 11 }}>Pinecone</Tag>
      </Space>

      {rows.map((row, idx) => {
        const isListOp = row.operator === "$in" || row.operator === "$nin";
        const isExistsOp = row.operator === "$exists";
        const fieldType = getFieldType(row.field);

        return (
          <Space key={row.id} size="small" style={{ display: "flex", marginBottom: 8 }} wrap>
            {/* Connector tag — clickable to toggle AND/OR */}
            <Tag
              color={idx === 0 ? "default" : row.connector === "$and" ? "blue" : "orange"}
              style={{
                minWidth: 42,
                textAlign: "center",
                margin: 0,
                cursor: idx === 0 ? "default" : "pointer",
                userSelect: "none",
              }}
              onClick={idx > 0 ? () => toggleConnector(row.id) : undefined}
            >
              {idx === 0 ? "WHERE" : row.connector === "$and" ? "AND" : "OR"}
            </Tag>

            <Select
              style={{ width: 160 }}
              showSearch
              value={row.field}
              onChange={(val) => updateRow(row.id, { field: val })}
              options={KNOWN_FIELDS.map((f) => ({
                label: f.label,
                value: f.value,
              }))}
            />
            <Select
              style={{ width: 100 }}
              value={row.operator}
              onChange={(val) => updateRow(row.id, { operator: val })}
              options={OPERATORS.map((op) => ({
                label: `${op.label}`,
                value: op.value,
                title: op.description,
              }))}
            />
            {isExistsOp ? (
              <Tag color="green" style={{ margin: 0, lineHeight: "30px" }}>
                exists
              </Tag>
            ) : isListOp ? (
              <Input
                style={{ width: 240 }}
                placeholder="value1, value2, ..."
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
              />
            ) : fieldType === "number" ? (
              <InputNumber
                style={{ width: 240 }}
                placeholder="value"
                value={row.value !== "" ? Number(row.value) : undefined}
                onChange={(val) =>
                  updateRow(row.id, { value: val != null ? String(val) : "" })
                }
              />
            ) : (
              <Input
                style={{ width: 240 }}
                placeholder="value"
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
              />
            )}
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeRow(row.id)}
            />
          </Space>
        );
      })}

      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={addRow}
        style={{ width: "100%" }}
      >
        Add Filter
      </Button>
    </div>
  );
}
