"use client";

import {
	FileExcelOutlined,
	FundOutlined,
	SearchOutlined,
	SettingOutlined,
	TableOutlined,
} from "@ant-design/icons";
import { App, Button, Layout, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
	useExportReport,
	useGetDeepDiveCompanies,
	useGetDeepDiveKpiChart,
	useGetDeepDiveOverview,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveBreadcrumbs from "./breadcrumbs";
import CompaniesTable from "./companies-table";
import KpiChartSection from "./kpi-chart-section";
import DeepDiveStatusTag from "./status-tag";
import SummaryCards from "./summary-cards";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function DeepDiveDetail({ reportId }: { reportId: number }) {
	const { message } = App.useApp();
	const { data: overviewData } = useGetDeepDiveOverview(reportId);
	const { data: kpiData, isLoading: isKpiLoading } =
		useGetDeepDiveKpiChart(reportId);
	const { data: companiesData, isLoading: isCompaniesLoading } =
		useGetDeepDiveCompanies(reportId);

	const report = overviewData?.data.report;
	const router = useRouter();

	const { listLabel, listHref, basePath } = (() => {
		if (report?.reportType === "internal")
			return {
				listLabel: "Vitelis Sales",
				listHref: "/vitelis-sales",
				basePath: "/vitelis-sales",
			};
		return {
			listLabel: "Biz Miner",
			listHref: "/biz-miner",
			basePath: "/biz-miner",
		};
	})();
	const exportReport = useExportReport(reportId, report?.name);

	const allCategories = useMemo(
		() => kpiData?.data.categories ?? [],
		[kpiData],
	);
	const kpiChart = useMemo(() => kpiData?.data.kpiChart ?? [], [kpiData]);
	const companies = useMemo(
		() => companiesData?.data.companies ?? [],
		[companiesData],
	);

	return (
		<Layout style={{ minHeight: "100vh", background: "#141414" }}>
			<Content
				style={{ padding: 24, background: "#141414", minHeight: "100vh" }}
			>
				<div style={{ maxWidth: 1400, width: "100%" }}>
					{/* Header */}
					<div style={{ marginBottom: 24 }}>
						<Space orientation="vertical" size={4}>
							<DeepDiveBreadcrumbs
								items={[
									{ label: listLabel, href: listHref },
									{ label: report?.name || `Report #${reportId}` },
								]}
							/>
							<Space align="center" size="middle">
								<Title level={2} style={{ margin: 0, color: "#58bfce" }}>
									{report?.name || `Deep Dive #${reportId}`}
								</Title>
								{report?.status && <DeepDiveStatusTag status={report.status} />}
								<Button
									icon={<FileExcelOutlined />}
									loading={exportReport.isPending}
									onClick={() => {
										exportReport.mutate(undefined, {
											onError: () =>
												void message.error("Failed to export report"),
										});
									}}
								>
									Export xlsx report
								</Button>
								<Button
									icon={<SearchOutlined />}
									onClick={() =>
										router.push(`${basePath}/${reportId}/try-query`)
									}
								>
									Try Query
								</Button>
								<Button
									icon={<SettingOutlined />}
									onClick={() =>
										router.push(`${basePath}/${reportId}/settings`)
									}
								>
									Settings
								</Button>
								{report?.reportType === "biz_miner" ? (
									<>
										<Button
											icon={<TableOutlined />}
											onClick={() =>
												router.push(`/biz-miner/${reportId}/model`)
											}
										>
											Model
										</Button>
										<Button
											icon={<FundOutlined />}
											onClick={() =>
												router.push(
													`/biz-miner/${reportId}/company-level-reports`,
												)
											}
										>
											Company Reports
										</Button>
									</>
								) : null}
							</Space>
							<Text style={{ color: "#8c8c8c" }}>
								{report?.description ||
									"Report overview and execution progress."}
							</Text>
							<Space size="middle" style={{ marginTop: 4 }}>
								{report?.useCase && (
									<Text style={{ color: "#8c8c8c" }}>
										Use Case:{" "}
										<Text style={{ color: "#d9d9d9" }}>
											{report.useCase.name}
										</Text>
									</Text>
								)}
								{report?.settings && (
									<Text style={{ color: "#8c8c8c" }}>
										Settings:{" "}
										<Text style={{ color: "#d9d9d9" }}>
											{report.settings.name}
										</Text>
									</Text>
								)}
							</Space>
						</Space>
					</div>

					<SummaryCards
						reportId={reportId}
						settingsName={report?.settings?.name ?? null}
						basePath={basePath}
					/>
					<KpiChartSection
						reportId={reportId}
						kpiChart={kpiChart}
						allCategories={allCategories}
						loading={isKpiLoading}
					/>
					<CompaniesTable
						reportId={reportId}
						companies={companies}
						loading={isCompaniesLoading}
						basePath={basePath}
					/>
				</div>
			</Content>
		</Layout>
	);
}
