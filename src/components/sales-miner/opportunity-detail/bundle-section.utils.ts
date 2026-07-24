import type {
	Bundle,
	BundleEvidence,
	BundleTrigger,
} from "./bundle-section.types";
import { asObj, num, str } from "./opportunity-detail.value-utils";

export { hostOf } from "./opportunity-detail.value-utils";

/** 50000 → "$50K", 250000 → "$250K", 1500000 → "$1.5M". */
function money(value: number): string {
	if (Math.abs(value) >= 1_000_000) {
		return `$${(value / 1_000_000).toLocaleString("en-US", {
			maximumFractionDigits: 1,
		})}M`;
	}
	if (Math.abs(value) >= 1_000) {
		return `$${Math.round(value / 1_000).toLocaleString("en-US")}K`;
	}
	return `$${value.toLocaleString("en-US")}`;
}

/** ISO date → "Jul 28, 2025"; leaves anything unparseable untouched. */
export function formatDate(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function dealRange(low: number | null, high: number | null): string | null {
	if (low != null && high != null) return `${money(low)} – ${money(high)}`;
	if (low != null) return money(low);
	if (high != null) return money(high);
	return null;
}

function parseTriggers(value: unknown): BundleTrigger[] {
	if (!Array.isArray(value)) return [];
	return value
		.map(asObj)
		.filter((t): t is Record<string, unknown> => t !== null)
		.map((t) => ({ date: str(t.date), text: str(t.trigger) }))
		.filter((t): t is BundleTrigger => t.text !== null)
		.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

function parseEvidence(value: unknown): BundleEvidence[] {
	if (!Array.isArray(value)) return [];
	return value
		.map(asObj)
		.filter((e): e is Record<string, unknown> => e !== null)
		.map((e) => ({
			url: str(e.url),
			quote: str(e.claimQuote),
			source: str(e.sourceName),
		}))
		.filter((e) => e.url !== null || e.quote !== null);
}

/**
 * Normalize a raw bundle record into the {@link Bundle} the view renders.
 * Returns null when the value isn't a bundle object, so the view can skip it.
 */
export function parseBundle(value: unknown): Bundle | null {
	const raw = asObj(value);
	if (!raw) return null;
	return {
		name: str(raw.bundleName),
		whyNow: str(raw.bundleWhyNow),
		narrative: str(raw.bundleNarrative),
		pricing: str(raw.bundlePricingNote),
		dealRange: dealRange(num(raw.bundleDealLow), num(raw.bundleDealHigh)),
		triggers: parseTriggers(raw.bundleTriggers),
		evidence: parseEvidence(raw.bundleEvidenceUrls),
	};
}
