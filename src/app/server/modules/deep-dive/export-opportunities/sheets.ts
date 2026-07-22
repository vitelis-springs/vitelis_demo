import {
	COMPETITIVE_ANALYSIS_COLUMNS,
	COMPETITIVE_ANALYSIS_PROPERTY_KEY,
	COMPETITIVE_COLUMNS,
	DEEP_DIVE_NARRATIVE_COLUMNS,
	DEEP_DIVE_NARRATIVE_KEYS,
	DETAILS_COLUMNS,
	DISCOVERY_QUESTIONS_COLUMNS,
	DISCOVERY_QUESTIONS_PROPERTY_KEY,
	EVIDENCE_COLUMNS,
	MEDDPICC_COLUMNS,
	MEDDPICC_PROPERTY_KEY,
	MEDDPICC_SECTION_KEYS,
	NEXT_BEST_ACTIONS_COLUMNS,
	NEXT_BEST_ACTIONS_PROPERTY_KEY,
	OUTREACH_COLUMNS,
	PORTFOLIO_COLUMNS,
	PRODUCT_COLUMNS,
	PROOF_POINTS_COLUMNS,
	PROOF_POINTS_PROPERTY_KEY,
	QA_DETAILS_COLUMNS,
	QA_SUMMARY_COLUMNS,
	RAW_EXPORT_COLUMNS,
	STAKEHOLDER_COLUMNS,
	WHAT_TO_OFFER_COLUMNS,
	WHAT_TO_OFFER_PROPERTY_KEY,
	WHY_NOW_COLUMNS,
	WHY_NOW_PROPERTY_KEY,
} from "./column-map";
import {
	asNumber,
	asString,
	cellValue,
	countNonEmptyLines,
	formatJsonbForExcel,
	getField,
	humanReviewRequired,
	parseCompetitiveAnalysisValue,
	parseCompetitiveAwareness,
	parseCompetitiveAwarenessBasket,
	parseDiscoveryQuestions,
	parseMeddpiccValue,
	parseMultilineEvidence,
	parseMultilineProducts,
	parseMultilineStakeholders,
	parseNextBestActions,
	parseProofPoints,
	parseWhatToOfferValue,
	parseWhyNowValue,
	priorityLabel,
	recommendedAction,
	warningCount,
} from "./parsers";
import type {
	CellValue,
	ParseWarningBucket,
	RawRow,
	SheetColumnDef,
	SheetData,
} from "./types";

function pick(
	row: RawRow,
	fields: SheetColumnDef[],
	extra: Record<string, CellValue> = {},
): Record<string, CellValue> {
	const out: Record<string, CellValue> = { ...extra };
	for (const col of fields) {
		if (col.field in extra) continue;
		const raw = getField(row, col.field);
		if (col.format === "number" || col.format === "count") {
			out[col.field] = asNumber(raw);
		} else if (col.format === "id") {
			const n = asNumber(raw);
			out[col.field] = n ?? cellValue(raw);
		} else {
			out[col.field] = cellValue(raw);
		}
	}
	return out;
}

function meaningfulText(value: unknown): string | null {
	const text = asString(value)?.trim();
	if (!text || text.toLowerCase() === "n/a") return null;
	return text;
}

function countBy(rows: RawRow[], field: string): Array<[string, CellValue]> {
	return countByFirst(rows, [field]);
}

function countByFirst(
	rows: RawRow[],
	fields: string[],
): Array<[string, CellValue]> {
	const map = new Map<string, number>();
	for (const row of rows) {
		const raw =
			fields
				.map((field) => meaningfulText(getField(row, field)))
				.find(Boolean) ?? "(blank)";
		map.set(raw, (map.get(raw) ?? 0) + 1);
	}
	return Array.from(map.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([k, v]) => [k, v] as [string, CellValue]);
}

export function buildRawExport(rows: RawRow[]): SheetData {
	return {
		name: "99 Raw Export",
		required: true,
		hidden: true,
		columns: RAW_EXPORT_COLUMNS,
		rows: rows.map((row) => pick(row, RAW_EXPORT_COLUMNS)),
	};
}

