import type { CellValue, ParseWarningBucket, RawRow } from "./types";

export function bumpWarning(warnings: ParseWarningBucket, key: string): void {
	warnings[key] = (warnings[key] ?? 0) + 1;
}

export function asString(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "string") return value;
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (value instanceof Date) return value.toISOString();
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

export function asNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "bigint") return Number(value);
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "boolean") return value ? 1 : 0;
	// Prisma Decimal / similar objects expose toNumber / toString
	if (typeof value === "object") {
		const obj = value as { toNumber?: () => number; toString?: () => string };
		if (typeof obj.toNumber === "function") {
			const n = obj.toNumber();
			return Number.isFinite(n) ? n : null;
		}
		if (typeof obj.toString === "function") {
			const n = Number(obj.toString());
			return Number.isFinite(n) ? n : null;
		}
	}
	const n = Number(String(value).trim());
	return Number.isFinite(n) ? n : null;
}

export function asBool(value: unknown): boolean | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "boolean") return value;
	const s = String(value).trim().toLowerCase();
	if (["true", "t", "yes", "y", "1", "x"].includes(s)) return true;
	if (["false", "f", "no", "n", "0"].includes(s)) return false;
	return null;
}

export function stripCitationArtifacts(value: string): string {
	const stripped = value
		.replace(/\uE200cite(?:\uE202[^\uE200-\uE202\s.,;:!?)]*)+\uE201?/g, "")
		.replace(/\\ue200cite(?:\\ue202[^\\\s.,;:!?)]*)+(?:\\ue201)?/gi, "");

	if (stripped === value) return value;

	return stripped
		.replace(/[ \t]{2,}/g, " ")
		.replace(/\s+([,.;:!?])/g, "$1")
		.trim();
}

export function cellValue(value: unknown): CellValue {
	if (value === null || value === undefined) return null;
	if (typeof value === "bigint") {
		const n = Number(value);
		return Number.isSafeInteger(n) ? n : value.toString();
	}
	if (value instanceof Date) return value;
	if (typeof value === "object") {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return typeof value === "string" ? stripCitationArtifacts(value) : value;
	}
	return stripCitationArtifacts(String(value));
}

/** Flatten jsonb for Excel: unwrap scalars, pretty-print objects/arrays. */
export function formatJsonbForExcel(
	value: unknown,
): string | number | boolean | null {
	if (value === null || value === undefined) return null;
	let parsed: unknown = value;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (
			(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
			(trimmed.startsWith("[") && trimmed.endsWith("]")) ||
			(trimmed.startsWith('"') && trimmed.endsWith('"'))
		) {
			try {
				parsed = JSON.parse(trimmed);
			} catch {
				return stripCitationArtifacts(value);
			}
		} else {
			return stripCitationArtifacts(value);
		}
	}
	if (
		typeof parsed === "string" ||
		typeof parsed === "number" ||
		typeof parsed === "boolean"
	) {
		return typeof parsed === "string" ? stripCitationArtifacts(parsed) : parsed;
	}
	try {
		return stripCitationArtifacts(JSON.stringify(parsed, null, 2));
	} catch {
		return stripCitationArtifacts(String(parsed));
	}
}

export function getField(row: RawRow, field: string): unknown {
	if (field in row) return row[field];
	const lower = field.toLowerCase();
	for (const [k, v] of Object.entries(row)) {
		if (k.toLowerCase() === lower) return v;
	}
	return undefined;
}

export function parseJsonValue(
	value: unknown,
	warnings: ParseWarningBucket,
): unknown {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "object") return value;
	if (typeof value !== "string") return value;
	try {
		return JSON.parse(value);
	} catch {
		bumpWarning(warnings, "json");
		return null;
	}
}

export type ParsedProduct = {
	product_name: string | null;
	item_role: string | null;
	is_primary: boolean;
	required_for_close: boolean;
	source_score: number | null;
	source_confidence: number | null;
};

