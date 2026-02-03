'use client';

import { Tag } from "antd";
import { DeepDiveStatus } from "../../hooks/api/useDeepDiveService";

const STATUS_COLOR: Record<DeepDiveStatus, string> = {
  PENDING: "default",
  PROCESSING: "processing",
  DONE: "success",
  ERROR: "error",
};

export default function DeepDiveStatusTag({ status }: { status: DeepDiveStatus }) {
  return <Tag color={STATUS_COLOR[status]}>{status}</Tag>;
}