export function buildOpportunityPortfolio(rows: RawRow[]): SheetData {
	const sheetRows = rows.map((row) => {
		const products = parseMultilineProducts(
			getField(row, "products_summary"),
			{},
		);
		const primary = products.find((p) => p.is_primary) ?? products[0];
		const stakeholders = parseMultilineStakeholders(
			getField(row, "stakeholders"),
			getField(row, "stakeholders_revalidation"),
			{},
		);
		const keyNames = stakeholders
			.slice(0, 3)
			.map((s) => s.person_name)
			.filter(Boolean)
			.join("; ");
		const vendors = parseCompetitiveAwareness(
			getField(row, "competitive_vendors_summary"),
			getField(row, "competitive_sources_summary"),
			{},
		);

		return pick(row, PORTFOLIO_COLUMNS, {
			priority_label: priorityLabel(getField(row, "portfolio_priority_score")),
			primary_product: primary?.product_name ?? null,
			product_bundle_summary: asString(getField(row, "products_summary")),
			product_count: products.length || null,
			key_stakeholders: keyNames || asString(getField(row, "stakeholders")),
			decision_maker_identified: stakeholders.some(
				(s) => s.decision_maker_flag,
			),
			main_incumbent_or_vendor: vendors[0]?.vendor ?? null,
			warning_count: warningCount(row),
			unsupported_claim_count:
				asNumber(getField(row, "qa_grounding_unsupported_claim_count")) ?? 0,
			human_review_required: humanReviewRequired(row),
			is_selected:
				asString(getField(row, "is_selected")) === "X" ? "Yes" : "No",
		});
	});

	return {
		name: "01 Opportunity Portfolio",
		required: true,
		columns: PORTFOLIO_COLUMNS,
		rows: sheetRows,
	};
}

export function buildOpportunityDetails(rows: RawRow[]): SheetData {
	return {
		name: "02 Opportunity Details",
		required: true,
		columns: DETAILS_COLUMNS,
		rows: rows.map((row) => pick(row, DETAILS_COLUMNS)),
	};
}

export function buildQaSummary(rows: RawRow[]): SheetData {
	return {
		name: "08 QA Summary",
		required: false,
		columns: QA_SUMMARY_COLUMNS,
		rows: rows.map((row) =>
			pick(row, QA_SUMMARY_COLUMNS, {
				unsupported_claim_count:
					asNumber(getField(row, "qa_grounding_unsupported_claim_count")) ?? 0,
				overstated_claim_count:
					asNumber(getField(row, "qa_grounding_overstated_claim_count")) ?? 0,
				warning_count: warningCount(row),
				missing_trace_layer_count: countNonEmptyLines(
					getField(row, "qa_traceability_missing_layers"),
				),
				human_review_required: humanReviewRequired(row),
				recommended_action: recommendedAction(row),
			}),
		),
	};
}

export function buildQaDetails(rows: RawRow[]): SheetData {
	return {
		name: "09 QA Details",
		required: false,
		columns: QA_DETAILS_COLUMNS,
		rows: rows.map((row) => pick(row, QA_DETAILS_COLUMNS)),
	};
}

export function buildStakeholders(
	rows: RawRow[],
	warnings: ParseWarningBucket,
): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of rows) {
		const parsed = parseMultilineStakeholders(
			getField(row, "stakeholders"),
			getField(row, "stakeholders_revalidation"),
			warnings,
		);
		for (const s of parsed) {
			out.push({
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				stakeholder_id: s.stakeholder_id,
				gate_role: s.gate_role,
				gate_role_type: s.gate_role_type,
				person_name: s.person_name,
				job_title: s.job_title,
				entity_name: s.entity_name,
				entity_level: s.entity_level,
				email: s.email,
				linkedin_url: s.linkedin_url,
				selection_rationale: s.selection_rationale,
				person_missing: s.person_missing,
				decision_maker_flag: s.decision_maker_flag,
				message_available: s.message_available,
			});
		}
	}
	if (out.length === 0) {
		// TODO: Prefer structured stakeholder CTE export when available instead of multiline parse.
		return null;
	}
	return {
		name: "03 Stakeholders",
		columns: STAKEHOLDER_COLUMNS,
		rows: out,
	};
}

