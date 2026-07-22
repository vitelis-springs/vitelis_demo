"use client";

import { EyeOutlined } from "@ant-design/icons";
import {
	App,
	Button,
	Checkbox,
	Modal,
	Space,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useRef, useState } from "react";
import CreateSMReportModal, {
	type CreateSMReportModalHandle,
} from "./create-sm-report-modal";
import { api } from "../../lib/api-client";
import { useCreateSalesMinerCustomerAccount } from "../../hooks/api/useSalesMinerCustomersService";
import {
	useGetCompany,
	type CompanySearchResult,
} from "../../hooks/api/useDeepDiveService";
import CreateCompanyModal, {
	toSlug,
	type StagedCompanyDraft,
} from "../deep-dive/create-company-modal";
import {
	parseAccountsWorkbook,
	type ParsedAccountRow,
} from "../../shared/accounts-import-xlsx";

type RowStatus = "matching" | "existing" | "generating" | "ready" | "error";

interface DraftCompanyRow {
	key: string;
	name: string;
	subsidiaries: string[];
	status: RowStatus;
	existingId: number | null;
	draft: StagedCompanyDraft | null;
	/** Unsaved edits to an existing (already in DB) company — applied on Confirm Import. */
	pendingEdit: StagedCompanyDraft | null;
	verified: boolean;
	errorMessage?: string;
}

async function searchExactCompany(
	name: string,
): Promise<CompanySearchResult | null> {
	const res = await api.get(`/companies/search?q=${encodeURIComponent(name)}`);
	const items: CompanySearchResult[] = res.data?.data ?? [];
	const trimmed = name.trim().toLowerCase();
	return items.find((c) => c.name.trim().toLowerCase() === trimmed) ?? null;
}

async function generateCompanyData(input: {
	name: string;
	url?: string | null;
	investPortal?: string | null;
	careerPortal?: string | null;
}): Promise<Record<string, unknown> | null> {
	try {
		const res = await fetch(
			"https://vitelis.app.n8n.cloud/webhook/sm-company-metadata",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: input.name || null,
					url: input.url || null,
					company_comment: null,
					invest_portal: input.investPortal || null,
					career_portal: input.careerPortal || null,
				}),
			},
		);
		if (!res.ok) return null;
		return (await res.json()) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function draftToInitialValues(
	source: {
		name: string;
		url: string | null;
		logoUrl: string | null;
		countryCode: string | null;
		industryId: number | null;
		gicsCode: string | null;
		investPortal: string | null;
		careerPortal: string | null;
		slug: string | null;
		reportRole: string | null;
		parentCompanyId: number | null;
		listed: boolean | null;
		verified: boolean;
	},
	fallbackName: string,
) {
	return {
		name: source.name || fallbackName,
		url: source.url ?? undefined,
		logoUrl: source.logoUrl ?? undefined,
		countryCode: source.countryCode ?? undefined,
		industryId: source.industryId ?? undefined,
		gicsCode: source.gicsCode ?? undefined,
		investPortal: source.investPortal ?? undefined,
		careerPortal: source.careerPortal ?? undefined,
		slug: source.slug ?? undefined,
		reportRole: source.reportRole ?? undefined,
		parentCompanyId: source.parentCompanyId ?? undefined,
		listed: (source.listed === false ? "private" : "public") as
			| "public"
			| "private",
		verified: source.verified,
	};
}

function additionalDataAsRecord(
	value: unknown,
): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

interface Props {
	open: boolean;
	onClose: () => void;
	customerId: string;
	existingCompanyIds: number[];
	onImported: () => void;
}

