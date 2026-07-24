/**
 * Maps raw opportunity-detail query rows into the DTOs the review UI renders.
 * Kept out of DeepDiveService so the service stays fetch-and-orchestrate.
 */

import type { Prisma } from "../../../../generated/prisma";
import type {
	OpportunityPortfolio,
	OpportunityQa,
	OpportunityQaDimension,
	OpportunityStakeholder,
} from "../../../../types/sales-miner-opportunity-detail.types";
import type { DeepDiveRepository } from "./deep-dive.repository";

type StakeholderRows = Awaited<
	ReturnType<typeof DeepDiveRepository.getOpportunityStakeholders>
>;

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayLen(value: unknown): number {
	return Array.isArray(value) ? value.length : 0;
}

export function buildOpportunityStakeholders(
	rows: StakeholderRows,
): OpportunityStakeholder[] {
	return rows.map((row) => {
		const contacts = isJsonObject(row.contacts) ? row.contacts : null;
		const emails = Array.isArray(contacts?.emails)
			? (contacts.emails as unknown[]).filter(
					(email): email is string =>
						typeof email === "string" && email.trim().length > 0,
				)
			: [];
		return {
			id: row.id,
			personId: row.person_id,
			messageId: row.message_id,
			gateRole: row.gate_role,
			gateRoleType: row.gate_role_type,
			name: row.full_name,
			jobTitle: row.job_title,
			entityName: row.entity_name,
			entityLevel: row.entity_level,
			linkedinUrl: row.linkedin_url,
			emails,
			rationale: row.rationale,
			messageSubject: row.message_subject,
			messageBody: row.message_body,
		};
	});
}

/** Quality-assessment dimensions, in reviewer-facing order. */
const QA_DIMENSIONS: Array<{ key: string; label: string }> = [
	{ key: "grounding", label: "Grounding" },
	{ key: "traceability", label: "Traceability" },
	{ key: "company_binding", label: "Company binding" },
	{ key: "customer_relevance", label: "Customer relevance" },
	{ key: "commercial_logic", label: "Commercial logic" },
];

export function buildOpportunityQa(
	qualityJson: Prisma.JsonValue | null,
): OpportunityQa | null {
	const quality = isJsonObject(qualityJson) ? qualityJson : null;
	if (!quality) return null;

	const dimensions: OpportunityQaDimension[] = QA_DIMENSIONS.flatMap((def) => {
		const dim = isJsonObject(quality[def.key])
			? (quality[def.key] as Record<string, unknown>)
			: null;
		if (!dim) return [];
		const status = dim[`${def.key}_status`];
		const score = dim[`${def.key}_score`];
		const explanation = dim.short_explanation ?? dim.reasoning;
		const warnings = dim[`${def.key}_warnings`] ?? dim.warnings;
		return [
			{
				key: def.key,
				label: def.label,
				status: typeof status === "string" ? status : null,
				score:
					typeof score === "number"
						? score
						: typeof score === "string" && score.trim() !== ""
							? Number(score)
							: null,
				recommendedAction:
					typeof dim.recommended_action === "string"
						? dim.recommended_action
						: null,
				explanation: typeof explanation === "string" ? explanation : null,
				warningCount: arrayLen(warnings),
			},
		];
	});

	const grounding = isJsonObject(quality.grounding)
		? (quality.grounding as Record<string, unknown>)
		: null;

	return {
		dimensions,
		humanReviewRequired:
			typeof quality.human_review_required === "boolean"
				? quality.human_review_required
				: null,
		unsupportedClaimCount: arrayLen(grounding?.unsupported_claims),
		overstatedClaimCount: arrayLen(grounding?.overstated_claims),
	};
}

export function buildOpportunityPortfolio(
	base: {
		rank_position: number | null;
		portfolio_priority_reason: string | null;
		deal_size_general: string | null;
		time_label_general: string | null;
		horizon_name: string | null;
		solution_center: string | null;
		primary_buyer_persona: string | null;
		primary_business_problem: string | null;
		primary_value_proposition: string | null;
	},
	/** Already clamped by the caller (shared with header.priorityScore). */
	priorityScore: number,
	commercialSnapshot: Prisma.JsonValue | null,
): OpportunityPortfolio {
	const snapshot = isJsonObject(commercialSnapshot) ? commercialSnapshot : null;
	return {
		rankPosition: base.rank_position,
		priorityScore,
		priorityReason: base.portfolio_priority_reason,
		dealSize: base.deal_size_general,
		timeLabel: base.time_label_general,
		horizonName: base.horizon_name,
		solutionCenter: base.solution_center,
		primaryProduct: typeof snapshot?.sku === "string" ? snapshot.sku : null,
		productBundleSummary: null,
		buyerPersona: base.primary_buyer_persona,
		businessProblem: base.primary_business_problem,
		valueProposition: base.primary_value_proposition,
	};
}