export function buildOutreachMessages(
	rows: RawRow[],
	warnings: ParseWarningBucket,
): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of rows) {
		const parsed = parseMultilineStakeholders(
			getField(row, "stakeholders"),
			getField(row, "stakeholders_revalidation"),
			warnings,
		);
		for (const s of parsed) {
			if (!s.message_available) continue;
			out.push({
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				stakeholder_name: s.person_name,
				stakeholder_title: s.job_title,
				stakeholder_email: s.email,
				message_type: "first_touch",
				email_subject: s.email_subject,
				email_body: s.email_body,
			});
		}
	}
	if (out.length === 0) {
		// TODO: Prefer opportunity_stakeholder_messages join when multiline parse lacks messages.
		return null;
	}
	return {
		name: "04 Outreach Messages",
		columns: OUTREACH_COLUMNS,
		rows: out,
	};
}

export function buildProducts(
	rows: RawRow[],
	warnings: ParseWarningBucket,
): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of rows) {
		const products = parseMultilineProducts(
			getField(row, "products_summary"),
			warnings,
		);
		for (const p of products) {
			out.push({
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				product_name: p.product_name,
				item_role: p.item_role,
				is_primary: p.is_primary,
				required_for_close: p.required_for_close,
				source_score: p.source_score,
				source_confidence: p.source_confidence,
			});
		}
	}
	if (out.length === 0) return null;
	return {
		name: "05 Products",
		columns: PRODUCT_COLUMNS,
		rows: out,
	};
}

export function buildSignalsAndEvidence(
	rows: RawRow[],
	warnings: ParseWarningBucket,
): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of rows) {
		const evidence = parseMultilineEvidence(
			getField(row, "account_signals_signal_confirmations"),
			getField(row, "seed_id"),
			warnings,
		);
		for (const e of evidence) {
			out.push({
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				seed_id: e.seed_id,
				signal_definition_id: e.signal_definition_id,
				signal_name: e.signal_name,
				confirmation_id: e.confirmation_id,
				publisher: e.publisher,
				source_title: e.source_title,
				published_date: e.published_date,
				source_url: e.source_url,
				source_confidence: e.source_confidence,
				applicability_confidence: e.applicability_confidence,
				normalized_claim: e.normalized_claim,
				why_it_confirms: e.why_it_confirms,
				why_it_applies: e.why_it_applies,
			});
		}
	}
	if (out.length === 0) {
		// TODO: Prefer signal_confirmation_rows CTE grain when multiline summaries are insufficient.
		return null;
	}
	return {
		name: "06 Signals & Evidence",
		columns: EVIDENCE_COLUMNS,
		rows: out,
	};
}

function hasMeaningfulCompetitiveValue(value: unknown): boolean {
	const text = asString(value)?.trim();
	if (!text) return false;
	const normalized = text.toLowerCase().replace(/[_-]+/g, " ");
	return normalized !== "not researched" && normalized !== "n/a";
}

export function buildCompetitiveAwareness(
	rows: RawRow[],
	warnings: ParseWarningBucket,
): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of rows) {
		const basket = parseCompetitiveAwarenessBasket(
			getField(row, "competitive_awareness"),
			getField(row, "competitive_vendors_summary"),
			getField(row, "competitive_sources_summary"),
			warnings,
		);
		const hasCompetitiveData = [
			getField(row, "competitive_awareness_status"),
			getField(row, "competitive_incumbent_awareness"),
			basket.competitive_summary,
			basket.competitive_detail,
			basket.vendors_mentioned,
			basket.awareness_themes,
			basket.evidence_sources,
		].some(hasMeaningfulCompetitiveValue);
		if (!hasCompetitiveData) continue;

		const confidence =
			asNumber(getField(row, "competitive_confidence")) ?? basket.confidence;

		out.push({
			opportunity_candidate_id: cellValue(
				getField(row, "opportunity_candidate_id"),
			),
			account: cellValue(getField(row, "account")),
			opportunity_title: cellValue(getField(row, "opportunity_title")),
			competitive_status: cellValue(
				getField(row, "competitive_awareness_status"),
			),
			applicability: cellValue(getField(row, "competitive_applicability")),
			confidence,
			seller_implication: cellValue(
				getField(row, "competitive_seller_implication"),
			),
			sales_implication: basket.sales_implication,
			competitive_summary:
				basket.competitive_summary ||
				cellValue(getField(row, "competitive_incumbent_awareness")),
			competitive_detail: basket.competitive_detail,
			vendors_mentioned: basket.vendors_mentioned,
			awareness_themes: basket.awareness_themes,
			evidence_sources: basket.evidence_sources,
			group_key: basket.group_key,
			group_name: basket.group_name,
			generated_at: basket.generated_at,
		});
	}
	if (out.length === 0) {
		return null;
	}
	return {
		name: "07 Competitive Awareness",
		columns: COMPETITIVE_COLUMNS,
		rows: out,
	};
}

