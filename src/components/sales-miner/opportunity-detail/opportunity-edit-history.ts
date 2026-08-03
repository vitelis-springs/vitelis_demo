import type {
	OpportunityNarrativeField,
	OpportunityNarrativeFieldSource,
} from "../../../types/deep-dive.types";

const STORAGE_PREFIX = "opportunity-review-history";
const STORE_VERSION = 1;

export interface OpportunityEditHistoryScope {
	reportId: number;
	companyId: number;
	opportunityId: string;
}

export interface OpportunityFieldChange {
	id: string;
	savedAt: string;
	previousValue: string;
	nextValue: string;
	action: "save" | "restore";
}

export interface OpportunityFieldHistory {
	source: OpportunityNarrativeFieldSource;
	field: string;
	label: string;
	originalValue: string;
	changes: OpportunityFieldChange[];
}

interface OpportunityEditHistoryStore {
	version: typeof STORE_VERSION;
	fields: Record<string, OpportunityFieldHistory>;
}

interface RecordChangeOptions {
	action?: OpportunityFieldChange["action"];
}

export function getOpportunityEditHistoryStorageKey(
	scope: OpportunityEditHistoryScope,
) {
	return `${STORAGE_PREFIX}:${scope.reportId}:${scope.companyId}:${scope.opportunityId}`;
}

export function getOpportunityEditHistoryFieldKey(
	field: Pick<OpportunityNarrativeField, "source" | "field">,
) {
	return `${field.source}:${field.field}`;
}

function getStorage(): Storage | null {
	if (typeof window === "undefined") return null;
	return window.sessionStorage;
}

function emptyStore(): OpportunityEditHistoryStore {
	return {
		version: STORE_VERSION,
		fields: {},
	};
}

function readStore(scope: OpportunityEditHistoryScope) {
	const storage = getStorage();
	if (!storage) return emptyStore();

	const raw = storage.getItem(getOpportunityEditHistoryStorageKey(scope));
	if (!raw) return emptyStore();

	try {
		const parsed = JSON.parse(raw) as Partial<OpportunityEditHistoryStore>;
		if (parsed.version !== STORE_VERSION || !parsed.fields) {
			return emptyStore();
		}
		return parsed as OpportunityEditHistoryStore;
	} catch {
		return emptyStore();
	}
}

function writeStore(
	scope: OpportunityEditHistoryScope,
	store: OpportunityEditHistoryStore,
) {
	const storage = getStorage();
	if (!storage) return;
	storage.setItem(
		getOpportunityEditHistoryStorageKey(scope),
		JSON.stringify(store),
	);
}

function createChangeId(fieldKey: string, savedAt: string) {
	return `${fieldKey}:${savedAt}:${Math.random().toString(36).slice(2, 10)}`;
}

export function getOpportunityFieldHistory(
	scope: OpportunityEditHistoryScope,
	field: Pick<OpportunityNarrativeField, "source" | "field">,
): OpportunityFieldHistory | null {
	const store = readStore(scope);
	return store.fields[getOpportunityEditHistoryFieldKey(field)] ?? null;
}

export function recordOpportunityFieldChange(
	scope: OpportunityEditHistoryScope,
	field: OpportunityNarrativeField,
	previousValue: string,
	nextValue: string,
	options: RecordChangeOptions = {},
) {
	const store = readStore(scope);
	const fieldKey = getOpportunityEditHistoryFieldKey(field);
	const savedAt = new Date().toISOString();
	const existing = store.fields[fieldKey];

	const history: OpportunityFieldHistory = existing ?? {
		source: field.source,
		field: field.field,
		label: field.label,
		originalValue: previousValue,
		changes: [],
	};

	history.label = field.label;
	history.changes = [
		...history.changes,
		{
			id: createChangeId(fieldKey, savedAt),
			savedAt,
			previousValue,
			nextValue,
			action: options.action ?? "save",
		},
	];

	store.fields[fieldKey] = history;
	writeStore(scope, store);

	return history;
}
