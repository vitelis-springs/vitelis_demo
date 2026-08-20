"use client";

import {
	Alert,
	App,
	Button,
	Checkbox,
	Empty,
	Modal,
	Segmented,
	Space,
	Spin,
	Tag,
	Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
	useExportCustomerOpportunitiesXlsx,
	useGetCustomerExportScope,
} from "../../hooks/api/useDeepDiveService";
import type {
	CustomerExportScopeReport,
	OpportunityExportApproval,
} from "../../types/deep-dive.types";

const { Text } = Typography;

/** Opportunities each report contributes under the current filter. */
function countFor(
	report: CustomerExportScopeReport,
	approval: OpportunityExportApproval,
	companyIds: number[],
): number {
	const accounts = report.accounts.filter((a) =>
		companyIds.includes(a.companyId),
	);
	return accounts.reduce((sum, account) => {
		if (approval === "approved") return sum + account.approvedOpportunities;
		if (approval === "unapproved")
			return sum + (account.totalOpportunities - account.approvedOpportunities);
		return sum + account.totalOpportunities;
	}, 0);
}

interface CustomerOpportunitiesExportModalProps {
	open: boolean;
	onClose: () => void;
	customerId: number;
	customerName?: string | null;
}

/**
 * Picks reports and accounts for the customer-wide opportunities workbook.
 * Selection starts empty so the export is always a deliberate choice, and the
 * counts update live with the approval filter — what the footer promises is
 * what the file contains.
 */
export default function CustomerOpportunitiesExportModal({
	open,
	onClose,
	customerId,
	customerName,
}: CustomerOpportunitiesExportModalProps) {
	const { message } = App.useApp();
	const { data, isLoading, isError } = useGetCustomerExportScope(
		customerId,
		open,
	);
	const { mutateAsync: exportOpportunities, isPending } =
		useExportCustomerOpportunitiesXlsx();

	const [approval, setApproval] =
		useState<OpportunityExportApproval>("approved");
	/** reportId → selected company ids. A report absent here is not selected. */
	const [selection, setSelection] = useState<Record<number, number[]>>({});

	const reports = useMemo(() => data?.data.reports ?? [], [data]);

	// Reopening starts clean rather than resurrecting a stale selection.
	useEffect(() => {
		if (!open) {
			setSelection({});
			setApproval("approved");
		}
	}, [open]);

	const toggleReport = (
		report: CustomerExportScopeReport,
		checked: boolean,
	) => {
		setSelection((prev) => {
			const next = { ...prev };
			if (checked) {
				next[report.reportId] = report.accounts.map((a) => a.companyId);
			} else {
				delete next[report.reportId];
			}
			return next;
		});
	};

	const toggleAccount = (
		report: CustomerExportScopeReport,
		companyId: number,
		checked: boolean,
	) => {
		setSelection((prev) => {
			const current = prev[report.reportId] ?? [];
			const next = checked
				? [...current, companyId]
				: current.filter((id) => id !== companyId);
			const updated = { ...prev };
			if (next.length === 0) delete updated[report.reportId];
			else updated[report.reportId] = next;
			return updated;
		});
	};

	const selectedReports = useMemo(
		() =>
			reports.filter((report) => (selection[report.reportId]?.length ?? 0) > 0),
		[reports, selection],
	);

	const totalOpportunities = useMemo(
		() =>
			selectedReports.reduce(
				(sum, report) =>
					sum + countFor(report, approval, selection[report.reportId] ?? []),
				0,
			),
		[selectedReports, approval, selection],
	);

	const handleExport = async () => {
		try {
			await exportOpportunities({
				customerId,
				customerName,
				approval,
				reports: selectedReports.map((report) => {
					const companyIds = selection[report.reportId] ?? [];
					const isEveryAccount = companyIds.length === report.accounts.length;
					return {
						reportId: report.reportId,
						// Omitting accounts lets the query skip the company filter.
						companyIds: isEveryAccount ? undefined : companyIds,
					};
				}),
			});
			message.success("Opportunities exported");
			onClose();
		} catch (error) {
			message.error(
				error instanceof Error ? error.message : "Failed to export",
			);
		}
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title="Export opportunities"
			width={720}
			destroyOnHidden
			footer={[
				<Text key="count" type="secondary" style={{ marginInlineEnd: "auto" }}>
					{selectedReports.length === 0
						? "Nothing selected"
						: `${totalOpportunities} opportunities · ${selectedReports.length} report${
								selectedReports.length === 1 ? "" : "s"
							}`}
				</Text>,
				<Button key="cancel" onClick={onClose}>
					Cancel
				</Button>,
				<Button
					key="export"
					type="primary"
					loading={isPending}
					disabled={selectedReports.length === 0 || totalOpportunities === 0}
					onClick={() => void handleExport()}
				>
					Export to XLSX
				</Button>,
			]}
		>
			<Space direction="vertical" size="middle" style={{ width: "100%" }}>
				<Space size="middle" wrap>
					<Text type="secondary">Include opportunities:</Text>
					<Segmented<OpportunityExportApproval>
						value={approval}
						onChange={(value) => setApproval(value)}
						options={[
							{ label: "Selected for export", value: "approved" },
							{ label: "Not selected", value: "unapproved" },
							{ label: "All", value: "all" },
						]}
					/>
				</Space>

				{isError && (
					<Alert
						type="error"
						showIcon
						message="Failed to load reports"
						description="Reopen the dialog to try again."
					/>
				)}

				{isLoading ? (
					<div
						style={{ display: "flex", justifyContent: "center", padding: 32 }}
					>
						<Spin />
					</div>
				) : reports.length === 0 ? (
					<Empty description="This customer has no Sales Miner reports with opportunities." />
				) : (
					<div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
						{reports.map((report) => {
							const selected = selection[report.reportId] ?? [];
							const allSelected =
								selected.length > 0 &&
								selected.length === report.accounts.length;
							const reportCount = countFor(
								report,
								approval,
								report.accounts.map((a) => a.companyId),
							);

							return (
								<div
									key={report.reportId}
									style={{
										borderBottom: "1px solid rgba(127,127,127,0.16)",
										padding: "10px 0",
									}}
								>
									<Checkbox
										checked={allSelected}
										indeterminate={
											selected.length > 0 &&
											selected.length < report.accounts.length
										}
										onChange={(e) => toggleReport(report, e.target.checked)}
									>
										<Space size="small" wrap>
											<Text strong>{report.reportName}</Text>
											<Tag>#{report.reportId}</Tag>
											<Text type="secondary">{reportCount} opps</Text>
										</Space>
									</Checkbox>

									<div style={{ paddingInlineStart: 26, marginTop: 6 }}>
										<Space direction="vertical" size={2}>
											{report.accounts.map((account) => {
												const accountCount = countFor(report, approval, [
													account.companyId,
												]);
												return (
													<Checkbox
														key={account.companyId}
														checked={selected.includes(account.companyId)}
														onChange={(e) =>
															toggleAccount(
																report,
																account.companyId,
																e.target.checked,
															)
														}
													>
														<Space size="small">
															<Text>{account.companyName}</Text>
															<Text type="secondary" style={{ fontSize: 12 }}>
																{accountCount}
															</Text>
														</Space>
													</Checkbox>
												);
											})}
										</Space>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</Space>
		</Modal>
	);
}
