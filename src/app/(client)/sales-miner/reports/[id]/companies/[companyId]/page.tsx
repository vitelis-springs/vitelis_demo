"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Layout, Result, Spin, theme } from "antd";
import { useAuth } from "../../../../../../../hooks/useAuth";
import OpportunityCardsGrid from "../../../../../../../components/sales-miner/opportunity-cards/opportunity-cards-grid";
import Sidebar from "../../../../../../../components/ui/sidebar";
import { SIDEBAR_MARGIN_LEFT } from "../../../../../../../components/ui/sidebar-layout";

export default function SalesMinerCompanyPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const params = useParams();
	const [isLoading, setIsLoading] = useState(true);

	const reportId = Number(params.id);
	const companyId = Number(params.companyId);

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

	if (!Number.isFinite(reportId) || !Number.isFinite(companyId)) {
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
					title="Company not found"
					extra={
						<Button type="primary" onClick={() => router.push("/sales-miner")}>
							Back to list
						</Button>
					}
				/>
			</div>
		);
	}

	return <CompanyOpportunitiesView reportId={reportId} companyId={companyId} />;
}

function CompanyOpportunitiesView({
	reportId,
	companyId,
}: {
	reportId: number;
	companyId: number;
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
					<OpportunityCardsGrid reportId={reportId} companyId={companyId} />
				</Layout.Content>
			</Layout>
		</Layout>
	);
}
