"use client";

import { Space, Tag } from "antd";
import Link from "next/link";

interface QueryIdTagsProps {
  ids: string[];
  reportId: number;
}

export default function QueryIdTags({ ids, reportId }: QueryIdTagsProps) {
  if (!ids.length) return <span style={{ color: "#595959" }}>—</span>;

  return (
    <Space size={2} wrap>
      {ids.map((id) => (
        <Link key={id} href={`/deep-dive/${reportId}/query?queryId=${id}`}>
          <Tag color="purple" style={{ cursor: "pointer" }}>#{id}</Tag>
        </Link>
      ))}
    </Space>
  );
}
