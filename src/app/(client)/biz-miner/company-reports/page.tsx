"use client";

import { App, Button, Layout, Result, Select, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import DeepDiveBreadcrumbs from "../../../../components/deep-dive/breadcrumbs";
import N8NTasksTable from "../../../../components/n8n-tasks/n8n-tasks-table";
import { useAuth } from "../../../../hooks/useAuth";
import { useGetDeepDives } from "../../../../hooks/api/useDeepDiveService";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function CompanyReportsPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [selectedReportId, setSelectedReportId] = useState<number | undefined>(
		undefined,
	);

	useEffect(() => {
		const timer = setTimeout(() => setIsLoading(false), 100);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isLoading && !isLoggedIn) router.push("/");
	}, [isLoggedIn, router, isLoading]);

	const { data: reportsData, isLoading: reportsLoading } = useGetDeepDives({
		limit: 200,
		offset: 0,
		reportType: "biz_miner",
		sortBy: "id",
		sortOrder: "desc",
	});

	const reportOptions = useMemo(() => {
		const items = reportsData?.data.items ?? [];
		return [
			{ label: "All Reports", value: 0 },
			...items.map((r) => ({
				label: `#${r.id}${r.name ? ` — ${r.name}` : ""}`,
				value: r.id,
			})),
		];
	}, [reportsData]);

	if (isLoading) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Spin size="large" />
			</div>
		);
	}

	if (!isLoggedIn) return null;

	if (!isAdmin()) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Result
					status="403"
					title="Admin access required"
					extra={
						<Button type="primary" onClick={() => router.push("/biz-miner")}>
							Go to Biz Miner
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<App>
			<Layout style={{ minHeight: "100vh", background: "#141414" }}>
				<Content style={{ padding: 24, background: "#141414" }}>
					<div style={{ maxWidth: 1400 }}>
						<div style={{ marginBottom: 24 }}>
							<DeepDiveBreadcrumbs
								items={[
									{ label: "Biz Miner", href: "/biz-miner" },
									{ label: "Company Reports" },
								]}
							/>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 16,
									marginTop: 8,
								}}
							>
								<Button
									icon={<ArrowLeftOutlined />}
									onClick={() => router.push("/biz-miner")}
								>
									Back
								</Button>
								<Title level={2} style={{ margin: 0, color: "#58bfce" }}>
									Company Reports
								</Title>
							</div>
						</div>

						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 12,
								marginBottom: 24,
							}}
						>
							<Text style={{ color: "#8c8c8c", whiteSpace: "nowrap" }}>
								Report:
							</Text>
							<Select
								style={{ width: 320 }}
								loading={reportsLoading}
								options={reportOptions}
								value={selectedReportId === undefined ? 0 : selectedReportId}
								onChange={(v: number) =>
									setSelectedReportId(v === 0 ? undefined : v)
								}
								showSearch
								optionFilterProp="label"
								placeholder="Select report..."
							/>
							{selectedReportId === undefined && (
								<Text style={{ color: "#595959", fontSize: 12 }}>
									Select a specific report to add new tasks
								</Text>
							)}
						</div>

						<N8NTasksTable reportId={selectedReportId} />
					</div>
				</Content>
			</Layout>
		</App>
	);
}
