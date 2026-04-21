"use client";

import { Space, Tag } from "antd";
import Link from "next/link";
import { buildQueryHref } from "./report-route";

interface QueryIdTagsProps {
  ids: string[];
  reportId: number;
  basePath?: string;
}

export default function QueryIdTags({
  ids,
  reportId,
  basePath = "/deep-dive",
}: QueryIdTagsProps) {
  if (!ids.length) return <span style={{ color: "#595959" }}>—</span>;

  return (
    <Space size={2} wrap>
      {ids.map((id) => (
        <Link key={id} href={buildQueryHref(basePath, reportId, id)}>
          <Tag color="purple" style={{ cursor: "pointer" }}>#{id}</Tag>
        </Link>
      ))}
    </Space>
  );
}
