"use client";

import { ReloadOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Result, Space, Spin, Switch, Tooltip, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageHeader from "../../../components/deep-dive/shared/page-header";
import DeepDivePageLayout from "../../../components/deep-dive/shared/page-layout";
import MonitoringSettingsModal from "../../../components/monitoring/monitoring-settings-modal";
import ReportRunsTable from "../../../components/monitoring/report-runs-table";
import SummaryCards from "../../../components/monitoring/summary-cards";
import {
	DEFAULT_MONITORING_REFETCH_MS,
	useMonitoringRuns,
} from "../../../hooks/api/useMonitoringService";
import { useAuth } from "../../../hooks/useAuth";

const { Text } = Typography;

function LoadingScreen() {
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

export default function MonitoringPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();

	const [isLoading, setIsLoading] = useState(true);
	const [autoRefresh, setAutoRefresh] = useState(true);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const { data, isFetching, refetch } = useMonitoringRuns({
		refetchInterval: autoRefresh ? DEFAULT_MONITORING_REFETCH_MS : false,
	});

	const result = data?.data;

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 100);

		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isLoading && !isLoggedIn) {
			router.push("/");
		}
	}, [isLoggedIn, router, isLoading]);

	if (isLoading) {
		return <LoadingScreen />;
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
					subTitle="You do not have permission to view this page."
					extra={
						<Button type="primary" onClick={() => router.push("/history")}>
							Go to My Reports
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<DeepDivePageLayout maxWidth={1600}>
			<PageHeader
				breadcrumbs={[]}
				title="Monitoring"
				extra={
					<>
						<Tooltip title="Refresh every 15s">
							<Switch
								checked={autoRefresh}
								onChange={setAutoRefresh}
								checkedChildren="Auto"
								unCheckedChildren="Off"
							/>
						</Tooltip>
						<Button
							icon={<ReloadOutlined />}
							loading={isFetching}
							onClick={() => void refetch()}
						>
							Refresh
						</Button>
						<Button
							icon={<SettingOutlined />}
							onClick={() => setSettingsOpen(true)}
						/>
					</>
				}
			/>

			<SummaryCards
				summary={result?.summary}
				loading={isFetching}
				stuckAfterMinutes={result?.stuckAfterMinutes ?? 60}
				lookbackHours={result?.lookbackHours ?? 24}
			/>

			<Space style={{ marginBottom: 12 }}>
				<Text style={{ color: "#595959", fontSize: 12 }}>
					Only steps that report an execution id and a start time are tracked.
					{result?.truncated
						? " Showing the most recently active runs only."
						: ""}
				</Text>
			</Space>

			<ReportRunsTable reports={result?.reports ?? []} loading={isFetching} />

			<MonitoringSettingsModal
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
		</DeepDivePageLayout>
	);
}
