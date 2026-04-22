"use client";

import { DeleteOutlined } from "@ant-design/icons";
import {
	Button,
	Card,
	Empty,
	InputNumber,
	List,
	Space,
	Tag,
	Typography,
} from "antd";
import {
	DARK_CARD_HEADER_STYLE,
	DARK_CARD_STYLE,
} from "../../config/chart-theme";
import type { ConfiguredStep } from "../../hooks/api/useReportStepsService";

const { Text } = Typography;

function getSettingsCount(settings: unknown): number {
	if (
		typeof settings !== "object" ||
		settings === null ||
		Array.isArray(settings)
	) {
		return 0;
	}

	return Object.keys(settings).length;
}

interface ConfiguredStepsListProps {
	steps: ConfiguredStep[];
	loading: boolean;
	onRemove: (stepId: number) => void;
	onUpdateOrder: (stepId: number, order: number) => void;
	removingStepId: number | null;
	updatingOrder: boolean;
}

export default function ConfiguredStepsList({
	steps,
	loading,
	onRemove,
	onUpdateOrder,
	removingStepId,
	updatingOrder,
}: ConfiguredStepsListProps) {
	return (
		<Card
			title={`Configured Steps (${steps.length})`}
			style={DARK_CARD_STYLE}
			styles={{
				header: DARK_CARD_HEADER_STYLE,
				body: { padding: 0 },
			}}
		>
			<div style={{ height: 480, overflowY: "auto", padding: "8px 24px" }}>
				{steps.length === 0 ? (
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={
							<Text style={{ color: "#8c8c8c" }}>
								No steps configured. Add steps from the available list.
							</Text>
						}
					/>
				) : (
					<List
						loading={loading}
						dataSource={steps}
						renderItem={(step) => {
							const settingsCount = getSettingsCount(step.settings);

							return (
								<List.Item
									actions={[
										<Button
											key="delete"
											type="text"
											danger
											size="small"
											icon={<DeleteOutlined />}
											loading={removingStepId === step.id}
											onClick={() => onRemove(step.id)}
										/>,
									]}
								>
									<List.Item.Meta
										avatar={
											<InputNumber
												size="small"
												min={1}
												value={step.order}
												disabled={updatingOrder}
												onChange={(val) => {
													if (val !== null && val >= 1 && val !== step.order) {
														onUpdateOrder(step.id, val);
													}
												}}
												style={{
													width: 52,
													backgroundColor: "#1f1f1f",
												}}
											/>
										}
										title={
											<Space>
												<Tag color="grey">{step.id}</Tag>
												<Text style={{ color: "#d9d9d9" }}>{step.name}</Text>
												{step.dependency && (
													<Tag color="cyan">{step.dependency}</Tag>
												)}
												{settingsCount > 0 && (
													<Tag color="blue">{settingsCount} settings</Tag>
												)}
											</Space>
										}
										description={
											<Text style={{ color: "#8c8c8c", fontSize: 12 }} ellipsis>
												{step.url}
											</Text>
										}
									/>
								</List.Item>
							);
						}}
					/>
				)}
			</div>
		</Card>
	);
}
