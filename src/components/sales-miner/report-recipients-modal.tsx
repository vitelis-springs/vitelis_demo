"use client";

import { DeleteOutlined, TeamOutlined } from "@ant-design/icons";
import {
	App,
	Button,
	Checkbox,
	Divider,
	Empty,
	Input,
	Modal,
	Space,
	Spin,
	Typography,
} from "antd";
import { useState } from "react";
import {
	type ReportNotificationEvent,
	useAddReportRecipient,
	useRemoveReportRecipient,
	useReportRecipients,
} from "../../hooks/api/useReportNotificationsService";
import {
	NOTIFICATION_EVENT_LABELS,
	NOTIFICATION_EVENT_ORDER,
} from "./notification-event-labels";

const { Text } = Typography;

interface ReportRecipientsModalProps {
	reportId: number;
	reportName?: string | null;
}

export default function ReportRecipientsModal({
	reportId,
	reportName,
}: ReportRecipientsModalProps) {
	const { notification } = App.useApp();
	const [open, setOpen] = useState(false);
	const [emailInput, setEmailInput] = useState("");

	const { data, isLoading } = useReportRecipients(open ? reportId : null);
	const addRecipient = useAddReportRecipient();
	const removeRecipient = useRemoveReportRecipient();

	const recipients = data?.data.recipients ?? [];

	const handleAdd = async () => {
		const recipientEmail = emailInput.trim();
		if (!recipientEmail) return;
		try {
			await addRecipient.mutateAsync({ reportId, recipientEmail });
			setEmailInput("");
		} catch (error) {
			const message =
				(error as { response?: { data?: { error?: string } } })?.response?.data
					?.error ?? "Failed to add recipient.";
			notification.error({
				message: "Cannot add recipient",
				description: message,
			});
		}
	};

	const handleRemoveAll = async (recipientEmail: string) => {
		try {
			await removeRecipient.mutateAsync({ reportId, recipientEmail });
		} catch {
			notification.error({
				message: "Cannot remove recipient",
				description: `Failed to remove ${recipientEmail}.`,
			});
		}
	};

	const handleToggleEvent = async (
		recipientEmail: string,
		eventType: ReportNotificationEvent,
		checked: boolean,
	) => {
		try {
			if (checked) {
				await addRecipient.mutateAsync({ reportId, recipientEmail, eventType });
			} else {
				await removeRecipient.mutateAsync({
					reportId,
					recipientEmail,
					eventType,
				});
			}
		} catch {
			notification.error({
				message: checked ? "Cannot enable event" : "Cannot disable event",
				description: `Failed to update "${NOTIFICATION_EVENT_LABELS[eventType]}" for ${recipientEmail}.`,
			});
		}
	};

	const isEventPending = (
		recipientEmail: string,
		eventType: ReportNotificationEvent,
	) =>
		(addRecipient.isPending &&
			addRecipient.variables?.recipientEmail === recipientEmail &&
			addRecipient.variables?.eventType === eventType) ||
		(removeRecipient.isPending &&
			removeRecipient.variables?.recipientEmail === recipientEmail &&
			removeRecipient.variables?.eventType === eventType);

	const isRemoveAllPending = (recipientEmail: string) =>
		removeRecipient.isPending &&
		removeRecipient.variables?.recipientEmail === recipientEmail &&
		!removeRecipient.variables?.eventType;

	return (
		<>
			<Button
				icon={<TeamOutlined />}
				size="small"
				onClick={() => setOpen(true)}
				title="Manage notification recipients"
			/>
			<Modal
				title={`Notification recipients${reportName ? ` — ${reportName}` : ""}`}
				open={open}
				onCancel={() => setOpen(false)}
				footer={null}
				destroyOnHidden
			>
				<Space.Compact style={{ width: "100%", marginBottom: 16 }}>
					<Input
						placeholder="email@example.com"
						value={emailInput}
						onChange={(event) => setEmailInput(event.target.value)}
						onPressEnter={handleAdd}
						disabled={addRecipient.isPending}
					/>
					<Button
						type="primary"
						onClick={handleAdd}
						loading={
							addRecipient.isPending && !addRecipient.variables?.eventType
						}
						disabled={!emailInput.trim()}
					>
						Add
					</Button>
				</Space.Compact>

				<Spin spinning={isLoading}>
					{recipients.length === 0 ? (
						<Empty description="No recipients yet" />
					) : (
						recipients.map((recipient, index) => (
							<div key={recipient.recipient_email}>
								{index > 0 && <Divider style={{ margin: "8px 0" }} />}
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "flex-start",
										gap: 8,
									}}
								>
									<Space direction="vertical" size={2}>
										<Text>{recipient.recipient_email}</Text>
										<Space size={12}>
											{NOTIFICATION_EVENT_ORDER.map((eventType) => (
												<Checkbox
													key={eventType}
													checked={recipient.events[eventType]}
													disabled={isEventPending(
														recipient.recipient_email,
														eventType,
													)}
													onChange={(e) =>
														void handleToggleEvent(
															recipient.recipient_email,
															eventType,
															e.target.checked,
														)
													}
												>
													{NOTIFICATION_EVENT_LABELS[eventType]}
												</Checkbox>
											))}
										</Space>
									</Space>
									<Button
										icon={<DeleteOutlined />}
										size="small"
										danger
										type="text"
										title="Remove all notifications for this recipient"
										loading={isRemoveAllPending(recipient.recipient_email)}
										onClick={() => handleRemoveAll(recipient.recipient_email)}
									/>
								</div>
							</div>
						))
					)}
				</Spin>
			</Modal>
		</>
	);
}
