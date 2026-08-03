"use client";

import { App, Layout, Spin, Tabs, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useGetDeepDiveOverview } from "../../hooks/api/useDeepDiveService";
import { useEnsureOrchestrator } from "../../hooks/api/useReportStepsService";
import DeepDiveBreadcrumbs from "../deep-dive/breadcrumbs";
import OrchestratorBar from "./steps-dashboard/OrchestratorBar";
import StepsConfig from "./steps-dashboard/StepsConfig";
import StepsDashboard from "./steps-dashboard/StepsDashboard";

const { Content } = Layout;
const { Title, Text } = Typography;

type TabKey = "dashboard" | "config";
const TAB_KEYS: TabKey[] = ["dashboard", "config"];

interface ReportStepsManagerProps {
	reportId: number;
}

function resolveSection(reportType?: string | null): {
	label: string;
	href: string;
} {
	if (reportType === "biz_miner")
		return { label: "Biz Miner", href: "/biz-miner" };
	if (reportType === "sales_miner")
		return { label: "Sales Miner", href: "/sales-miner" };
	if (reportType === "internal")
		return { label: "Vitelis Sales", href: "/vitelis-sales" };
	return { label: "Deep Dives", href: "/deep-dive" };
}

export default function ReportStepsManager({
	reportId,
}: ReportStepsManagerProps) {
	const { message } = App.useApp();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const tabParam = searchParams.get("tab");
	const activeTab: TabKey = TAB_KEYS.includes(tabParam as TabKey)
		? (tabParam as TabKey)
		: "dashboard";

	const { data: overviewData, isLoading: reportLoading } =
		useGetDeepDiveOverview(reportId);
	const ensureOrchestrator = useEnsureOrchestrator(reportId);
	const hasEnsuredRef = useRef(false);

	const report = overviewData?.data?.report;

	useEffect(() => {
		if (hasEnsuredRef.current) return;
		hasEnsuredRef.current = true;
		ensureOrchestrator.mutate(undefined, {
			onError: () => message.error("Failed to initialize orchestrator"),
		});
	}, [ensureOrchestrator, message]);

	const setTab = (next: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", next);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	if (reportLoading) {
		return (
			<Layout style={{ minHeight: "100vh", background: "#141414" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
					}}
				>
					<Spin size="large" />
				</div>
			</Layout>
		);
	}

	return (
		<Layout style={{ minHeight: "100vh", background: "#141414" }}>
			<Content
				style={{ padding: 24, background: "#141414", minHeight: "100vh" }}
			>
				<div style={{ maxWidth: 1600, width: "100%" }}>
					<div style={{ marginBottom: 16 }}>
						<DeepDiveBreadcrumbs
							items={[
								resolveSection(report?.reportType),
								{
									label: report?.name || `Report #${reportId}`,
									href: `${resolveSection(report?.reportType).href}/${reportId}`,
								},
								{ label: "Steps" },
							]}
						/>
						<Title level={2} style={{ margin: "8px 0 0", color: "#58bfce" }}>
							Report steps
						</Title>
						<Text style={{ color: "#8c8c8c" }}>
							Track generation progress and configure the step pipeline.
						</Text>
					</div>

					<OrchestratorBar reportId={reportId} />

					<Tabs
						activeKey={activeTab}
						onChange={setTab}
						items={[
							{
								key: "dashboard",
								label: "Dashboard",
								children: <StepsDashboard reportId={reportId} />,
							},
							{
								key: "config",
								label: "Config",
								children: (
									<StepsConfig
										reportId={reportId}
										reportType={report?.reportType}
									/>
								),
							},
						]}
					/>
				</div>
			</Content>
		</Layout>
	);
}
