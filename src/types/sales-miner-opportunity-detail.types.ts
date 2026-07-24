/**
 * Route-specific DTOs for the SalesMiner opportunity-detail review page.
 * Kept out of deep-dive.types.ts (broader API contracts) so this feature owns
 * its own shapes. Consumed by the export-preview mapper and tab components.
 */

/** A person mapped to a buying-committee gate for this opportunity. */
export interface OpportunityStakeholder {
	id: number;
	personId: number | null;
	messageId: string | null;
	gateRole: string | null;
	gateRoleType: string | null;
	name: string | null;
	jobTitle: string | null;
	entityName: string | null;
	entityLevel: string | null;
	linkedinUrl: string | null;
	emails: string[];
	rationale: string | null;
	messageSubject: string | null;
	messageBody: string | null;
}

/** One quality-assessment dimension (grounding, traceability, …). */
export interface OpportunityQaDimension {
	key: string;
	label: string;
	status: string | null;
	score: number | null;
	recommendedAction: string | null;
	explanation: string | null;
	warningCount: number;
}

export interface OpportunityQa {
	dimensions: OpportunityQaDimension[];
	humanReviewRequired: boolean | null;
	unsupportedClaimCount: number;
	overstatedClaimCount: number;
}

/** Portfolio-level summary the reviewer vets before export. */
export interface OpportunityPortfolio {
	rankPosition: number | null;
	priorityScore: number | null;
	priorityReason: string | null;
	dealSize: string | null;
	timeLabel: string | null;
	horizonName: string | null;
	solutionCenter: string | null;
	primaryProduct: string | null;
	productBundleSummary: string | null;
	buyerPersona: string | null;
	businessProblem: string | null;
	valueProposition: string | null;
}
