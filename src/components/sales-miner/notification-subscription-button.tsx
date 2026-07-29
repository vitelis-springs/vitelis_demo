"use client";

import { BellOutlined } from "@ant-design/icons";
import { App, Badge, Button, Checkbox, Divider, Popover, Space } from "antd";
import { useState } from "react";
import type { ReportNotificationEvent } from "../../hooks/api/useReportNotificationsService";
import {
	useSubscribeToReportNotifications,
	useUnsubscribeFromReportNotifications,
} from "../../hooks/api/useReportNotificationsService";
import {
	NOTIFICATION_EVENT_LABELS,
	NOTIFICATION_EVENT_ORDER,
} from "./notification-event-labels";

interface NotificationSubscriptionButtonProps {
	reportId: number;
	events: Record<ReportNotificationEvent, boolean> | undefined;
	disabled?: boolean;
}

export default function NotificationSubscriptionButton({
	reportId,
	events,
	disabled = false,
}: NotificationSubscriptionButtonProps) {
	const { notification } = App.useApp();
	const [open, setOpen] = useState(false);
	const subscribe = useSubscribeToReportNotifications();
	const unsubscribe = useUnsubscribeFromReportNotifications();

	const hasLoadedState = events !== undefined;
	const enabledCount = NOTIFICATION_EVENT_ORDER.filter(
		(eventType) => events?.[eventType],
	).length;

	const pendingEventType =
		(subscribe.isPending ? subscribe.variables?.eventType : undefined) ??
		(unsubscribe.isPending ? unsubscribe.variables?.eventType : undefined);

	const notifyFailure = (
		eventType: ReportNotificationEvent,
		checked: boolean,
	) => {
		notification.error({
			message: checked ? "Failed to subscribe" : "Failed to unsubscribe",
			description: `Could not update the "${NOTIFICATION_EVENT_LABELS[eventType]}" notification.`,
			placement: "topRight",
		});
	};

	const handleToggle = async (
		eventType: ReportNotificationEvent,
		checked: boolean,
	) => {
		try {
			if (checked) {
				await subscribe.mutateAsync({ reportId, eventType });
			} else {
				await unsubscribe.mutateAsync({ reportId, eventType });
			}
		} catch {
			notifyFailure(eventType, checked);
		}
	};

	const handleSubscribeAll = async () => {
		try {
			await subscribe.mutateAsync({ reportId });
		} catch {
			notification.error({
				message: "Failed to subscribe",
				description:
					"Could not subscribe to all notifications for this report.",
				placement: "topRight",
			});
		}
	};

	const handleUnsubscribeAll = async () => {
		try {
			await unsubscribe.mutateAsync({ reportId });
		} catch {
			notification.error({
				message: "Failed to unsubscribe",
				description:
					"Could not unsubscribe from all notifications for this report.",
				placement: "topRight",
			});
		}
	};

	/**
	 * Opening the control for a report with no subscriptions yet subscribes to
	 * everything up front, mirroring "Add recipient" in the Recipients modal —
	 * uncheck what you don't want rather than checking each box by hand.
	 */
	const handleOpenChange = async (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen || !hasLoadedState || enabledCount > 0) return;
		await handleSubscribeAll();
	};

	const content = (
		<Space direction="vertical" size={4} style={{ minWidth: 160 }}>
			{NOTIFICATION_EVENT_ORDER.map((eventType) => (
				<Checkbox
					key={eventType}
					checked={events?.[eventType] ?? false}
					disabled={disabled || pendingEventType === eventType}
					onChange={(e) => void handleToggle(eventType, e.target.checked)}
				>
					{NOTIFICATION_EVENT_LABELS[eventType]}
				</Checkbox>
			))}
			<Divider style={{ margin: "4px 0" }} />
			<Space size={8}>
				<Button
					type="link"
					size="small"
					style={{ padding: 0 }}
					disabled={
						disabled || enabledCount === NOTIFICATION_EVENT_ORDER.length
					}
					onClick={handleSubscribeAll}
				>
					All
				</Button>
				<Button
					type="link"
					size="small"
					style={{ padding: 0 }}
					disabled={disabled || enabledCount === 0}
					onClick={handleUnsubscribeAll}
				>
					None
				</Button>
			</Space>
		</Space>
	);

	return (
		<Popover
			title="Email notifications"
			content={content}
			trigger="click"
			open={open}
			onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}
		>
			<Badge count={enabledCount} size="small" offset={[-4, 4]}>
				<Button icon={<BellOutlined />} size="small" disabled={disabled}>
					Notifications
				</Button>
			</Badge>
		</Popover>
	);
}
