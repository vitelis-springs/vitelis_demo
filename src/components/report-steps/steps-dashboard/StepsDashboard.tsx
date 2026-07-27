"use client";

import { Empty, Spin } from "antd";
import { useGetStepsMatrix } from "../../../hooks/api/useReportStepsService";
import StepsBoard from "./StepsBoard";
import styles from "./steps-board.module.css";

/**
 * Dashboard tab. The status board is the whole dashboard: it reads progress
 * and edits statuses in one place, on desktop as a grid and on mobile as
 * per-company cards.
 */
export default function StepsDashboard({ reportId }: { reportId: number }) {
	const { data, isLoading } = useGetStepsMatrix(reportId, {
		refetchInterval: 20000,
	});
	const matrix = data?.data;

	if (isLoading || !matrix) {
		return (
			<div style={{ textAlign: "center", padding: 60 }}>
				<Spin size="large" />
			</div>
		);
	}

	if (matrix.companies.length === 0 || matrix.steps.length === 0) {
		return (
			<section className={styles.wrap}>
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description={
						<span style={{ color: "#8c8c8c" }}>
							{matrix.steps.length === 0
								? "No steps configured yet. Add steps in the Config tab to start tracking progress."
								: "No companies in this report yet."}
						</span>
					}
				/>
			</section>
		);
	}

	return <StepsBoard reportId={reportId} matrix={matrix} />;
}
