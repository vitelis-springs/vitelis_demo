"use client";

import { Button, Layout, Result, Spin, theme } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OpportunityDetailWorkspace from "../../../../../../../../components/sales-miner/opportunity-detail/opportunity-detail-workspace";
import Sidebar from "../../../../../../../../components/ui/sidebar";
import { SIDEBAR_MARGIN_LEFT } from "../../../../../../../../components/ui/sidebar-layout";
import { useAuth } from "../../../../../../../../hooks/useAuth";

export default function SalesMinerOpportunityDetailPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const params = useParams();
	const [isLoading, setIsLoading] = useState(true);

	const reportId = Number(params.id);
	const companyId = Number(params.companyId);
	const opportunityId = String(params.oppId ?? "");

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
						<Button type="primary" onClick={() => router.push("/history")}>
							Go to My Reports
						</Button>
					}
				/>
			</div>
		);
	}

	if (
		!Number.isFinite(reportId) ||
		!Number.isFinite(companyId) ||
		!opportunityId
	) {
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
					title="Opportunity not found"
					extra={
						<Button type="primary" onClick={() => router.push("/sales-miner")}>
							Back to list
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<SalesMinerOpportunityDetailView
			reportId={reportId}
			companyId={companyId}
			opportunityId={opportunityId}
		/>
	);
}

function SalesMinerOpportunityDetailView({
	reportId,
	companyId,
	opportunityId,
}: {
	reportId: number;
	companyId: number;
	opportunityId: string;
}) {
	const { token } = theme.useToken();
	return (
		<Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
			<Sidebar />
			<Layout
				style={{
					marginLeft: SIDEBAR_MARGIN_LEFT,
					background: token.colorBgLayout,
				}}
			>
				<Layout.Content
					style={{
						padding: "28px clamp(16px, 4vw, 40px)",
						background: token.colorBgLayout,
						minHeight: "100vh",
					}}
				>
					<OpportunityDetailWorkspace
						reportId={reportId}
						companyId={companyId}
						opportunityId={opportunityId}
					/>
				</Layout.Content>
			</Layout>
		</Layout>
	);
}
