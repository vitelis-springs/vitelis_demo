"use client";

import { Button, Card, Space, Table, Typography } from "antd";
import { useRouter } from "next/navigation";
import { DeepDiveCompanyRow, DeepDiveStatus } from "../../hooks/api/useDeepDiveService";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

export default function CompaniesTable({
  reportId,
  companies,
  loading,
}: {
  reportId: number;
  companies: DeepDiveCompanyRow[];
  loading: boolean;
}) {
  const router = useRouter();

  return (
    <Card
      title="Companies"
      style={{ background: "#1f1f1f", border: "1px solid #303030" }}
      styles={{ header: { borderBottom: "1px solid #303030" } }}
    >
      <Table<DeepDiveCompanyRow>
        dataSource={companies}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: "Company",
            dataIndex: "name",
            render: (value: string, record) => (
              <Space direction="vertical" size={2}>
                <Text style={{ color: "#fff", fontWeight: 600 }}>{value}</Text>
                {record.countryCode && (
                  <Text style={{ color: "#8c8c8c" }}>{record.countryCode}</Text>
                )}
              </Space>
            ),
          },
          {
            title: "Status",
            dataIndex: "status",
            width: 120,
            render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
          },
          {
            title: "",
            width: 120,
            render: (_, record) => (
              <Button
                type="link"
                onClick={() => router.push(`/deep-dive/${reportId}/companies/${record.id}`)}
              >
                View
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}
