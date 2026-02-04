"use client";

import { Card, Space, Table, Typography } from "antd";
import { useRouter } from "next/navigation";
import { DeepDiveCompanyRow, DeepDiveStatus } from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE, DARK_CARD_HEADER_STYLE } from "../../config/chart-theme";
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
      style={DARK_CARD_STYLE}
      styles={{ header: DARK_CARD_HEADER_STYLE }}
    >
      <Table<DeepDiveCompanyRow>
        dataSource={companies}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => router.push(`/deep-dive/${reportId}/companies/${record.id}`),
          style: { cursor: "pointer" },
        })}
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
        ]}
      />
    </Card>
  );
}