export default function ImportAccountsModal({
	open,
	onClose,
	customerId,
	existingCompanyIds,
	onImported,
}: Props) {
	const { message } = App.useApp();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [rows, setRows] = useState<DraftCompanyRow[]>([]);
	const [isParsing, setIsParsing] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [reviewKey, setReviewKey] = useState<string | null>(null);
	const [forceEditKey, setForceEditKey] = useState<string | null>(null);
	const [createReport, setCreateReport] = useState(true);
	const createReportModalRef = useRef<CreateSMReportModalHandle>(null);

	const createAccount = useCreateSalesMinerCustomerAccount(customerId);

	const reviewRow = rows.find((r) => r.key === reviewKey) ?? null;
	const isForceEditing = forceEditKey != null && forceEditKey === reviewKey;
	const { data: existingDetail } = useGetCompany(
		reviewRow?.status === "existing" ? reviewRow.existingId : null,
	);

	const updateRow = useCallback(
		(key: string, patch: Partial<DraftCompanyRow>) => {
			setRows((prev) =>
				prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
			);
		},
		[],
	);

	const closeReview = () => {
		setReviewKey(null);
		setForceEditKey(null);
	};

	const reset = () => {
		setRows([]);
		closeReview();
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleFileChange = async (file: File) => {
		setIsParsing(true);
		reset();
		try {
			const wb = await parseAccountsWorkbook(file);
			if (!wb.rows) {
				message.error(
					`Sheet "target-accounts" not found. Found: ${wb.allSheetNames.join(", ")}`,
				);
				return;
			}
			if (wb.rows.length === 0) {
				message.warning("No data rows found in target-accounts sheet");
				return;
			}

			const byKey = new Map<string, ParsedAccountRow>();
			for (const row of wb.rows) {
				const key = row.companyName.trim().toLowerCase();
				if (!byKey.has(key)) byKey.set(key, row);
			}

			setRows(
				Array.from(byKey.entries()).map(([key, row]) => ({
					key,
					name: row.companyName.trim(),
					subsidiaries: row.subsidiaries,
					status: "matching",
					existingId: null,
					draft: null,
					pendingEdit: null,
					verified: false,
				})),
			);

			message.success(`Parsed ${byKey.size} companies from "${wb.sheetName}"`);

			await Promise.all(
				Array.from(byKey.entries()).map(async ([key, row]) => {
					const name = row.companyName.trim();
					try {
						const match = await searchExactCompany(name);
						if (match) {
							updateRow(key, {
								status: "existing",
								existingId: match.id,
								verified: match.verified ?? false,
							});
							return;
						}

						updateRow(key, { status: "generating" });
						const generated = await generateCompanyData({
							name,
							url: row.corporateWebsite,
							investPortal: row.investorRelationsSite,
							careerPortal: row.careerSite,
						});

						const companyType = generated?.company_type;
						const listed =
							typeof companyType === "string" &&
							companyType.trim().toLowerCase() === "private"
								? false
								: true;
						const logoUrl =
							typeof generated?.logo_url === "string"
								? generated.logo_url
								: null;

						const additionalData =
							row.subsidiaries.length > 0
								? { ...generated, subsidiaries: row.subsidiaries }
								: generated;

						const draft: StagedCompanyDraft = {
							name,
							listed,
							url: row.corporateWebsite,
							logoUrl,
							countryCode: null,
							industryId: null,
							gicsCode: row.gicsCode,
							investPortal: row.investorRelationsSite,
							careerPortal: row.careerSite,
							slug: toSlug(name),
							reportRole: null,
							additionalData,
							parentCompanyId: null,
							verified: false,
						};

						updateRow(key, {
							status: "ready",
							draft,
							verified: draft.verified,
						});
					} catch (err) {
						updateRow(key, {
							status: "error",
							errorMessage: err instanceof Error ? err.message : "Failed",
						});
					}
				}),
			);
		} catch (err) {
			message.error(
				err instanceof Error ? err.message : "Failed to parse XLSX",
			);
		} finally {
			setIsParsing(false);
		}
	};

	const handleConfirmImport = async () => {
		setIsImporting(true);
		let created = 0;
		let linked = 0;
		let skipped = 0;
		let failed = 0;
		const alreadyLinked = new Set(existingCompanyIds);
		const importedCompanyIds: number[] = [];

		for (const row of rows) {
			try {
				let companyId: number;
				if (row.status === "existing" && row.existingId != null) {
					companyId = row.existingId;
					if (row.pendingEdit) {
						const patchRes = await api.patch(
							`/companies/${companyId}`,
							row.pendingEdit,
						);
						if (!patchRes.data?.success) {
							failed++;
							continue;
						}
					}
				} else if (row.status === "ready" && row.draft) {
					const res = await api.post("/companies", row.draft);
					if (!res.data?.success || !res.data.data) {
						failed++;
						continue;
					}
					companyId = res.data.data.companyId;
					created++;
				} else {
					failed++;
					continue;
				}

				importedCompanyIds.push(companyId);

				if (alreadyLinked.has(companyId)) {
					skipped++;
					continue;
				}

				await createAccount.mutateAsync({ companyId });
				alreadyLinked.add(companyId);
				linked++;
			} catch (err) {
				const status = (err as { response?: { status?: number } }).response
					?.status;
				if (status === 409) skipped++;
				else failed++;
			}
		}

		setIsImporting(false);
		message.success(
			`Import complete: ${created} companies created, ${linked} accounts linked, ${skipped} already linked, ${failed} failed`,
		);
		onImported();
		reset();
		onClose();

		if (createReport && !hasUnverified && importedCompanyIds.length > 0) {
			createReportModalRef.current?.open(importedCompanyIds);
		}
	};

	const hasPendingWork = rows.some(
		(r) => r.status === "matching" || r.status === "generating",
	);
	const hasUnverified = rows.some((r) => !r.verified);

	const columns: ColumnsType<DraftCompanyRow> = [
		{ title: "Company", dataIndex: "name" },
		{
			title: "Subsidiaries",
			dataIndex: "subsidiaries",
			render: (v: string[]) =>
				v.length > 0 ? (
					v.join(", ")
				) : (
					<span style={{ color: "#595959" }}>—</span>
				),
		},
		{
			title: "Status",
			key: "status",
			width: 160,
			render: (_, row) => {
				if (row.status === "matching")
					return <Tag color="processing">checking…</Tag>;
				if (row.status === "existing")
					return (
						<Space size={4}>
							<Tag color="green">existing (#{row.existingId})</Tag>
							{row.pendingEdit && <Tag color="blue">edited (unsaved)</Tag>}
						</Space>
					);
				if (row.status === "generating")
					return <Tag color="processing">generating…</Tag>;
				if (row.status === "ready") return <Tag color="gold">new</Tag>;
				return <Tag color="red">error</Tag>;
			},
		},
		{
			title: "Verified",
			key: "verified",
			width: 110,
			render: (_, row) => {
				if (row.status === "matching" || row.status === "generating")
					return <span style={{ color: "#595959" }}>—</span>;
				return (
					<Tag color={row.verified ? "green" : "warning"}>
						{row.verified ? "verified" : "unverified"}
					</Tag>
				);
			},
		},
		{
			title: "",
			key: "actions",
			width: 90,
			render: (_, row) => (
				<Button
					size="small"
					icon={<EyeOutlined />}
					disabled={row.status === "matching" || row.status === "generating"}
					onClick={() => setReviewKey(row.key)}
				>
					View
				</Button>
			),
		},
	];

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".xlsx"
				style={{ display: "none" }}
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) {
						handleFileChange(file).catch((err) => {
							console.error("Accounts import error", err);
						});
					}
				}}
			/>

			<Modal
				title="Import Accounts from XLSX"
				open={open}
				onCancel={() => {
					reset();
					onClose();
				}}
				width="80vw"
				style={{ top: "8vh" }}
				styles={{
					body: { maxHeight: "calc(78vh - 120px)", overflowY: "auto" },
				}}
				footer={[
					<Checkbox
						key="create-report"
						checked={createReport && !hasUnverified}
						disabled={hasUnverified}
						onChange={(e) => setCreateReport(e.target.checked)}
						style={{ marginRight: "auto" }}
					>
						Create new report
						{hasUnverified && (
							<span style={{ color: "#595959" }}>
								{" "}
								(verify all companies first)
							</span>
						)}
					</Checkbox>,
					<Button
						key="pick"
						onClick={() => fileInputRef.current?.click()}
						loading={isParsing}
					>
						{rows.length > 0 ? "Choose another file" : "Choose file"}
					</Button>,
					<Button
						key="cancel"
						onClick={() => {
							reset();
							onClose();
						}}
					>
						Cancel
					</Button>,
					<Button
						key="confirm"
						type="primary"
						loading={isImporting}
						disabled={rows.length === 0 || hasPendingWork}
						onClick={() => {
							handleConfirmImport().catch((err) => {
								console.error("Accounts import failed", err);
							});
						}}
					>
						Confirm Import ({rows.length})
					</Button>,
				]}
				destroyOnHidden
			>
				<Typography.Text
					type="secondary"
					style={{ display: "block", marginBottom: 8, fontSize: 12 }}
				>
					Viewing or editing a company here only stages the change — nothing is
					written to the database until you click &quot;Confirm Import&quot;.
				</Typography.Text>
				<Table<DraftCompanyRow>
					rowKey="key"
					size="small"
					dataSource={rows}
					columns={columns}
					pagination={{ pageSize: 20 }}
					locale={{
						emptyText: isParsing
							? "Parsing file…"
							: "Choose an .xlsx file with a target-accounts sheet",
					}}
				/>
			</Modal>

			{reviewRow?.status === "existing" &&
				reviewRow.verified &&
				!reviewRow.pendingEdit &&
				!isForceEditing &&
				existingDetail?.data && (
					<CreateCompanyModal
						open={reviewKey != null}
						onClose={closeReview}
						readOnly
						onRequestEdit={() => setForceEditKey(reviewRow.key)}
						variant="sales-miner"
						title={`View company: ${existingDetail.data.name}`}
						initialValues={draftToInitialValues(
							existingDetail.data,
							reviewRow.name,
						)}
						initialAdditionalData={additionalDataAsRecord(
							existingDetail.data.additionalData,
						)}
					/>
				)}

			{reviewRow?.status === "existing" &&
				(!reviewRow.verified || reviewRow.pendingEdit || isForceEditing) &&
				existingDetail?.data && (
					<CreateCompanyModal
						open={reviewKey != null}
						onClose={closeReview}
						mode="stage"
						variant="sales-miner"
						title={`Edit company: ${existingDetail.data.name} (applied on Confirm Import)`}
						initialValues={draftToInitialValues(
							reviewRow.pendingEdit ?? existingDetail.data,
							reviewRow.name,
						)}
						initialAdditionalData={additionalDataAsRecord(
							reviewRow.pendingEdit?.additionalData ??
								existingDetail.data.additionalData,
						)}
						onStaged={(draft) => {
							updateRow(reviewRow.key, {
								pendingEdit: draft,
								verified: draft.verified,
							});
							setForceEditKey(null);
						}}
					/>
				)}

			{reviewRow &&
				(reviewRow.status === "ready" || reviewRow.status === "generating") &&
				reviewRow.draft && (
					<CreateCompanyModal
						open={reviewKey != null}
						onClose={closeReview}
						mode="stage"
						variant="sales-miner"
						title={`New company: ${reviewRow.name}`}
						initialValues={draftToInitialValues(
							reviewRow.draft,
							reviewRow.name,
						)}
						initialAdditionalData={additionalDataAsRecord(
							reviewRow.draft.additionalData,
						)}
						onStaged={(draft) =>
							updateRow(reviewRow.key, { draft, verified: draft.verified })
						}
					/>
				)}

			<CreateSMReportModal
				ref={createReportModalRef}
				customerId={Number(customerId)}
				hideTrigger
			/>
		</>
	);
}
