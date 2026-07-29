import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	ReportNotificationEvent,
	ReportRecipientsResponse,
	SubscriptionStateResponse,
} from "../../app/server/modules/report-notifications";
import { api } from "../../lib/api-client";

export type {
	ReportNotificationEvent,
	ReportRecipientsResponse,
	SubscriptionStateResponse,
} from "../../app/server/modules/report-notifications";

const NOTIFICATION_ROOT_QUERY_KEY = ["report-notifications"];

export const NOTIFICATION_SUBSCRIPTIONS_QUERY_KEY = [
	...NOTIFICATION_ROOT_QUERY_KEY,
	"subscriptions",
];

const NOTIFICATION_RECIPIENTS_QUERY_KEY = [
	...NOTIFICATION_ROOT_QUERY_KEY,
	"recipients",
];

function sortedIdsKey(reportIds: number[]): string {
	return [...reportIds].sort((a, b) => a - b).join(",");
}

async function getSubscriptionState(
	reportIds: number[],
): Promise<{ success: boolean; data: SubscriptionStateResponse }> {
	const response = await api.get(
		"/sales-miner/reports/notification-subscriptions/me",
		{
			params: { report_ids: reportIds.join(",") },
		},
	);
	return response.data;
}

/** Bulk subscription state for the reports currently visible in the table, to avoid N+1 requests. */
export const useReportNotificationSubscriptions = (reportIds: number[]) => {
	return useQuery({
		queryKey: [
			...NOTIFICATION_SUBSCRIPTIONS_QUERY_KEY,
			sortedIdsKey(reportIds),
		],
		queryFn: () => getSubscriptionState(reportIds),
		enabled: reportIds.length > 0,
	});
};

function useInvalidateNotifications() {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({ queryKey: NOTIFICATION_ROOT_QUERY_KEY });
}

interface SelfEventParams {
	reportId: number;
	/** Omit to act on every supported event at once. */
	eventType?: ReportNotificationEvent;
}

export const useSubscribeToReportNotifications = () => {
	const invalidate = useInvalidateNotifications();
	return useMutation({
		mutationFn: async ({ reportId, eventType }: SelfEventParams) => {
			const response = await api.post(
				`/sales-miner/reports/${reportId}/notification-subscriptions/me`,
				eventType ? { event_type: eventType } : {},
			);
			return response.data;
		},
		onSuccess: () => void invalidate(),
	});
};

export const useUnsubscribeFromReportNotifications = () => {
	const invalidate = useInvalidateNotifications();
	return useMutation({
		mutationFn: async ({ reportId, eventType }: SelfEventParams) => {
			const response = await api.delete(
				`/sales-miner/reports/${reportId}/notification-subscriptions/me`,
				eventType ? { params: { event_type: eventType } } : undefined,
			);
			return response.data;
		},
		onSuccess: () => void invalidate(),
	});
};

async function getReportRecipients(
	reportId: number,
): Promise<{ success: boolean; data: ReportRecipientsResponse }> {
	const response = await api.get(
		`/sales-miner/reports/${reportId}/notification-subscriptions`,
	);
	return response.data;
}

/** All recipients (self and others) subscribed to a report — for the recipients management modal. */
export const useReportRecipients = (reportId: number | null) => {
	return useQuery({
		queryKey: [...NOTIFICATION_RECIPIENTS_QUERY_KEY, reportId],
		queryFn: () => getReportRecipients(reportId as number),
		enabled: reportId !== null,
	});
};

interface RecipientEventParams {
	reportId: number;
	recipientEmail: string;
	/** Omit to act on every supported event at once. */
	eventType?: ReportNotificationEvent;
}

export const useAddReportRecipient = () => {
	const invalidate = useInvalidateNotifications();
	return useMutation({
		mutationFn: async ({
			reportId,
			recipientEmail,
			eventType,
		}: RecipientEventParams) => {
			const response = await api.post(
				`/sales-miner/reports/${reportId}/notification-subscriptions`,
				{
					recipient_email: recipientEmail,
					...(eventType ? { event_type: eventType } : {}),
				},
			);
			return response.data;
		},
		onSuccess: () => void invalidate(),
	});
};

export const useRemoveReportRecipient = () => {
	const invalidate = useInvalidateNotifications();
	return useMutation({
		mutationFn: async ({
			reportId,
			recipientEmail,
			eventType,
		}: RecipientEventParams) => {
			const response = await api.delete(
				`/sales-miner/reports/${reportId}/notification-subscriptions`,
				{
					params: {
						recipient_email: recipientEmail,
						...(eventType ? { event_type: eventType } : {}),
					},
				},
			);
			return response.data;
		},
		onSuccess: () => void invalidate(),
	});
};
