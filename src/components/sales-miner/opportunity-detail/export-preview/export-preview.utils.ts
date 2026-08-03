import { asObj, num, str } from "../opportunity-detail.value-utils";
import type { Competitive } from "./export-preview.types";

export { hostOf } from "../opportunity-detail.value-utils";

/** Human-readable label from a machine status ("not_researched" → "Not researched"). */
export function humanize(value: string | null | undefined): string {
	if (!value) return "—";
	return value.replace(/[_-]+/g, " ").replace(/\b\w/, (c) => c.toUpperCase());
}

/** Up to two initials for a name, used in stakeholder avatars. */
export function initials(name: string | null): string {
	if (!name) return "—";
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "—";
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return (first + last).toUpperCase();
}

/** Normalize the raw competitive_awareness JSONB into {@link Competitive}. */
export function parseCompetitive(value: unknown): Competitive | null {
	const raw = asObj(value);
	if (!raw) return null;

	const vendors = Array.isArray(raw.vendors)
		? raw.vendors
				.map(asObj)
				.filter((v): v is Record<string, unknown> => v !== null)
				.map((v) => ({
					name: str(v.name),
					role: str(v.role),
					evidenceStrength: str(v.evidence_strength),
				}))
		: [];

	const sources = Array.isArray(raw.sources)
		? raw.sources
				.map(asObj)
				.filter((s): s is Record<string, unknown> => s !== null)
				.map((s) => ({
					url: str(s.url),
					title: str(s.title),
					evidenceSummary: str(s.evidence_summary),
				}))
		: [];

	const result: Competitive = {
		status: str(raw.status),
		applicability: str(raw.applicability),
		confidence: num(raw.confidence),
		sellerImplication: str(raw.seller_implication),
		salesImplication: str(raw.sales_implication),
		detailText: str(raw.detail_text) ?? str(raw.cell_text),
		vendors,
		sources,
	};

	const hasContent =
		result.status ||
		result.detailText ||
		result.vendors.length > 0 ||
		result.sources.length > 0;
	return hasContent ? result : null;
}
