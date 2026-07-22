"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Layout, Space, Tabs, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useGetDeepDiveOverview } from "../../hooks/api/useDeepDiveService";
import AccountSignalsTable from "./account-signals-table";
import DeepDiveBreadcrumbs from "../deep-dive/breadcrumbs";
import SignalStatsTable from "../deep-dive/signal-stats-table";

const { Content } = Layout;
const { Title } = Typography;

const BG = "#141414";

export default function SalesMinerSignalCatalogPage({
	reportId,
}: {
	reportId: number;
}) {
	const router = useRouter();
	const { data: overviewData } = useGetDeepDiveOverview(reportId);
	const report = overviewData?.data.report;
	const reportName = report?.name || `Report #${reportId}`;

	return (
		<Layout style={{ minHeight: "100vh", background: BG }}>
			<Content style={{ padding: 24, background: BG, minHeight: "100vh" }}>
				<div style={{ maxWidth: 1400, width: "100%" }}>
					<div style={{ marginBottom: 16 }}>
						<DeepDiveBreadcrumbs
							items={[
								{ label: "Sales Miner", href: "/sales-miner" },
								{
									label: reportName,
									href: `/sales-miner/reports/${reportId}`,
								},
								{ label: "Signal Catalog" },
							]}
						/>
						<Space size="middle" align="center" wrap style={{ marginTop: 8 }}>
							<Button
								icon={<ArrowLeftOutlined />}
								onClick={() => router.push(`/sales-miner/reports/${reportId}`)}
							>
								Back
							</Button>
							<Title level={2} style={{ margin: 0, color: "#58bfce" }}>
								Signal Catalog
							</Title>
						</Space>
					</div>

					<Tabs
						defaultActiveKey="signals"
						items={[
							{
								key: "signals",
								label: "Signals",
								children: <AccountSignalsTable reportId={reportId} />,
							},
							{
								key: "statistics",
								label: "Statistics",
								children: <SignalStatsTable reportId={reportId} />,
							},
						]}
					/>
				</div>
			</Content>
		</Layout>
	);
}
