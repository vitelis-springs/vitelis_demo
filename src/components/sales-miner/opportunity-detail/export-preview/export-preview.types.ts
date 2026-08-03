export type ExportTabId = "portfolio" | "stakeholders" | "competitive" | "qa";

/** Semantic tone for a status/score badge. */
export type Tone = "win" | "ok" | "warn" | "risk" | "mute";

export interface CompetitiveVendor {
	name: string | null;
	role: string | null;
	evidenceStrength: string | null;
}

export interface CompetitiveSource {
	url: string | null;
	title: string | null;
	evidenceSummary: string | null;
}

/** competitive_awareness JSONB normalized for display. */
export interface Competitive {
	status: string | null;
	applicability: string | null;
	confidence: number | null;
	sellerImplication: string | null;
	salesImplication: string | null;
	detailText: string | null;
	vendors: CompetitiveVendor[];
	sources: CompetitiveSource[];
}
