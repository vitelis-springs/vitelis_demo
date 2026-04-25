import type {
	ValidationCompanyItem,
	ValidationRuleCriteria,
	ValidationRulePayload,
	ValidationStatus,
} from "./validation.types";

const STATUS_ORDER: Record<string, number> = {
	failed: 0,
	warn: 1,
	pass: 2,
};

export function parseValidationStatus(
	value: string | null,
): ValidationStatus | undefined {
	return value === "pass" || value === "warn" || value === "failed"
		? value
		: undefined;
}

export function toDataRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

export function getString(
	record: Record<string, unknown>,
	key: string,
): string {
	const value = record[key];
	return typeof value === "string" ? value : "";
}

export function parseValidationCriteria(raw: unknown): ValidationRuleCriteria {
	const criteria =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as { pass?: unknown; warn?: unknown; fail?: unknown })
			: {};

	return {
		pass: typeof criteria.pass === "string" ? criteria.pass : "",
		warn: typeof criteria.warn === "string" ? criteria.warn : "",
		fail: typeof criteria.fail === "string" ? criteria.fail : "",
	};
}

export function parseValidationRulePayload(
	body: Record<string, unknown>,
): ValidationRulePayload | { error: string } {
	const name = typeof body.name === "string" ? body.name.trim() : "";
	if (!name) return { error: "Name is required" };

	const level = typeof body.level === "string" ? body.level : "";
	if (level !== "driver" && level !== "category") {
		return { error: "Level must be driver or category" };
	}

	return {
		name,
		label:
			typeof body.label === "string" && body.label.trim()
				? body.label.trim()
				: null,
		level,
		enabled: body.enabled !== false,
		description:
			typeof body.description === "string" && body.description.trim()
				? body.description.trim()
				: null,
		criteria: parseValidationCriteria(body.criteria),
	};
}

export function sortValidationCompanyItems(
	items: ValidationCompanyItem[],
): ValidationCompanyItem[] {
	return [...items].sort(
		(a, b) =>
			(STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) ||
			a.ruleName.localeCompare(b.ruleName) ||
			a.driverName.localeCompare(b.driverName),
	);
}