/**
 * Wide sheet: one row per opportunity with selected narrative property keys as columns.
 */
export function buildDeepDiveNarrative(
	propertyRows: RawRow[],
): SheetData | null {
	const byOpp = new Map<
		string,
		{
			opportunity_candidate_id: CellValue;
			account: CellValue;
			opportunity_title: CellValue;
			values: Partial<Record<string, CellValue>>;
		}
	>();

	const keySet = new Set<string>(DEEP_DIVE_NARRATIVE_KEYS);

	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (!key || !keySet.has(key)) continue;

		const oppId = asString(getField(row, "opportunity_candidate_id"));
		if (!oppId) continue;

		let entry = byOpp.get(oppId);
		if (!entry) {
			entry = {
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				values: {},
			};
			byOpp.set(oppId, entry);
		}
		entry.values[key] = formatJsonbForExcel(getField(row, "value_json"));
	}

	if (byOpp.size === 0) return null;

	const rows = Array.from(byOpp.values()).map((entry) => {
		const out: Record<string, CellValue> = {
			opportunity_candidate_id: entry.opportunity_candidate_id,
			account: entry.account,
			opportunity_title: entry.opportunity_title,
		};
		for (const key of DEEP_DIVE_NARRATIVE_KEYS) {
			out[key] = entry.values[key] ?? null;
		}
		return out;
	});

	return {
		name: "10 Deep Dive Narrative",
		columns: DEEP_DIVE_NARRATIVE_COLUMNS,
		rows,
	};
}

/**
 * Wide sheet: one row per opportunity with MEDDPICC sections as summary + sources columns.
 */
export function buildMeddpicc(propertyRows: RawRow[]): SheetData | null {
	const byOpp = new Map<
		string,
		{
			opportunity_candidate_id: CellValue;
			account: CellValue;
			opportunity_title: CellValue;
			sections: Record<
				string,
				{ summary: string | null; sources: string | null }
			>;
		}
	>();

	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (key !== MEDDPICC_PROPERTY_KEY) continue;

		const oppId = asString(getField(row, "opportunity_candidate_id"));
		if (!oppId) continue;

		const parsed = parseMeddpiccValue(getField(row, "value_json"));
		if (!parsed) continue;

		let entry = byOpp.get(oppId);
		if (!entry) {
			entry = {
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				sections: {},
			};
			byOpp.set(oppId, entry);
		}
		for (const [sectionKey, section] of Object.entries(parsed)) {
			entry.sections[sectionKey] = section;
		}
	}

	if (byOpp.size === 0) return null;

	const rows = Array.from(byOpp.values()).map((entry) => {
		const out: Record<string, CellValue> = {
			opportunity_candidate_id: entry.opportunity_candidate_id,
			account: entry.account,
			opportunity_title: entry.opportunity_title,
		};
		for (const section of MEDDPICC_SECTION_KEYS) {
			const data = entry.sections[section];
			out[`${section}_summary`] = data?.summary ?? null;
			out[`${section}_sources`] = data?.sources ?? null;
		}
		return out;
	});

	return {
		name: "12 MEDDPICC",
		columns: MEDDPICC_COLUMNS,
		rows,
	};
}

/**
 * One row per opportunity × next-best-action item, parsed from the nextBestActions property.
 */
