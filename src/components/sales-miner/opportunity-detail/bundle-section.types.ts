/** A dated signal that justifies the bundle's timing. */
export interface BundleTrigger {
	date: string | null;
	text: string;
}

/** A cited source backing a claim in the bundle. */
export interface BundleEvidence {
	url: string | null;
	quote: string | null;
	source: string | null;
}

/**
 * The bundle normalized for display: machine keys resolved to view fields,
 * money and ranges pre-formatted, working metadata (bundleId, plays) dropped.
 */
export interface Bundle {
	name: string | null;
	whyNow: string | null;
	narrative: string | null;
	pricing: string | null;
	dealRange: string | null;
	triggers: BundleTrigger[];
	evidence: BundleEvidence[];
}
