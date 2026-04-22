"use client";

import {
	Card,
	List,
	Button,
	Empty,
	Typography,
	Space,
	Tag,
	Segmented,
	Input,
} from "antd";
import { PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
	DARK_CARD_STYLE,
	DARK_CARD_HEADER_STYLE,
} from "../../config/chart-theme";
import type {
	GenerationStep,
	StepReportType,
} from "../../hooks/api/useReportStepsService";

const { Text } = Typography;
const { Search } = Input;

interface AvailableStepsListProps {
	steps: GenerationStep[];
	loading: boolean;
	onAdd: (stepId: number) => void;
	onOpenSettings: (step: GenerationStep) => void;
	addingStepId: number | null;
	reportType?: string | null;
}

export default function AvailableStepsList({
	steps,
	loading,
	onAdd,
	onOpenSettings,
	addingStepId,
	reportType,
}: AvailableStepsListProps) {
	const [filter, setFilter] = useState<StepReportType | "all">("all");
	const [searchValue, setSearchValue] = useState("");

	useEffect(() => {
		if (reportType === "biz_miner" || reportType === "sales_miner") {
			setFilter(reportType);
		}
	}, [reportType]);

	const filtered = useMemo(() => {
		const normalizedQuery = searchValue.trim().toLowerCase();

		return steps.filter((step) => {
			const matchesType =
				filter === "all" ||
				step.reportType === filter ||
				step.reportType === null;
			if (!matchesType) return false;

			if (!normalizedQuery) return true;
			return step.name.toLowerCase().includes(normalizedQuery);
		});
	}, [steps, filter, searchValue]);

	return (
		<Card
			title="Available Steps"
			style={DARK_CARD_STYLE}
			styles={{
				header: DARK_CARD_HEADER_STYLE,
				body: { padding: 0 },
			}}
			extra={
				<Segmented
					size="small"
					value={filter}
					onChange={(v) => setFilter(v as StepReportType | "all")}
					options={[
						{ label: "All", value: "all" },
						{ label: "BizMiner", value: "biz_miner" },
						{ label: "SalesMiner", value: "sales_miner" },
					]}
				/>
			}
		>
			<div style={{ height: 480, overflowY: "auto", padding: "8px 24px" }}>
				<div style={{ marginBottom: 12, paddingTop: 8 }}>
					<Search
						allowClear
						placeholder="Search step by name"
						value={searchValue}
						onChange={(event) => setSearchValue(event.target.value)}
					/>
				</div>
				{filtered.length === 0 ? (
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={
							<Text style={{ color: "#8c8c8c" }}>
								{searchValue.trim()
									? "No available steps match the current search"
									: "All steps are already configured"}
							</Text>
						}
					/>
				) : (
					<List
						loading={loading}
						dataSource={filtered}
						renderItem={(step) => (
							<List.Item
								actions={[
									<Button
										key="settings"
										type="text"
										size="small"
										icon={<SettingOutlined />}
										onClick={() => onOpenSettings(step)}
									/>,
									<Button
										key="add"
										type="primary"
										size="small"
										icon={<PlusOutlined />}
										loading={addingStepId === step.id}
										onClick={() => onAdd(step.id)}
									>
										Add
									</Button>,
								]}
							>
								<List.Item.Meta
									title={
										<Space>
											<Text style={{ color: "#d9d9d9" }}>{step.name}</Text>
											{step.dependency && (
												<Tag color="cyan" style={{ marginLeft: 8 }}>
													{step.dependency}
												</Tag>
											)}
										</Space>
									}
									description={
										<Text style={{ color: "#8c8c8c", fontSize: 12 }} ellipsis>
											ID: {step.id} · {step.url}
										</Text>
									}
								/>
							</List.Item>
						)}
					/>
				)}
			</div>
		</Card>
	);
}
