"use client";

import {
	CheckCircleOutlined,
	CloseCircleOutlined,
	PartitionOutlined,
	SyncOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Skeleton, Space, Tag, Typography } from "antd";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import type { MonitorSummary } from "../../hooks/api/useMonitoringService";

const { Text, Title } = Typography;

const RUN_COLOR = "#b37feb";
const RUNNING_COLOR = "#58bfce";
const STUCK_COLOR = "#faad14";
const ERROR_COLOR = "#ff4d4f";
const IDLE_COLOR = "#8c8c8c";

function SummaryCard({
	label,
	value,
	color,
	icon,
	hint,
}: {
	label: string;
	value: number;
	color: string;
	icon: React.ReactNode;
	hint: string;
}) {
	return (
		<Card style={DARK_CARD_STYLE}>
			<Text style={{ color: "#8c8c8c" }}>
				<span style={{ marginRight: 6 }}>{icon}</span>
				{label}
			</Text>
			<Title
				level={2}
				style={{ margin: "4px 0 0", color: value > 0 ? color : IDLE_COLOR }}
			>
				{value}
			</Title>
			<Text style={{ color: "#595959", fontSize: 12 }}>{hint}</Text>
		</Card>
	);
}

export default function SummaryCards({
	summary,
	loading,
	stuckAfterMinutes,
	lookbackHours,
}: {
	summary: MonitorSummary | undefined;
	loading: boolean;
	stuckAfterMinutes: number;
	lookbackHours: number;
}) {
	if (!summary) {
		return (
			<Card style={{ ...DARK_CARD_STYLE, marginBottom: 24 }}>
				<Skeleton active paragraph={{ rows: 2 }} loading={loading} />
			</Card>
		);
	}

	return (
		<div style={{ marginBottom: 24 }}>
			<Row gutter={[16, 16]}>
				<Col xs={24} md={6}>
					<SummaryCard
						label="Runs"
						value={summary.runs}
						color={RUN_COLOR}
						icon={<PartitionOutlined />}
						hint={`Report runs active in the last ${lookbackHours}h`}
					/>
				</Col>
				<Col xs={24} md={6}>
					<SummaryCard
						label="Running"
						value={summary.running}
						color={RUNNING_COLOR}
						icon={<SyncOutlined spin={summary.running > 0} />}
						hint="Steps currently in progress"
					/>
				</Col>
				<Col xs={24} md={6}>
					<SummaryCard
						label="Stuck"
						value={summary.stuck}
						color={STUCK_COLOR}
						icon={<WarningOutlined />}
						hint={`Running for over ${stuckAfterMinutes} min`}
					/>
				</Col>
				<Col xs={24} md={6}>
					<SummaryCard
						label="Failed"
						value={summary.errors}
						color={ERROR_COLOR}
						icon={<CloseCircleOutlined />}
						hint="Failed steps in those runs"
					/>
				</Col>
			</Row>

			{summary.byProduct.length > 0 ? (
				<Space wrap style={{ marginTop: 12 }}>
					{summary.byProduct.map((bucket) => (
						<Tag key={bucket.reportType} style={{ padding: "2px 10px" }}>
							<Text style={{ color: "#d9d9d9" }}>{bucket.label}</Text>
							<Text style={{ color: RUN_COLOR, marginLeft: 8 }}>
								{bucket.runs} runs
							</Text>
							<Text style={{ color: RUNNING_COLOR, marginLeft: 8 }}>
								{bucket.running} running
							</Text>
							{bucket.stuck > 0 ? (
								<Text style={{ color: STUCK_COLOR, marginLeft: 8 }}>
									{bucket.stuck} stuck
								</Text>
							) : null}
							{bucket.errors > 0 ? (
								<Text style={{ color: ERROR_COLOR, marginLeft: 8 }}>
									{bucket.errors} failed
								</Text>
							) : null}
						</Tag>
					))}
				</Space>
			) : (
				<Space style={{ marginTop: 12 }}>
					<Text style={{ color: "#595959", fontSize: 12 }}>
						<CheckCircleOutlined style={{ marginRight: 6 }} />
						No report runs in the current window.
					</Text>
				</Space>
			)}
		</div>
	);
}
