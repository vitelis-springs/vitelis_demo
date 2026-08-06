"use client";

import { EyeOutlined } from "@ant-design/icons";
import {
	App,
	Button,
	Checkbox,
	Modal,
	Progress,
	Space,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useRef, useState } from "react";
import CreateSMReportModal, {
	type CreateSMReportModalHandle,
} from "./create-sm-report-modal";
import { api } from "../../lib/api-client";
import {
	useCreateSalesMinerCustomerAccount,
	useCustomerProducts,
} from "../../hooks/api/useSalesMinerCustomersService";
import { useGicsCodes } from "../../hooks/api/useSalesMinerSignalCatalogService";
import {
	useGetCompany,
	type CompanySearchResult,
} from "../../hooks/api/useDeepDiveService";
import CreateCompanyModal, {
	checkSlugAvailable,
	toSlug,
	type StagedCompanyDraft,
} from "../deep-dive/create-company-modal";
import {
	ACCOUNTS_SHEET_NAME_PATTERN,
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
	importStatus?: "importing" | "done" | "failed";
	importError?: string;
	/** Pre-import problems (invalid GICS code, duplicate slug) that must be resolved first. */
	validationIssues?: string[];
}

async function searchExactCompany(
	name: string,
): Promise<CompanySearchResult | null> {
	const res = await api.get(`/companies/search?q=${encodeURIComponent(name)}`);
	const items: CompanySearchResult[] = res.data?.data ?? [];
	const trimmed = name.trim().toLowerCase();
	return items.find((c) => c.name.trim().toLowerCase() === trimmed) ?? null;
}