/**
 * Parse products_summary lines:
 * `01 | role | Product Name | primary=yes | required_for_close=yes | source_score=1.2 | ...`
 */
export function parseMultilineProducts(
	summary: unknown,
	warnings: ParseWarningBucket,
): ParsedProduct[] {
	const text = asString(summary)?.trim();
	if (!text) return [];
	try {
		const blocks = text
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);
		const out: ParsedProduct[] = [];
		for (const line of blocks) {
			const parts = line.split(" | ").map((p) => p.trim());
			if (parts.length < 3) {
				bumpWarning(warnings, "products");
				continue;
			}
			const flags = parts.slice(3).join(" | ");
			out.push({
				item_role: parts[1] || null,
				product_name: parts[2] || null,
				is_primary: /primary=yes/i.test(flags),
				required_for_close: /required_for_close=yes/i.test(flags),
				source_score: (() => {
					const m = flags.match(/source_score=([0-9.+-eE]+)/i);
					return m ? asNumber(m[1]) : null;
				})(),
				source_confidence: (() => {
					const m = flags.match(/source_confidence=([0-9.+-eE]+)/i);
					return m ? asNumber(m[1]) : null;
				})(),
			});
		}
		return out;
	} catch {
		bumpWarning(warnings, "products");
		return [];
	}
}

export type ParsedStakeholder = {
	stakeholder_id: string | null;
	gate_role: string | null;
	gate_role_type: string | null;
	person_name: string | null;
	job_title: string | null;
	entity_name: string | null;
	entity_level: string | null;
	email: string | null;
	linkedin_url: string | null;
	selection_rationale: string | null;
	person_missing: boolean;
	decision_maker_flag: boolean;
	message_available: boolean;
	email_subject: string | null;
	email_body: string | null;
};

/**
 * Parse stakeholders multiline cell produced by OPPS_QUERY.
 * Blocks start with a numbered header (`01 | Role | Name`), not blank lines —
 * email bodies often contain paragraph breaks (`\n\n`) that must stay intact.
 * Fields: title:/entity:/email:/linkedin:/email_subject:/email_body:
 */
