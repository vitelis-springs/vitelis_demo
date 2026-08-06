/**
 * The discovery config kept under `customers.settings.product_discovery`.
 *
 * Discovery gets a company name and a website; that is enough for a
 * whole-company portfolio and not nearly enough for a business unit. Customer
 * 26 is "AWS marketplace [SecurityHubX] US" pointing at aws.amazon.com — run
 * against that alone, discovery returns EC2, S3 and Lambda. `unit` plus the
 * portfolio's own page is what turns it into the Security Hub Extended
 * catalogue. Every field is optional and most customers need none of them.
 */

export const SETTINGS_KEY = "product_discovery";

export const PORTFOLIO_TYPES = [
	"reseller_marketplace",
	"own_software",
	"services",
	"physical_goods",
	"plans_bundles",
	"regulated_products",
	"retail_media",
] as const;

export type PortfolioType = (typeof PORTFOLIO_TYPES)[number];

export interface ProductDiscoverySettings {
	unit?: string;
	subset_rule?: string;
	/**
	 * Whether products made by other companies belong in this catalogue.
	 * True (the default) fits resellers and marketplaces, whose third-party
	 * rows ARE the catalogue; false fits integrators, whose rows should be
	 * their own services rather than their partners' product lines.
	 */
	include_third_party?: boolean;
	/**
	 * Whether a row whose only link is a datasheet or service brief counts as a
	 * catalogue entry. False (the default) because a document describes an
	 * offering rather than being one, and a company that sells something gives
	 * it a page. True for the rare catalogue published entirely as datasheets.
	 */
	include_documents?: boolean;
	target_urls?: string[];
	source_of_truth_urls?: string[];
	aliases?: string[];
	portfolio_type?: PortfolioType;
	taxonomy?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] | undefined {
	if (typeof value === "string")
		return value.trim() ? [value.trim()] : undefined;
	if (!Array.isArray(value)) return undefined;
	const cleaned = value
		.filter((v): v is string => typeof v === "string")
		.map((v) => v.trim())
		.filter(Boolean);
	return cleaned.length ? cleaned : undefined;
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Read the discovery config out of a customer's settings blob. */
export function readDiscoverySettings(
	settings: unknown,
): ProductDiscoverySettings {
	if (!isRecord(settings)) return {};
	const raw = settings[SETTINGS_KEY];
	if (!isRecord(raw)) return {};

	const portfolioType = text(raw.portfolio_type);
	return {
		unit: text(raw.unit),
		subset_rule: text(raw.subset_rule),
		include_third_party:
			typeof raw.include_third_party === "boolean"
				? raw.include_third_party
				: undefined,
		include_documents:
			typeof raw.include_documents === "boolean"
				? raw.include_documents
				: undefined,
		target_urls: strings(raw.target_urls),
		source_of_truth_urls: strings(raw.source_of_truth_urls),
		aliases: strings(raw.aliases),
		portfolio_type: PORTFOLIO_TYPES.includes(portfolioType as PortfolioType)
			? (portfolioType as PortfolioType)
			: undefined,
		taxonomy: strings(raw.taxonomy),
	};
}

/**
 * Merge a discovery config back into the settings blob.
 *
 * `settings` is shared — the PATCH endpoint replaces the whole column, so
 * anything else living in there has to be carried across or it is lost. Empty
 * values are dropped rather than stored as `""`, so a cleared field reads back
 * as absent instead of as an empty unit name that would narrow a search to
 * nothing.
 */
/**
 * What each flag means when it is absent, mirroring the engine's own defaults
 * (`DiscoveryConfig`). Kept beside the merge so a stored value and an omitted
 * one can never disagree about what the customer asked for.
 */
export const BOOLEAN_DEFAULTS: Record<string, boolean> = {
	include_third_party: true,
	include_documents: false,
};

export function mergeDiscoverySettings(
	existing: unknown,
	next: ProductDiscoverySettings,
): Record<string, unknown> {
	const base = isRecord(existing) ? { ...existing } : {};
	const cleaned: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(next)) {
		if (value == null) continue;
		if (typeof value === "boolean") {
			// Only deviations from the default are stored, so a toggled-back
			// customer reads as absent — the same rule as cleared text fields.
			// The defaults differ per flag, so they cannot be assumed here.
			if (value !== BOOLEAN_DEFAULTS[key]) cleaned[key] = value;
			continue;
		}
		if (typeof value === "string") {
			if (value.trim()) cleaned[key] = value.trim();
			continue;
		}
		if (Array.isArray(value)) {
			const items = value.map((v) => String(v).trim()).filter(Boolean);
			if (items.length) cleaned[key] = items;
		}
	}

	if (Object.keys(cleaned).length === 0) {
		delete base[SETTINGS_KEY];
		return base;
	}
	base[SETTINGS_KEY] = cleaned;
	return base;
}
