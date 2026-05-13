import {
	VALIDATION_DATA_POINT_LEVELS,
	VALIDATION_RULE_LEVELS,
} from "../../../../../shared/deep-dive-contract.types";
import type {
	ValidationCompanyItem,
	ValidationDataPointLevel,
	ValidationManualUpdatePayload,
	ValidationRuleCriteria,
	ValidationRuleLevel,
	ValidationRulePayload,
	ValidationStatus,
} from "./validation.types";

const STATUS_ORDER: Record<string, number> = {
	failed: 0,
	warn: 1,
	pass: 2,
};

export function bigintToNumber(value: bigint): number {
	return Number(value);
}

function parseValidationRuleLevel(value: unknown): ValidationRuleLevel | null {
	return typeof value === "string" &&
		(VALIDATION_RULE_LEVELS as readonly string[]).includes(value)
		? (value as ValidationRuleLevel)
		: null;
}

function parseValidationDataPointLevel(
	value: unknown,
): ValidationDataPointLevel | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return (VALIDATION_DATA_POINT_LEVELS as readonly string[]).includes(trimmed)
		? (trimmed as ValidationDataPointLevel)
		: null;
}

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

	const level = parseValidationRuleLevel(body.level);
	if (!level) {
		return { error: "Level must be single or group" };
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
		data_point_level: parseValidationDataPointLevel(body.data_point_level),
	};
}

export function parseValidationManualUpdatePayload(
	body: Record<string, unknown>,
	resolvedBy: string,
): ValidationManualUpdatePayload | { error: string } {
	const status = parseValidationStatus(
		typeof body.status === "string" ? body.status : null,
	);
	if (!status) return { error: "status must be pass, warn, or failed" };

	const comment =
		typeof body.comment === "string" && body.comment.trim()
			? body.comment.trim()
			: null;

	return {
		status,
		comment,
		resolvedBy,
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