export function parseMultilineStakeholders(
	summary: unknown,
	revalidation: unknown,
	warnings: ParseWarningBucket,
): ParsedStakeholder[] {
	const text = asString(summary)?.trim();
	if (!text) return [];
	try {
		const rationaleById = new Map<string, string>();
		const reval = asString(revalidation)?.trim();
		if (reval) {
			for (const block of reval.split(/\n\n+/)) {
				const idMatch = block.match(/stakeholder_id=(\d+)/i);
				const ratMatch = block.match(/rationale:\s*([\s\S]*?)(?:\n|$)/i);
				const id = idMatch?.[1];
				const rationale = ratMatch?.[1]?.trim();
				if (id && rationale) {
					rationaleById.set(id, rationale);
				}
			}
		}

		// Split on numbered stakeholder headers, not blank lines (email bodies use \n\n).
		const rawLines = text.split("\n");
		const blocks: string[][] = [];
		let current: string[] = [];
		for (const line of rawLines) {
			const trimmedStart = line.trimStart();
			if (/^\d+\s*\|/.test(trimmedStart) && current.length > 0) {
				blocks.push(current);
				current = [line];
			} else {
				current.push(line);
			}
		}
		if (current.length > 0) blocks.push(current);

		const out: ParsedStakeholder[] = [];
		for (const blockLines of blocks) {
			const headerLine = blockLines[0]?.trim();
			if (!headerLine) continue;
			const headerMatch = headerLine.match(
				/^\d+\s*\|\s*(.+?)\s*(?:\(([^)]+)\))?\s*\|\s*(.+)$/,
			);
			if (!headerMatch) {
				bumpWarning(warnings, "stakeholders");
				continue;
			}
			let gateRole = (headerMatch[1] ?? "").trim();
			const nestedType = headerMatch[2]?.trim();
			let gateRoleType: string | null = nestedType ?? null;
			if (!gateRoleType) {
				const m = gateRole.match(/\(([^)]+)\)\s*$/);
				if (m?.[1]) {
					gateRole = gateRole.replace(/\s*\([^)]+\)\s*$/, "").trim();
					gateRoleType = m[1];
				}
			}
			const personName = (headerMatch[3] ?? "").trim();
			const fields: Record<string, string> = {};
			let bodyMode = false;
			const bodyLines: string[] = [];
			for (const rawLine of blockLines.slice(1)) {
				if (bodyMode) {
					// Keep body verbatim; SQL prefixes field lines with 3 spaces, not body text.
					bodyLines.push(rawLine.replace(/^ {0,3}/, ""));
					continue;
				}
				const trimmed = rawLine.trim();
				if (!trimmed) continue;
				const kv = trimmed.match(
					/^(title|entity|email|linkedin|email_subject|email_body):\s*(.*)$/i,
				);
				if (!kv) continue;
				const key = (kv[1] ?? "").toLowerCase();
				const val = kv[2] ?? "";
				if (!key) continue;
				if (key === "email_body") {
					bodyMode = true;
					if (val) bodyLines.push(val);
				} else {
					fields[key] = val;
				}
			}
			const entityRaw = fields.entity ?? "";
			const entityLevelMatch = entityRaw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
			const personMissing =
				!personName || /^\[missing person\]$/i.test(personName);
			const decision =
				/decision/i.test(gateRoleType ?? "") || /decision/i.test(gateRole);
			const emailBody = bodyLines.length
				? bodyLines.join("\n").replace(/\s+$/, "")
				: null;
			out.push({
				stakeholder_id: null,
				gate_role: gateRole || null,
				gate_role_type: gateRoleType,
				person_name: personMissing ? null : personName,
				job_title: fields.title ?? null,
				entity_name: entityLevelMatch?.[1]
					? entityLevelMatch[1].trim()
					: entityRaw || null,
				entity_level: entityLevelMatch?.[2] ? entityLevelMatch[2].trim() : null,
				email: fields.email ?? null,
				linkedin_url: fields.linkedin ?? null,
				selection_rationale: null,
				person_missing: personMissing,
				decision_maker_flag: decision,
				message_available: Boolean(emailBody || fields.email_subject),
				email_subject: fields.email_subject ?? null,
				email_body: emailBody,
			});
		}

		if (reval) {
			const revalBlocks = reval
				.split(/\n\n+/)
				.map((b) => b.trim())
				.filter(Boolean);
			revalBlocks.forEach((block, i) => {
				const target = out[i];
				if (!target) return;
				const idMatch = block.match(/stakeholder_id=(\d+)/i);
				const ratMatch = block.match(/rationale:\s*([\s\S]*)$/i);
				const id = idMatch?.[1];
				if (!id) return;
				target.stakeholder_id = id;
				const rationaleText = ratMatch?.[1]?.trim();
				if (rationaleText && !/^\[not available\]$/i.test(rationaleText)) {
					target.selection_rationale = rationaleText;
				} else {
					target.selection_rationale = rationaleById.get(id) ?? null;
				}
			});
		}

		return out;
	} catch {
		bumpWarning(warnings, "stakeholders");
		return [];
	}
}

export type ParsedEvidence = {
	seed_id: string | null;
	signal_definition_id: string | null;
	signal_name: string | null;
	confirmation_id: string | null;
	publisher: string | null;
	source_title: string | null;
	published_date: string | null;
	source_url: string | null;
	source_confidence: number | null;
	applicability_confidence: number | null;
	normalized_claim: string | null;
	why_it_confirms: string | null;
	why_it_applies: string | null;
};

/**
 * Parse Account Signals - Signal Confirmations multiline summaries.
 */