async function validateDraftRow(
	draft: StagedCompanyDraft,
	gicsCodes: Set<string>,
	otherSlugs: Set<string>,
	excludeCompanyId?: number | null,
): Promise<string[]> {
	const issues: string[] = [];

	if (draft.gicsCode && gicsCodes.size > 0 && !gicsCodes.has(draft.gicsCode)) {
		issues.push(`Unknown GICS code "${draft.gicsCode}"`);
	}

	if (draft.slug) {
		if (otherSlugs.has(draft.slug)) {
			issues.push(`Slug "${draft.slug}" is used by another row in this file`);
		} else {
			const check = await checkSlugAvailable(draft.slug, excludeCompanyId);
			if (check && !check.available) {
				issues.push(
					`Slug "${draft.slug}" already used by company #${check.companyId}`,
				);
			}
		}
	}

	return issues;
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
	const { message, modal } = App.useApp();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [rows, setRows] = useState<DraftCompanyRow[]>([]);
	const [isParsing, setIsParsing] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState<{
		done: number;
		total: number;
	} | null>(null);
	const [reviewKey, setReviewKey] = useState<string | null>(null);
	const [forceEditKey, setForceEditKey] = useState<string | null>(null);
	const [createReport, setCreateReport] = useState(true);
	const createReportModalRef = useRef<CreateSMReportModalHandle>(null);

	const createAccount = useCreateSalesMinerCustomerAccount(customerId);
	const { data: gicsCodesData } = useGicsCodes();
	const { data: customerProductsData } = useCustomerProducts(customerId);
	const hasActiveProducts = (customerProductsData?.data ?? []).some(
		(p) => p.is_active,
	);

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
		setImportProgress(null);
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

			// Local mirror of each row's final draft, kept in sync alongside the
			// incremental `updateRow` calls below, so we have a synchronous
			// snapshot to run the post-parse validation pass against.
			const draftsByKey = new Map<string, StagedCompanyDraft>();

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

						draftsByKey.set(key, draft);
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

			// Validate GICS codes and slug uniqueness for the new ("ready")
			// companies, blocking import until issues are resolved.
			const gicsSet = new Set((gicsCodesData?.data ?? []).map((g) => g.code));
			const slugCounts = new Map<string, number>();
			for (const draft of Array.from(draftsByKey.values())) {
				if (draft.slug) {
					slugCounts.set(draft.slug, (slugCounts.get(draft.slug) ?? 0) + 1);
				}
			}

			await Promise.all(
				Array.from(draftsByKey.entries()).map(async ([key, draft]) => {
					const otherSlugs = new Set(
						(slugCounts.get(draft.slug ?? "") ?? 0) > 1 && draft.slug
							? [draft.slug]
							: [],
					);
					const issues = await validateDraftRow(draft, gicsSet, otherSlugs);
					if (issues.length > 0) {
						updateRow(key, { validationIssues: issues });
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
		setImportProgress({ done: 0, total: rows.length });

		// Snapshot what this import is expected to do, before anything runs,
		// so the final report can show expected vs. actual.
		const expectedNew = rows.filter((r) => r.status === "ready").length;
		const expectedExisting = rows.filter((r) => r.status === "existing").length;

		let created = 0;
		let linked = 0;
		let skipped = 0;
		let failed = 0;
		let failedNew = 0;
		let failedExisting = 0;
		const alreadyLinked = new Set(existingCompanyIds);
		const importedCompanyIds: number[] = [];
		const failures: { name: string; reason: string }[] = [];

		const fail = (row: DraftCompanyRow, reason: string) => {
			failed++;
			if (row.status === "ready") failedNew++;
			else failedExisting++;
			failures.push({ name: row.name, reason });
			updateRow(row.key, { importStatus: "failed", importError: reason });
		};

		for (const row of rows) {
			updateRow(row.key, { importStatus: "importing" });
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
							fail(row, "Failed to save staged edits");
							continue;
						}
					}
				} else if (row.status === "ready" && row.draft) {
					const res = await api.post("/companies", row.draft);
					if (!res.data?.success || !res.data.data) {
						fail(row, res.data?.error ?? "Failed to create company");
						continue;
					}
					companyId = res.data.data.companyId;
					created++;
				} else {
					fail(row, row.errorMessage ?? "Row not ready for import");
					continue;
				}

				importedCompanyIds.push(companyId);

				if (alreadyLinked.has(companyId)) {
					skipped++;
					updateRow(row.key, { importStatus: "done" });
					continue;
				}

				await createAccount.mutateAsync({ companyId });
				alreadyLinked.add(companyId);
				linked++;
				updateRow(row.key, { importStatus: "done" });
			} catch (err) {
				const status = (err as { response?: { status?: number } }).response
					?.status;
				if (status === 409) {
					skipped++;
					updateRow(row.key, { importStatus: "done" });
				} else {
					fail(row, err instanceof Error ? err.message : "Unknown error");
				}
			} finally {
				setImportProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
			}
		}

		setIsImporting(false);

		if (created > 0 || linked > 0) {
			onImported();
		}

		const reportRow = (
			label: string,
			expected: number,
			actual: number,
			mismatch: boolean,
		) => (
			<tr key={label}>
				<td style={{ padding: "4px 0" }}>{label}</td>
				<td style={{ padding: "4px 0", textAlign: "right" }}>{expected}</td>
				<td
					style={{
						padding: "4px 0",
						textAlign: "right",
						color: mismatch ? "#ff4d4f" : undefined,
						fontWeight: mismatch ? 600 : undefined,
					}}
				>
					{actual}
				</td>
			</tr>
		);

		const reportContent = (
			<div>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr>
							<th
								style={{ textAlign: "left", fontWeight: 400, color: "#8c8c8c" }}
							>
								{" "}
							</th>
							<th
								style={{
									textAlign: "right",
									fontWeight: 400,
									color: "#8c8c8c",
									fontSize: 12,
								}}
							>
								Expected
							</th>
							<th
								style={{
									textAlign: "right",
									fontWeight: 400,
									color: "#8c8c8c",
									fontSize: 12,
								}}
							>
								Actual
							</th>
						</tr>
					</thead>
					<tbody>
						{reportRow(
							"New companies created",
							expectedNew,
							created,
							created !== expectedNew,
						)}
						{reportRow(
							"Existing companies processed",
							expectedExisting,
							expectedExisting - failedExisting,
							failedExisting > 0,
						)}
						{reportRow(
							"Accounts linked to customer",
							expectedNew + expectedExisting - failedNew - failedExisting,
							linked + skipped,
							false,
						)}
						{reportRow("Failed", 0, failed, failed > 0)}
					</tbody>
				</table>
				{failures.length > 0 && (
					<>
						<Typography.Paragraph style={{ marginTop: 12, marginBottom: 4 }}>
							Failures:
						</Typography.Paragraph>
						<ul style={{ paddingLeft: 20, margin: 0 }}>
							{failures.map((f) => (
								<li key={f.name}>
									<strong>{f.name}</strong>: {f.reason}
								</li>
							))}
						</ul>
					</>
				)}
			</div>
		);

		const finishAndClose = () => {
			reset();
			onClose();
			if (
				createReport &&
				!hasUnverified &&
				hasActiveProducts &&
				importedCompanyIds.length > 0
			) {
				createReportModalRef.current?.open(importedCompanyIds);
			}
		};

		if (failed > 0) {
			modal.error({
				title: "Import finished with errors",
				width: 600,
				content: reportContent,
			});
			return;
		}

		modal.success({
			title: "Import complete",
			width: 560,
			content: reportContent,
			onOk: finishAndClose,
		});
	};

	const hasPendingWork = rows.some(
		(r) => r.status === "matching" || r.status === "generating",
	);
	const hasUnverified = rows.some((r) => !r.verified);
	const hasValidationIssues = rows.some(
		(r) => r.validationIssues && r.validationIssues.length > 0,
	);

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
			title: "Issues",
			key: "validationIssues",
			width: 140,
			render: (_, row) => {
				if (!row.validationIssues || row.validationIssues.length === 0) {
					return <span style={{ color: "#595959" }}>—</span>;
				}
				return (
					<Tooltip
						title={
							<ul style={{ margin: 0, paddingLeft: 16 }}>
								{row.validationIssues.map((issue) => (
									<li key={issue}>{issue}</li>
								))}
							</ul>
						}
					>
						<Tag color="red">
							{row.validationIssues.length} issue
							{row.validationIssues.length > 1 ? "s" : ""}
						</Tag>
					</Tooltip>
				);
			},
		},
		{
			title: "Import",
			key: "importStatus",
			width: 130,
			render: (_, row) => {
				if (!row.importStatus)
					return <span style={{ color: "#595959" }}>—</span>;
				if (row.importStatus === "importing")
					return <Tag color="processing">importing…</Tag>;
				if (row.importStatus === "done")
					return <Tag color="green">imported</Tag>;
				return (
					<Tooltip title={row.importError}>
						<Tag color="red">failed</Tag>
					</Tooltip>
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
				title={
					<div>
						<div>Import Accounts from XLSX</div>
						<Typography.Text
							type="secondary"
							style={{ fontSize: 12, fontWeight: 400 }}
						>
							Expects a sheet named &quot;{ACCOUNTS_SHEET_NAME_PATTERN}&quot;
							(or containing that text)
						</Typography.Text>
					</div>
				}
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
					<Tooltip
						key="create-report"
						title={
							!hasUnverified && !hasActiveProducts
								? "This customer has no active products in their portfolio — add products before creating a report."
								: undefined
						}
					>
						<Checkbox
							checked={createReport && !hasUnverified && hasActiveProducts}
							disabled={hasUnverified || !hasActiveProducts}
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
							{!hasUnverified && !hasActiveProducts && (
								<span style={{ color: "#595959" }}> (no active products)</span>
							)}
						</Checkbox>
					</Tooltip>,
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
					<Tooltip
						key="confirm"
						title={
							hasValidationIssues
								? "Fix validation issues before importing"
								: undefined
						}
					>
						<Button
							type="primary"
							loading={isImporting}
							disabled={
								rows.length === 0 || hasPendingWork || hasValidationIssues
							}
							onClick={() => {
								handleConfirmImport().catch((err) => {
									console.error("Accounts import failed", err);
								});
							}}
						>
							Confirm Import ({rows.length})
						</Button>
					</Tooltip>,
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
				{importProgress && (
					<Progress
						style={{ marginBottom: 12 }}
						percent={Math.round(
							(importProgress.done / importProgress.total) * 100,
						)}
						status={isImporting ? "active" : "normal"}
						format={() => `${importProgress.done} / ${importProgress.total}`}
					/>
				)}
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
								validationIssues: undefined,
							});
							setForceEditKey(null);
							const gicsSet = new Set(
								(gicsCodesData?.data ?? []).map((g) => g.code),
							);
							const otherSlugs = new Set(
								rows
									.filter((r) => r.key !== reviewRow.key && r.draft?.slug)
									.map((r) => r.draft?.slug as string),
							);
							validateDraftRow(
								draft,
								gicsSet,
								otherSlugs,
								reviewRow.existingId,
							).then((issues) => {
								if (issues.length > 0) {
									updateRow(reviewRow.key, { validationIssues: issues });
								}
							});
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
						onStaged={(draft) => {
							updateRow(reviewRow.key, {
								draft,
								verified: draft.verified,
								validationIssues: undefined,
							});
							const gicsSet = new Set(
								(gicsCodesData?.data ?? []).map((g) => g.code),
							);
							const otherSlugs = new Set(
								rows
									.filter((r) => r.key !== reviewRow.key && r.draft?.slug)
									.map((r) => r.draft?.slug as string),
							);
							validateDraftRow(draft, gicsSet, otherSlugs).then((issues) => {
								if (issues.length > 0) {
									updateRow(reviewRow.key, { validationIssues: issues });
								}
							});
						}}
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
