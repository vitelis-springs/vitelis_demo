"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Alert, App, Button, Spin, theme } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
	useGetOpportunityDetail,
	useUpdateOpportunityNarrativeField,
} from "../../../hooks/api/useDeepDiveService";
import type { OpportunityNarrativeField } from "../../../types/deep-dive.types";
import CompanyLogo from "../company-logo";
import ConvictionSpine from "./conviction-spine";
import DiscoveryQuestions from "./discovery-questions";
import DossierSection from "./dossier-section";
import { parseMeddpicc } from "./meddpicc";
import MeddpiccDetail from "./meddpicc-detail";
import NarrativeFieldEditor from "./narrative-field-editor";
import NextActions from "./next-actions";
import styles from "./opportunity-detail.module.css";
import { editKey } from "./opportunity-detail.utils";
import ProofPoints from "./proof-points";
import StructuredBlock from "./structured-block";

/** Structured blocks rendered bespoke or intentionally hidden (raw/noisy). */
const CURATED_KEYS = new Set([
	"whyNow",
	"whatToOffer",
	"nextBestActions",
	"meddpicc",
	"meddpiccStructured",
	"commercialSnapshot",
	"proofPoints",
	"discoveryQuestions",
	"identity",
	"evidenceUrls",
]);

const SECTIONS = [
	{ id: "thesis", label: "The thesis" },
	{ id: "why-now", label: "Why now" },
	{ id: "win-risk", label: "Win · risk" },
	{ id: "play", label: "The play" },
	{ id: "qualify", label: "Qualification" },
	{ id: "evidence", label: "Evidence" },
] as const;

const FEATURED_FIELD_KEYS = new Set([
	"executiveSummary",
	"primaryProblem",
	"whyWeWin",
	"whyWeCouldLose",
	"competitivePositioning",
]);