export function buildNextBestActions(propertyRows: RawRow[]): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (key !== NEXT_BEST_ACTIONS_PROPERTY_KEY) continue;

		const actions = parseNextBestActions(getField(row, "value_json"));
		for (const a of actions) {
			out.push({
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				sequence: a.sequence,
				due: a.due,
				who: a.who,
				action: a.action,
				rationale: a.rationale,
				tool_suggested: a.tool_suggested,
			});
		}
	}
	if (out.length === 0) return null;
	return {
		name: "13 Next Best Actions",
		columns: NEXT_BEST_ACTIONS_COLUMNS,
		rows: out,
	};
}

/**
 * One row per opportunity, parsed from the competitiveAnalysis property.
 */
export function buildCompetitiveAnalysis(
	propertyRows: RawRow[],
): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (key !== COMPETITIVE_ANALYSIS_PROPERTY_KEY) continue;

		const parsed = parseCompetitiveAnalysisValue(getField(row, "value_json"));
		if (!parsed) continue;

		out.push({
			opportunity_candidate_id: cellValue(
				getField(row, "opportunity_candidate_id"),
			),
			account: cellValue(getField(row, "account")),
			opportunity_title: cellValue(getField(row, "opportunity_title")),
			incumbent_vendor: parsed.incumbent_vendor,
			incumbent_strength: parsed.incumbent_strength,
			switching_friction: parsed.switching_friction,
			tenant_counter: parsed.tenant_counter,
			narrative: parsed.narrative,
			win_themes: parsed.win_themes,
			incumbents: parsed.incumbents,
			sources: parsed.sources,
			incumbent_evidence: parsed.incumbent_evidence,
		});
	}
	if (out.length === 0) return null;
	return {
		name: "14 Competitive Analysis",
		columns: COMPETITIVE_ANALYSIS_COLUMNS,
		rows: out,
	};
}

/**
 * One row per opportunity × question, parsed from the discoveryQuestions property.
 */
export function buildDiscoveryQuestions(
	propertyRows: RawRow[],
): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (key !== DISCOVERY_QUESTIONS_PROPERTY_KEY) continue;

		const questions = parseDiscoveryQuestions(getField(row, "value_json"));
		for (const q of questions) {
			out.push({
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				sequence: q.sequence,
				layer: q.layer,
				question: q.question,
				rationale: q.rationale,
			});
		}
	}
	if (out.length === 0) return null;
	return {
		name: "15 Discovery Questions",
		columns: DISCOVERY_QUESTIONS_COLUMNS,
		rows: out,
	};
}

/**
 * One row per opportunity, parsed from the whatToOffer property.
 */
export function buildWhatToOffer(propertyRows: RawRow[]): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (key !== WHAT_TO_OFFER_PROPERTY_KEY) continue;

		const parsed = parseWhatToOfferValue(getField(row, "value_json"));
		if (!parsed) continue;

		out.push({
			opportunity_candidate_id: cellValue(
				getField(row, "opportunity_candidate_id"),
			),
			account: cellValue(getField(row, "account")),
			opportunity_title: cellValue(getField(row, "opportunity_title")),
			offering: parsed.offering,
			offering_description: parsed.offering_description,
			approach: parsed.approach,
			business_outcome: parsed.business_outcome,
			supporting_portfolio: parsed.supporting_portfolio,
		});
	}
	if (out.length === 0) return null;
	return {
		name: "16 What To Offer",
		columns: WHAT_TO_OFFER_COLUMNS,
		rows: out,
	};
}

/**
 * One row per opportunity × proof point, parsed from the proofPoints property.
 */
export function buildProofPoints(propertyRows: RawRow[]): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (key !== PROOF_POINTS_PROPERTY_KEY) continue;

		const points = parseProofPoints(getField(row, "value_json"));
		for (const pt of points) {
			out.push({
				opportunity_candidate_id: cellValue(
					getField(row, "opportunity_candidate_id"),
				),
				account: cellValue(getField(row, "account")),
				opportunity_title: cellValue(getField(row, "opportunity_title")),
				sequence: pt.sequence,
				claim: pt.claim,
				evidence: pt.evidence,
				source_url: pt.source_url,
				applicability: pt.applicability,
				verbatim_support: pt.verbatim_support,
			});
		}
	}
	if (out.length === 0) return null;
	return {
		name: "17 Proof Points",
		columns: PROOF_POINTS_COLUMNS,
		rows: out,
	};
}