export function parseMultilineEvidence(
	summary: unknown,
	defaultSeedId: unknown,
	warnings: ParseWarningBucket,
): ParsedEvidence[] {
	const text = asString(summary)?.trim();
	if (!text) return [];
	try {
		const blocks = text
			.split(/\n\n+/)
			.map((b) => b.trim())
			.filter(Boolean);
		const out: ParsedEvidence[] = [];
		const seedDefault = asString(defaultSeedId);

		for (const block of blocks) {
			const lines = block
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean);
			const header = lines[0];
			if (!header) continue;
			const sigId = header.match(/signal_definition_id=(\d+)/i)?.[1] ?? null;
			const confId = header.match(/signal_confirmation_id=(\d+)/i)?.[1] ?? null;
			const nameMatch = header.match(
				/signal_confirmation_id=\d+\s*\|\s*(.+)$/i,
			);
			const signalName = nameMatch?.[1]?.trim() || null;

			const metaLine = lines[1] ?? "";
			const metaParts = metaLine.split(" | ").map((p) => p.trim());
			const publisher =
				metaParts[0] && metaParts[0] !== "[unknown publisher]"
					? metaParts[0]
					: null;
			const published_date =
				metaParts[1] && metaParts[1] !== "undated" ? metaParts[1] : null;
			const source_confidence = asNumber(
				metaParts.find((p) => /source_confidence=/i.test(p))?.split("=")[1],
			);
			const applicability_confidence = asNumber(
				metaParts
					.find((p) => /applicability_confidence=/i.test(p))
					?.split("=")[1],
			);

			let source_title: string | null = null;
			let source_url: string | null = null;
			let normalized_claim: string | null = null;
			let why_it_confirms: string | null = null;
			let why_it_applies: string | null = null;

			for (const line of lines.slice(2)) {
				if (/^https?:\/\//i.test(line)) {
					source_url = line;
				} else if (/^claim:\s*/i.test(line)) {
					normalized_claim = line.replace(/^claim:\s*/i, "");
				} else if (/^why_it_confirms:\s*/i.test(line)) {
					why_it_confirms = line.replace(/^why_it_confirms:\s*/i, "");
				} else if (/^why_it_applies:\s*/i.test(line)) {
					why_it_applies = line.replace(/^why_it_applies:\s*/i, "");
				} else if (!source_title && line !== "[untitled source]") {
					source_title = line;
				}
			}

			out.push({
				seed_id: seedDefault,
				signal_definition_id: sigId,
				signal_name: signalName,
				confirmation_id: confId,
				publisher,
				source_title,
				published_date,
				source_url,
				source_confidence,
				applicability_confidence,
				normalized_claim,
				why_it_confirms,
				why_it_applies,
			});
		}
		return out;
	} catch {
		bumpWarning(warnings, "evidence");
		return [];
	}
}

export type ParsedCompetitive = {
	vendor: string | null;
	vendor_role: string | null;
	evidence_strength: string | null;
	source_title: string | null;
	source_url: string | null;
	evidence_summary: string | null;
};

