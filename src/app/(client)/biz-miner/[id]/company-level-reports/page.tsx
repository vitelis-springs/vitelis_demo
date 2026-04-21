"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { App, Button, Layout, Result, Spin, Typography } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DeepDiveBreadcrumbs from "../../../../../components/deep-dive/breadcrumbs";
import N8NTasksTable from "../../../../../components/n8n-tasks/n8n-tasks-table";
import { useAuth } from "../../../../../hooks/useAuth";

const { Content } = Layout;
const { Title } = Typography;

export default function CompanyLevelReportsPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const params = useParams();
	const [isLoading, setIsLoading] = useState(true);

	const reportId = Number(params.id);

	useEffect(() => {
		const timer = setTimeout(() => setIsLoading(false), 100);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isLoading && !isLoggedIn) router.push("/");
	}, [isLoggedIn, router, isLoading]);

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

	if (!Number.isFinite(reportId)) {
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
					status="404"
					title="Report not found"
					extra={
						<Button onClick={() => router.push("/biz-miner")}>Back</Button>
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
									{
										label: `Report #${reportId}`,
										href: `/biz-miner/${reportId}`,
									},
									{ label: "Company Level Reports" },
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
									onClick={() => router.push(`/biz-miner/${reportId}`)}
								>
									Back
								</Button>
								<Title level={2} style={{ margin: 0, color: "#58bfce" }}>
									Company Level Reports
								</Title>
							</div>
						</div>

						<N8NTasksTable reportId={reportId} />
					</div>
				</Content>
			</Layout>
		</App>
	);
}