/**
 * One row per opportunity, parsed from the whyNow property.
 */
export function buildWhyNow(propertyRows: RawRow[]): SheetData | null {
	const out: Record<string, CellValue>[] = [];
	for (const row of propertyRows) {
		const key = asString(getField(row, "property_key"));
		if (key !== WHY_NOW_PROPERTY_KEY) continue;

		const parsed = parseWhyNowValue(getField(row, "value_json"));
		if (!parsed) continue;

		out.push({
			opportunity_candidate_id: cellValue(
				getField(row, "opportunity_candidate_id"),
			),
			account: cellValue(getField(row, "account")),
			opportunity_title: cellValue(getField(row, "opportunity_title")),
			confidence: parsed.confidence,
			narrative: parsed.narrative,
			sources: parsed.sources,
		});
	}
	if (out.length === 0) return null;
	return {
		name: "18 Why Now",
		columns: WHY_NOW_COLUMNS,
		rows: out,
	};
}

export function buildOverview(rows: RawRow[]): SheetData {
	const accounts = new Set(
		rows.map((r) => asString(getField(r, "account"))).filter(Boolean),
	);
	const selected = rows.filter(
		(r) => asString(getField(r, "is_selected")) === "X",
	).length;
	const reviewRows = rows.filter((r) => humanReviewRequired(r));
	const unsupported = rows.filter(
		(r) =>
			(asNumber(getField(r, "qa_grounding_unsupported_claim_count")) ?? 0) > 0,
	).length;
	const noStakeholders = rows.filter(
		(r) => (asNumber(getField(r, "stakeholders_count")) ?? 0) === 0,
	).length;
	const withCompetitive = rows.filter((r) => {
		const status = asString(
			getField(r, "competitive_awareness_status"),
		)?.toLowerCase();
		const text = asString(getField(r, "competitive_incumbent_awareness"));
		return (
			(status && status !== "not_researched") ||
			(Boolean(text) && text !== "Not researched")
		);
	}).length;

	return {
		name: "00 Overview",
		required: true,
		columns: [],
		rows: [],
		metricBlocks: [
			{
				title: "Summary metrics",
				rows: [
					["Accounts", accounts.size],
					["Opportunities", rows.length],
					["Selected opportunities", selected],
					["Requiring human review", reviewRows.length],
					["With unsupported claims", unsupported],
					["Without identified stakeholders", noStakeholders],
					["With incumbents / competitors", withCompetitive],
				],
			},
			{
				title: "Opportunities by priority (score band)",
				rows: (() => {
					const bands = { High: 0, Medium: 0, Low: 0, Unknown: 0 };
					for (const row of rows) {
						const label = priorityLabel(
							getField(row, "portfolio_priority_score"),
						);
						if (label === "High") bands.High += 1;
						else if (label === "Medium") bands.Medium += 1;
						else if (label === "Low") bands.Low += 1;
						else bands.Unknown += 1;
					}
					return Object.entries(bands) as Array<[string, CellValue]>;
				})(),
			},
			{
				title: "Opportunities by horizon",
				rows: countByFirst(rows, [
					"horizon_name",
					"time_label_general",
					"horizon",
				]),
			},
			{
				title: "Opportunities by deal size",
				rows: countByFirst(rows, [
					"deal_size_general",
					"indicative_deal_size_range",
				]),
			},
			{
				title: "Opportunities by delivery type",
				rows: countBy(rows, "delivery_type"),
			},
			{
				title: "Opportunities by solution center",
				rows: countBy(rows, "solution_center"),
			},
			{
				title: "Opportunities by QA grounding status",
				rows: countBy(rows, "qa_grounding_status"),
			},
		],
	};
}

export function detectMissingColumns(rows: RawRow[]): string[] {
	if (rows.length === 0) return [];
	const sample = rows[0] ?? {};
	const keys = new Set(Object.keys(sample).map((k) => k.toLowerCase()));
	const expected = RAW_EXPORT_COLUMNS.map((c) => c.field);
	return expected.filter((f) => !keys.has(f.toLowerCase()));
}