export function parseCompetitiveAwareness(
	vendorsSummary: unknown,
	sourcesSummary: unknown,
	warnings: ParseWarningBucket,
): ParsedCompetitive[] {
	const out: ParsedCompetitive[] = [];
	try {
		const vendorsText = asString(vendorsSummary)?.trim();
		const sourcesText = asString(sourcesSummary)?.trim();

		const vendors: ParsedCompetitive[] = [];
		if (vendorsText) {
			for (const line of vendorsText
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean)) {
				const parts = line.split(" | ").map((p) => p.trim());
				vendors.push({
					vendor: parts[0] || null,
					vendor_role: parts[1] || null,
					evidence_strength: parts[2] || null,
					source_title: null,
					source_url: null,
					evidence_summary: null,
				});
			}
		}

		const sources: Array<{
			source_title: string | null;
			source_url: string | null;
			evidence_summary: string | null;
		}> = [];
		if (sourcesText) {
			const blocks = sourcesText
				.split(/\n(?=\d{2}\s*\|)/)
				.map((b) => b.trim())
				.filter(Boolean);
			for (const block of blocks) {
				const lines = block
					.split("\n")
					.map((l) => l.trim())
					.filter(Boolean);
				const titleLine = lines[0]?.replace(/^\d+\s*\|\s*/, "") ?? null;
				let source_url: string | null = null;
				let evidence_summary: string | null = null;
				for (const line of lines.slice(1)) {
					if (/^https?:\/\//i.test(line)) source_url = line;
					else if (/^evidence:\s*/i.test(line)) {
						evidence_summary = line.replace(/^evidence:\s*/i, "");
					}
				}
				sources.push({
					source_title: titleLine === "[untitled source]" ? null : titleLine,
					source_url,
					evidence_summary,
				});
			}
		}

		if (vendors.length === 0 && sources.length === 0) return [];

		if (vendors.length === 0) {
			return sources.map((s) => ({
				vendor: null,
				vendor_role: null,
				evidence_strength: null,
				...s,
			}));
		}

		// Pair vendors with sources by index when both exist; otherwise emit vendors alone
		const max = Math.max(vendors.length, sources.length);
		for (let i = 0; i < max; i++) {
			const v = vendors[i] ?? {
				vendor: null,
				vendor_role: null,
				evidence_strength: null,
				source_title: null,
				source_url: null,
				evidence_summary: null,
			};
			const s = sources[i];
			out.push({
				...v,
				source_title: s?.source_title ?? v.source_title,
				source_url: s?.source_url ?? v.source_url,
				evidence_summary: s?.evidence_summary ?? v.evidence_summary,
			});
		}
		return out;
	} catch {
		bumpWarning(warnings, "competitive");
		return [];
	}
}

export function countNonEmptyLines(value: unknown): number {
	const text = asString(value)?.trim();
	if (!text) return 0;
	return text
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean).length;
}

export function priorityLabel(score: unknown): string | null {
	const n = asNumber(score);
	if (n === null) return null;
	const normalized = n > 1 ? n / 100 : n;
	if (normalized >= 0.8) return "High";
	if (normalized >= 0.5) return "Medium";
	return "Low";
}

export function humanReviewRequired(row: RawRow): boolean {
	const warnings = asNumber(getField(row, "qa_grounding_warning_count")) ?? 0;
	const unsupported =
		asNumber(getField(row, "qa_grounding_unsupported_claim_count")) ?? 0;
	const statuses = [
		getField(row, "qa_grounding_status"),
		getField(row, "qa_traceability_status"),
		getField(row, "qa_company_binding_status"),
		getField(row, "qa_customer_relevance_status"),
		getField(row, "qa_commercial_logic_status"),
	]
		.map((v) => asString(v)?.toLowerCase() ?? "")
		.filter(Boolean);

	const bad = statuses.some((s) =>
		/(fail|failed|unsupported|reject|weak|review|partial|warning)/i.test(s),
	);
	const action =
		asString(getField(row, "qa_grounding_recommended_action"))?.toLowerCase() ??
		"";
	return (
		warnings > 0 || unsupported > 0 || bad || /review|human|manual/.test(action)
	);
}

export function recommendedAction(row: RawRow): string | null {
	return (
		asString(getField(row, "qa_grounding_recommended_action")) ||
		(humanReviewRequired(row)
			? "Human review recommended"
			: "No action required")
	);
}

export function warningCount(row: RawRow): number {
	return (
		(asNumber(getField(row, "qa_grounding_warning_count")) ?? 0) +
		countNonEmptyLines(getField(row, "qa_traceability_warnings")) +
		countNonEmptyLines(getField(row, "qa_company_binding_warnings")) +
		countNonEmptyLines(getField(row, "qa_customer_relevance_warnings")) +
		countNonEmptyLines(getField(row, "qa_commercial_logic_warnings"))
	);
}

type MeddpiccSource = {
	url?: string;
	host?: string;
	claimQuote?: string;
	sourceName?: string;
	effectiveClaimDate?: string;
};

