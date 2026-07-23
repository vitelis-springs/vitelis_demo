import type { OpportunityNarrativeField } from "../../../types/deep-dive.types";

export function editKey(field: OpportunityNarrativeField): string {
	return `${field.source}:${field.field}`;
}
