"use client";

import { SendOutlined } from "@ant-design/icons";
import { App, Button, Tooltip, Typography } from "antd";
import type { ButtonProps } from "antd";
import type { ReactNode } from "react";
import { useSendSalesMinerReportsToDop } from "../../hooks/api/useSalesMinerReportsService";

const { Text } = Typography;

interface SendToDopButtonProps {
	reportIds: number[];
	disabled?: boolean;
	disabledReason?: ReactNode;
	size?: ButtonProps["size"];
}

type ApiErrorBody = {
	error?: string;
	invalid_reports?: Array<{ report_id: number; reason: string }>;
};

function extractApiError(error: unknown): ApiErrorBody {
	const response = (error as { response?: { data?: ApiErrorBody } })?.response;
	return response?.data ?? { error: "Failed to send reports to DOP." };
}

function reportCountText(count: number) {
	return count === 1 ? "1 SalesMiner report" : `${count} SalesMiner reports`;
}

export default function SendToDopButton({
	reportIds,
	disabled = false,
	disabledReason,
	size,
}: SendToDopButtonProps) {
	const { notification } = App.useApp();
	const sendToDop = useSendSalesMinerReportsToDop();
	const isDisabled = disabled || reportIds.length === 0 || sendToDop.isPending;

	const handleSend = async () => {
		try {
			const result = await sendToDop.mutateAsync(reportIds);
			const executionId = result.n8n?.execution_id;
			const status = result.n8n?.status;
			notification.success({
				title: "DOP export started",
				description: (
					<div>
						<div>
							{reportCountText(reportIds.length)} sent to DOP for processing.
						</div>
						{executionId && (
							<Text style={{ color: "#8c8c8c" }}>
								n8n execution: {executionId}
								{status ? ` (${status})` : ""}
							</Text>
						)}
					</div>
				),
				placement: "topRight",
				duration: 6,
			});
		} catch (error) {
			const body = extractApiError(error);
			const invalidCount = body.invalid_reports?.length ?? 0;
			notification.error({
				title: "Cannot send to DOP",
				description:
					invalidCount > 0 ? (
						<div>
							<div>
								{invalidCount} selected report
								{invalidCount === 1 ? " is" : "s are"} not eligible.
							</div>
							<Text style={{ color: "#8c8c8c" }}>
								Only SalesMiner reports that have started and include at least
								one completed company can be sent.
							</Text>
						</div>
					) : (
						(body.error ?? "Failed to send reports to DOP.")
					),
				placement: "topRight",
				duration: 7,
			});
		}
	};

	const button = (
		<Button
			icon={<SendOutlined />}
			onClick={handleSend}
			disabled={isDisabled}
			loading={sendToDop.isPending}
			size={size}
			style={
				isDisabled
					? undefined
					: {
							backgroundColor: "#16a34a",
							borderColor: "#16a34a",
							color: "#fff",
						}
			}
		>
			Send to DOP
		</Button>
	);

	if (!isDisabled || !disabledReason) return button;

	return (
		<Tooltip title={disabledReason}>
			<span>{button}</span>
		</Tooltip>
	);
}
