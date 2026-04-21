"use client";

import {
	Button,
	Card,
	Col,
	Drawer,
	Empty,
	List,
	Row,
	Space,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { App } from "antd";
import { useState } from "react";
import {
	DARK_CARD_STYLE,
	DARK_CARD_HEADER_STYLE,
} from "../../config/chart-theme";
import {
	useGetReportValidationRules,
	useAddReportValidationRule,
	useRemoveReportValidationRule,
	type ConfiguredValidationRule,
	type AvailableValidationRule,
} from "../../hooks/api/useDeepDiveService";

const { Text } = Typography;

function levelTag(level: string) {
	return <Tag color={level === "driver" ? "blue" : "gold"}>{level}</Tag>;
}

interface Props {
	reportId: number;
	open: boolean;
	onClose: () => void;
}

export default function ValidationRulesConfigDrawer({
	reportId,
	open,
	onClose,
}: Props) {
	const { message } = App.useApp();
	const [addingId, setAddingId] = useState<number | null>(null);
	const [removingId, setRemovingId] = useState<number | null>(null);

	const { data, isLoading } = useGetReportValidationRules(reportId, open);
	const addRule = useAddReportValidationRule(reportId);
	const removeRule = useRemoveReportValidationRule(reportId);

	const configured: ConfiguredValidationRule[] = data?.configured ?? [];
	const available: AvailableValidationRule[] = data?.available ?? [];

	const handleAdd = (rule: AvailableValidationRule) => {
		setAddingId(rule.id);
		addRule.mutate(rule.id, {
			onSuccess: () => {
				message.success(`Rule "${rule.label ?? rule.name}" added`);
				setAddingId(null);
			},
			onError: () => {
				message.error("Failed to add rule");
				setAddingId(null);
			},
		});
	};

	const handleRemove = (rule: ConfiguredValidationRule) => {
		setRemovingId(rule.ruleId);
		removeRule.mutate(rule.ruleId, {
			onSuccess: () => {
				message.success(`Rule "${rule.label ?? rule.name}" removed`);
				setRemovingId(null);
			},
			onError: () => {
				message.error("Failed to remove rule");
				setRemovingId(null);
			},
		});
	};

	return (
		<Drawer
			title="Validation Rules Configuration"
			open={open}
			onClose={onClose}
			width={900}
			styles={{
				body: { background: "#141414", padding: 16 },
				header: {
					background: "#1f1f1f",
					borderBottom: "1px solid #303030",
					color: "#d9d9d9",
				},
				mask: { background: "rgba(0,0,0,0.6)" },
				wrapper: { background: "#141414" },
			}}
		>
			<Row gutter={16}>
				<Col xs={24} lg={12}>
					<Card
						title={`Configured (${configured.length})`}
						loading={isLoading}
						style={DARK_CARD_STYLE}
						styles={{ header: DARK_CARD_HEADER_STYLE, body: { padding: 0 } }}
					>
						<div
							style={{ height: 560, overflowY: "auto", padding: "8px 16px" }}
						>
							{configured.length === 0 ? (
								<Empty
									image={Empty.PRESENTED_IMAGE_SIMPLE}
									description={
										<Text style={{ color: "#8c8c8c" }}>
											No rules configured
										</Text>
									}
								/>
							) : (
								<List
									dataSource={configured}
									renderItem={(rule) => (
										<List.Item
											actions={[
												<Button
													key="remove"
													type="text"
													danger
													size="small"
													icon={<DeleteOutlined />}
													loading={removingId === rule.ruleId}
													onClick={() => handleRemove(rule)}
												/>,
											]}
										>
											<List.Item.Meta
												title={
													<Space size={4}>
														<Text style={{ color: "#d9d9d9", fontSize: 13 }}>
															{rule.label ?? rule.name}
														</Text>
														{levelTag(rule.level)}
													</Space>
												}
												description={
													<Text style={{ color: "#595959", fontSize: 11 }}>
														{rule.name}
													</Text>
												}
											/>
										</List.Item>
									)}
								/>
							)}
						</div>
					</Card>
				</Col>

				<Col xs={24} lg={12}>
					<Card
						title={`Available (${available.length})`}
						loading={isLoading}
						style={DARK_CARD_STYLE}
						styles={{ header: DARK_CARD_HEADER_STYLE, body: { padding: 0 } }}
					>
						<div
							style={{ height: 560, overflowY: "auto", padding: "8px 16px" }}
						>
							{available.length === 0 ? (
								<Empty
									image={Empty.PRESENTED_IMAGE_SIMPLE}
									description={
										<Text style={{ color: "#8c8c8c" }}>
											{isLoading ? "Loading..." : "All rules are configured"}
										</Text>
									}
								/>
							) : (
								<List
									dataSource={available}
									renderItem={(rule) => (
										<List.Item
											actions={[
												<Tooltip key="add" title="Add to report">
													<Button
														type="text"
														size="small"
														icon={<PlusOutlined />}
														style={{ color: "#52c41a" }}
														loading={addingId === rule.id}
														onClick={() => handleAdd(rule)}
													/>
												</Tooltip>,
											]}
										>
											<List.Item.Meta
												title={
													<Space size={4}>
														<Text style={{ color: "#d9d9d9", fontSize: 13 }}>
															{rule.label ?? rule.name}
														</Text>
														{levelTag(rule.level)}
													</Space>
												}
												description={
													<Text style={{ color: "#595959", fontSize: 11 }}>
														{rule.name}
													</Text>
												}
											/>
										</List.Item>
									)}
								/>
							)}
						</div>
					</Card>
				</Col>
			</Row>
		</Drawer>
	);
}