type MeddpiccSection = {
	summary?: string;
	sources?: MeddpiccSource[];
};

export type ParsedMeddpiccSection = {
	summary: string | null;
	sources: string | null;
};

function unwrapJsonValue(value: unknown): unknown {
	if (value === null || value === undefined) return null;
	if (typeof value === "object") return value;
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]")) ||
		(trimmed.startsWith('"') && trimmed.endsWith('"'))
	) {
		try {
			return JSON.parse(trimmed);
		} catch {
			return value;
		}
	}
	return value;
}

function asMeddpiccSource(value: unknown): MeddpiccSource | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const src = value as Record<string, unknown>;
	return {
		url: asString(src.url) ?? undefined,
		host: asString(src.host) ?? undefined,
		claimQuote: asString(src.claimQuote) ?? undefined,
		sourceName: asString(src.sourceName) ?? undefined,
		effectiveClaimDate: asString(src.effectiveClaimDate) ?? undefined,
	};
}

/** Formats MEDDPICC source objects as numbered multiline blocks for Excel. */
export function formatMeddpiccSources(sources: unknown): string | null {
	if (!Array.isArray(sources) || sources.length === 0) return null;

	const blocks: string[] = [];
	for (let i = 0; i < sources.length; i++) {
		const src = asMeddpiccSource(sources[i]);
		if (!src) continue;

		const idx = String(i + 1).padStart(2, "0");
		const labelParts = [
			src.sourceName,
			src.host ? `(${src.host})` : null,
		].filter(Boolean);
		const header =
			labelParts.length > 0 ? labelParts.join(" ") : `Source ${idx}`;
		const lines = [`${idx} | ${header}`];
		if (src.url) lines.push(`   URL: ${src.url}`);
		if (src.claimQuote) lines.push(`   Quote: ${src.claimQuote}`);
		if (src.effectiveClaimDate)
			lines.push(`   Date: ${src.effectiveClaimDate}`);
		blocks.push(lines.join("\n"));
	}

	return blocks.length > 0 ? blocks.join("\n\n") : null;
}

export type ParsedNextBestAction = {
	sequence: number | null;
	due: string | null;
	who: string | null;
	action: string | null;
	rationale: string | null;
	tool_suggested: string | null;
};