function asObj(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}
function str(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const t = value.trim();
	return t.length ? t : null;
}
function hostOf(url: string): string {
	try {
		return new URL(url).host.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function NotCaptured() {
	return (
		<p className={styles.narrativeLede} style={{ opacity: 0.55 }}>
			Not captured yet.
		</p>
	);
}

export default function OpportunityDetailWorkspace({
	reportId,
	companyId,
	opportunityId,
}: {
	reportId: number;
	companyId: number;
	opportunityId: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { message } = App.useApp();
	const { token } = theme.useToken();
	const activeEdit = searchParams.get("edit");

	const { data, isLoading, isError, error } = useGetOpportunityDetail(
		reportId,
		companyId,
		opportunityId,
	);
	const { mutateAsync, isPending } = useUpdateOpportunityNarrativeField(
		reportId,
		companyId,
		opportunityId,
	);

	function setEdit(next: string | null) {
		const params = new URLSearchParams(searchParams.toString());
		if (next) params.set("edit", next);
		else params.delete("edit");
		const suffix = params.toString();
		router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
			scroll: false,
		});
	}

	async function saveField(field: OpportunityNarrativeField, value: string) {
		try {
			const result = await mutateAsync({
				source: field.source,
				field: field.field,
				value,
			});
			if (!result.success) {
				throw new Error(result.error ?? "Failed to save field");
			}
			message.success(`${field.label} saved`);
			setEdit(null);
		} catch (saveError) {
			message.error(
				saveError instanceof Error ? saveError.message : "Failed to save field",
			);
		}
	}

	if (isLoading) {
		return (
			<div className={styles.center}>
				<Spin size="large" />
			</div>
		);
	}

	if (isError || !data?.success) {
		return (
			<Alert
				type="error"
				showIcon
				message="Failed to load opportunity"
				description={error instanceof Error ? error.message : undefined}
			/>
		);
	}

	const detail = data.data;
	const { header } = detail;
	const blocks = detail.structuredBlocks;
	const gates = parseMeddpicc(blocks);
	const allFields = [...detail.baseFields, ...detail.deepDiveFields];
	const fieldByKey = new Map(allFields.map((f) => [f.field, f]));
	const blockByKey = new Map(blocks.map((b) => [b.key, b]));

	const renderEditor = (name: string): ReactNode => {
		const field = fieldByKey.get(name);
		if (!field) return null;
		const key = editKey(field);
		const active = activeEdit === key;
		return (
			<NarrativeFieldEditor
				field={field}
				active={active}
				saving={isPending && active}
				error={null}
				onEdit={() => setEdit(key)}
				onCancel={() => setEdit(null)}
				onSave={(value) => saveField(field, value)}
			/>
		);
	};

	const themeVars = {
		"--ink": token.colorText,
		"--ink-2": token.colorTextSecondary,
		"--ink-3": token.colorTextTertiary,
		"--ink-4": token.colorTextQuaternary,
		"--surface": token.colorBgContainer,
		"--surface-2": token.colorFillQuaternary,
		"--hair": token.colorBorderSecondary,
		"--signal": "#4f46e5",
		"--win": token.colorSuccess,
		"--risk": token.colorError,
		"--warn": token.colorWarning,
	} as CSSProperties;

	const whyNow = asObj(blockByKey.get("whyNow")?.value);
	const offer = asObj(blockByKey.get("whatToOffer")?.value);
	const commercial = asObj(blockByKey.get("commercialSnapshot")?.value);
	const blockers =
		commercial && Array.isArray(commercial.salesReadinessBlockers)
			? (commercial.salesReadinessBlockers as unknown[])
					.map(str)
					.filter((b): b is string => b !== null)
			: [];
	const whyNowSources =
		whyNow && Array.isArray(whyNow.sources)
			? (whyNow.sources as unknown[])
					.map(asObj)
					.filter((s): s is Record<string, unknown> => s !== null)
			: [];

	const appendix = blocks.filter(
		(b) => !CURATED_KEYS.has(b.key) && b.value && typeof b.value === "object",
	);

	const nextBestActions = blockByKey.get("nextBestActions")?.value;
	const proofPoints = blockByKey.get("proofPoints")?.value;
	const discoveryQuestions = blockByKey.get("discoveryQuestions")?.value;

	const whyNowNarrative = str(whyNow?.narrative);
	const leftoverFields = allFields.filter(
		(field) => !FEATURED_FIELD_KEYS.has(field.field),
	);

	return (
		<div className={styles.page} style={themeVars}>
			<Button
				type="text"
				icon={<ArrowLeftOutlined />}
				onClick={() => router.back()}
				className={styles.back}
			>
				Back
			</Button>

			<div className={styles.masthead}>
				<CompanyLogo
					name={detail.companyName}
					logoUrl={detail.companyLogoUrl}
					size={68}
					className={styles.companyMark}
					avatarStyle={{ padding: 9 }}
				/>
				<div className={styles.mastText}>
					<span className={styles.eyebrow}>
						{detail.companyName ?? "Account"}
					</span>
					<h1 className={styles.mastTitle}>{header.title}</h1>
					<div className={styles.meta}>
						{header.motionFamily && (
							<span className={styles.chipStrong}>{header.motionFamily}</span>
						)}
						{header.stage && (
							<span className={styles.chip}>{header.stage}</span>
						)}
						{header.dealSize && (
							<span className={styles.chip}>{header.dealSize}</span>
						)}
						{header.horizonName && (
							<span className={styles.chip}>{header.horizonName}</span>
						)}
						{header.rankPosition != null && (
							<span className={styles.chip}>Rank #{header.rankPosition}</span>
						)}
					</div>
				</div>
			</div>

			<ConvictionSpine
				priorityScore={header.priorityScore}
				confidenceScore={header.confidenceScore}
				gates={gates}
			/>

			<div className={styles.body}>
				<aside className={styles.rail}>
					<div className={styles.railInner}>
						<div className={styles.vitals}>
							<div className={styles.vital}>
								<span className={styles.vitalLabel}>Conviction</span>
								<span className={styles.vitalValue}>
									{header.priorityScore != null
										? Math.round(header.priorityScore)
										: "—"}
								</span>
							</div>
							<div className={styles.vital}>
								<span className={styles.vitalLabel}>Confidence</span>
								<span className={styles.vitalValue}>
									{Math.round(header.confidenceScore * 100)}%
								</span>
							</div>
							{header.dealSize && (
								<div className={styles.vital}>
									<span className={styles.vitalLabel}>Deal size</span>
									<span className={styles.vitalValue}>{header.dealSize}</span>
								</div>
							)}
							<span
								className={`${styles.approvePill} ${
									header.isApproved ? styles.approveYes : styles.approveNo
								}`}
							>
								{header.isApproved ? "Approved" : "Not approved"}
							</span>
						</div>

						<nav className={styles.jump}>
							{SECTIONS.map((s) => (
								<button
									key={s.id}
									type="button"
									className={styles.jumpItem}
									onClick={() =>
										document
											.getElementById(s.id)
											?.scrollIntoView({ behavior: "smooth", block: "start" })
									}
								>
									{s.label}
								</button>
							))}
						</nav>
					</div>
				</aside>

				<main className={styles.main}>
					<DossierSection id="thesis" eyebrow="The read" title="The thesis">
						<div className={styles.fieldGrid}>
							{renderEditor("executiveSummary")}
							{renderEditor("primaryProblem")}
						</div>
					</DossierSection>

					<DossierSection id="why-now" eyebrow="Timing" title="Why now">
						{whyNowNarrative ? (
							<p className={styles.narrativeLede}>{whyNowNarrative}</p>
						) : (
							<NotCaptured />
						)}
						{whyNowSources.length > 0 && (
							<div className={styles.sourceChips}>
								{whyNowSources.slice(0, 8).map((s) => {
									const url = str(s.url);
									const label = str(s.label) ?? (url ? hostOf(url) : "Source");
									return url ? (
										<a
											key={url}
											className={styles.sourceChip}
											href={url}
											target="_blank"
											rel="noreferrer"
										>
											{label}
										</a>
									) : (
										<span key={label} className={styles.sourceChip}>
											{label}
										</span>
									);
								})}
							</div>
						)}
					</DossierSection>

					<DossierSection
						id="win-risk"
						eyebrow="Competitive"
						title="Why we win · why we could lose"
					>
						<div className={styles.winRisk}>
							<div className={`${styles.wr} ${styles.wrWin}`}>
								<div className={styles.wrHead}>Why we win</div>
								{renderEditor("whyWeWin")}
							</div>
							<div className={`${styles.wr} ${styles.wrRisk}`}>
								<div className={styles.wrHead}>Why we could lose</div>
								{renderEditor("whyWeCouldLose")}
							</div>
						</div>
						{fieldByKey.has("competitivePositioning") && (
							<div style={{ marginTop: 20 }}>
								{renderEditor("competitivePositioning")}
							</div>
						)}
					</DossierSection>

					<DossierSection id="play" eyebrow="Execution" title="The play">
						{offer && (
							<div className={styles.offer}>
								{str(offer.offering) && (
									<div className={styles.offerName}>{str(offer.offering)}</div>
								)}
								{str(offer.offeringDescription) && (
									<p className={styles.offerText}>
										{str(offer.offeringDescription)}
									</p>
								)}
								{str(offer.businessOutcome) && (
									<p className={styles.offerOutcome}>
										{str(offer.businessOutcome)}
									</p>
								)}
							</div>
						)}
						{nextBestActions != null && <NextActions value={nextBestActions} />}
					</DossierSection>

					<DossierSection id="qualify" eyebrow="MEDDPICC" title="Qualification">
						{gates ? <MeddpiccDetail gates={gates} /> : <NotCaptured />}
						{blockers.length > 0 && (
							<div style={{ marginTop: 24 }}>
								<div
									className={styles.wrHead}
									style={{ color: token.colorWarning }}
								>
									Readiness blockers
								</div>
								<ul className={styles.blockers}>
									{blockers.map((b) => (
										<li key={b} className={styles.blocker}>
											{b}
										</li>
									))}
								</ul>
							</div>
						)}
					</DossierSection>

					<DossierSection
						id="evidence"
						eyebrow="Support"
						title="Evidence & discovery"
					>
						{proofPoints != null && <ProofPoints value={proofPoints} />}
						{discoveryQuestions != null && (
							<div style={{ marginTop: 28 }}>
								<div className={styles.wrHead}>Discovery questions</div>
								<DiscoveryQuestions value={discoveryQuestions} />
							</div>
						)}
					</DossierSection>

					{leftoverFields.length > 0 && (
						<DossierSection
							id="details"
							eyebrow="Editable"
							title="Other details"
						>
							<div className={styles.fieldGrid}>
								{leftoverFields.map((f) => (
									<div key={editKey(f)}>{renderEditor(f.field)}</div>
								))}
							</div>
						</DossierSection>
					)}

					{appendix.length > 0 && (
						<DossierSection id="appendix" eyebrow="Raw" title="Appendix">
							<div className={styles.appendix}>
								{appendix.map((block) => (
									<StructuredBlock block={block} key={block.key} />
								))}
							</div>
						</DossierSection>
					)}
				</main>
			</div>
		</div>
	);
}