/** Parses nextBestActions value_json (array of action items) into export rows, ordered by sequence. */
export function parseNextBestActions(value: unknown): ParsedNextBestAction[] {
	const parsed = unwrapJsonValue(value);
	if (!Array.isArray(parsed)) return [];

	const out: ParsedNextBestAction[] = [];
	for (const item of parsed) {
		if (!item || typeof item !== "object" || Array.isArray(item)) continue;
		const obj = item as Record<string, unknown>;
		out.push({
			sequence: asNumber(obj.sequence),
			due: asString(obj.due),
			who: asString(obj.who),
			action: asString(obj.action),
			rationale: asString(obj.rationale),
			tool_suggested: asString(obj.toolSuggested),
		});
	}
	return out.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

/** Parses meddpicc value_json into summary + formatted sources per section key. */
export function parseMeddpiccValue(
	value: unknown,
): Record<string, ParsedMeddpiccSection> | null {
	const parsed = unwrapJsonValue(value);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
		return null;

	const root = parsed as Record<string, unknown>;
	const out: Record<string, ParsedMeddpiccSection> = {};

	for (const [key, rawSection] of Object.entries(root)) {
		if (
			!rawSection ||
			typeof rawSection !== "object" ||
			Array.isArray(rawSection)
		) {
			continue;
		}
		const section = rawSection as MeddpiccSection;
		const summary = asString(section.summary)?.trim() || null;
		const sources = formatMeddpiccSources(section.sources);
		if (!summary && !sources) continue;
		out[key] = { summary, sources };
	}

	return Object.keys(out).length > 0 ? out : null;
}

function formatStringList(values: unknown): string | null {
	if (!Array.isArray(values)) return null;
	const lines = values
		.map((v) => asString(v)?.trim())
		.filter((v): v is string => Boolean(v))
		.map((v, i) => `${String(i + 1).padStart(2, "0")} | ${v}`);
	return lines.length > 0 ? lines.join("\n") : null;
}

type IncumbentEvidenceItem = {
	host?: string;
	sourceUrl?: string;
	claimQuote?: string;
};

/** Formats incumbentEvidence objects ({host, sourceUrl, claimQuote}) as numbered multiline blocks. */
function formatIncumbentEvidence(values: unknown): string | null {
	if (!Array.isArray(values) || values.length === 0) return null;

	const blocks: string[] = [];
	for (let i = 0; i < values.length; i++) {
		const item = values[i];
		if (!item || typeof item !== "object" || Array.isArray(item)) continue;
		const src = item as IncumbentEvidenceItem;
		const host = asString(src.host);
		const url = asString(src.sourceUrl);
		const quote = asString(src.claimQuote);

		const idx = String(i + 1).padStart(2, "0");
		const lines = [`${idx} | ${host ?? "Source"}`];
		if (url) lines.push(`   URL: ${url}`);
		if (quote) lines.push(`   Quote: ${quote}`);
		blocks.push(lines.join("\n"));
	}

	return blocks.length > 0 ? blocks.join("\n\n") : null;
}

export type ParsedCompetitiveAnalysis = {
	narrative: string | null;
	tenant_counter: string | null;
	incumbent_vendor: string | null;
	incumbent_strength: string | null;
	switching_friction: string | null;
	win_themes: string | null;
	incumbents: string | null;
	sources: string | null;
	incumbent_evidence: string | null;
};

/** Parses competitiveAnalysis value_json into flat text/multiline fields for export. */
export function parseCompetitiveAnalysisValue(
	value: unknown,
): ParsedCompetitiveAnalysis | null {
	const parsed = unwrapJsonValue(value);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
		return null;

	const obj = parsed as Record<string, unknown>;
	return {
		narrative: asString(obj.narrative)?.trim() || null,
		tenant_counter: asString(obj.tenantCounter)?.trim() || null,
		incumbent_vendor: asString(obj.incumbentVendor)?.trim() || null,
		incumbent_strength: asString(obj.incumbentStrength)?.trim() || null,
		switching_friction: asString(obj.switchingFriction)?.trim() || null,
		win_themes: formatStringList(obj.winThemes),
		incumbents: formatStringList(obj.incumbents),
		sources: formatMeddpiccSources(obj.sources),
		incumbent_evidence: formatIncumbentEvidence(obj.incumbentEvidence),
	};
}

/** Formats a list of strings or objects (portfolio items) as a numbered multiline block. */
function formatPortfolioList(values: unknown): string | null {
	if (!Array.isArray(values) || values.length === 0) return null;

	const lines = values
		.map((v) => {
			if (v && typeof v === "object" && !Array.isArray(v)) {
				const obj = v as Record<string, unknown>;
				return (
					asString(obj.name ?? obj.title ?? obj.product ?? obj.label) ??
					asString(v)
				);
			}
			return asString(v);
		})
		.map((v) => v?.trim())
		.filter((v): v is string => Boolean(v))
		.map((v, i) => `${String(i + 1).padStart(2, "0")} | ${v}`);

	return lines.length > 0 ? lines.join("\n") : null;
}

export type ParsedWhatToOffer = {
	offering: string | null;
	offering_description: string | null;
	approach: string | null;
	business_outcome: string | null;
	supporting_portfolio: string | null;
};

/** Parses whatToOffer value_json into flat text/multiline fields for export. */
export function parseWhatToOfferValue(
	value: unknown,
): ParsedWhatToOffer | null {
	const parsed = unwrapJsonValue(value);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
		return null;

	const obj = parsed as Record<string, unknown>;
	return {
		offering: asString(obj.offering)?.trim() || null,
		offering_description: asString(obj.offeringDescription)?.trim() || null,
		approach: asString(obj.approach)?.trim() || null,
		business_outcome: asString(obj.businessOutcome)?.trim() || null,
		supporting_portfolio: formatPortfolioList(obj.supportingPortfolio),
	};
}

type WhyNowSource = {
	url?: string;
	label?: string;
	dateRetrieved?: string;
	claimSupported?: string;
};

/** Formats whyNow source objects ({url, label, dateRetrieved, claimSupported}) as numbered multiline blocks. */
function formatWhyNowSources(sources: unknown): string | null {
	if (!Array.isArray(sources) || sources.length === 0) return null;

	const blocks: string[] = [];
	for (let i = 0; i < sources.length; i++) {
		const item = sources[i];
		if (!item || typeof item !== "object" || Array.isArray(item)) continue;
		const src = item as WhyNowSource;
		const url = asString(src.url);
		const label = asString(src.label);
		const dateRetrieved = asString(src.dateRetrieved);
		const claimSupported = asString(src.claimSupported);

		const idx = String(i + 1).padStart(2, "0");
		const lines = [`${idx} | ${label ?? "Source"}`];
		if (url) lines.push(`   URL: ${url}`);
		if (claimSupported) lines.push(`   Claim: ${claimSupported}`);
		if (dateRetrieved) lines.push(`   Retrieved: ${dateRetrieved}`);
		blocks.push(lines.join("\n"));
	}

	return blocks.length > 0 ? blocks.join("\n\n") : null;
}

export type ParsedWhyNow = {
	narrative: string | null;
	confidence: number | null;
	sources: string | null;
};

/** Parses whyNow value_json into flat text/multiline fields for export. */
export function parseWhyNowValue(value: unknown): ParsedWhyNow | null {
	const parsed = unwrapJsonValue(value);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
		return null;

	const obj = parsed as Record<string, unknown>;
	return {
		narrative: asString(obj.narrative)?.trim() || null,
		confidence: asNumber(obj.confidence),
		sources: formatWhyNowSources(obj.sources),
	};
}

export type ParsedProofPoint = {
	sequence: number;
	claim: string | null;
	evidence: string | null;
	source_url: string | null;
	applicability: string | null;
	verbatim_support: string | null;
};

/** Parses proofPoints value_json (array of claim/evidence/source items) into export rows, in order. */
export function parseProofPoints(value: unknown): ParsedProofPoint[] {
	const parsed = unwrapJsonValue(value);
	if (!Array.isArray(parsed)) return [];

	const out: ParsedProofPoint[] = [];
	for (const item of parsed) {
		if (!item || typeof item !== "object" || Array.isArray(item)) continue;
		const obj = item as Record<string, unknown>;
		out.push({
			sequence: out.length + 1,
			claim: asString(obj.claim)?.trim() || null,
			evidence: asString(obj.evidence)?.trim() || null,
			source_url: asString(obj.sourceUrl)?.trim() || null,
			applicability: asString(obj.applicability)?.trim() || null,
			verbatim_support: asString(obj.verbatimSupport)?.trim() || null,
		});
	}
	return out;
}

export type ParsedDiscoveryQuestion = {
	sequence: number;
	layer: string | null;
	question: string | null;
	rationale: string | null;
};

/** Parses discoveryQuestions value_json (array of {layer, question, rationale}) into export rows, in order. */
export function parseDiscoveryQuestions(
	value: unknown,
): ParsedDiscoveryQuestion[] {
	const parsed = unwrapJsonValue(value);
	if (!Array.isArray(parsed)) return [];

	const out: ParsedDiscoveryQuestion[] = [];
	for (const item of parsed) {
		if (!item || typeof item !== "object" || Array.isArray(item)) continue;
		const obj = item as Record<string, unknown>;
		out.push({
			sequence: out.length + 1,
			layer: asString(obj.layer)?.trim() || null,
			question: asString(obj.question)?.trim() || null,
			rationale: asString(obj.rationale)?.trim() || null,
		});
	}
	return out;
}
