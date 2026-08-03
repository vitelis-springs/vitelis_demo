import {
	getOpportunityEditHistoryFieldKey,
	getOpportunityEditHistoryStorageKey,
	getOpportunityFieldHistory,
	recordOpportunityFieldChange,
} from "../../../src/components/sales-miner/opportunity-detail/opportunity-edit-history";
import type { OpportunityNarrativeField } from "../../../src/types/deep-dive.types";

const scope = {
	reportId: 172,
	companyId: 2916,
	opportunityId: "4439",
};

const field: OpportunityNarrativeField = {
	source: "deepDive",
	field: "whatToOffer.offering",
	label: "Offering",
	value: "Original offer",
};

describe("opportunity edit history", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		jest.useFakeTimers().setSystemTime(new Date("2026-07-31T10:00:00.000Z"));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("scopes history by opportunity", () => {
		expect(getOpportunityEditHistoryStorageKey(scope)).toBe(
			"opportunity-review-history:172:2916:4439",
		);
		expect(getOpportunityEditHistoryFieldKey(field)).toBe(
			"deepDive:whatToOffer.offering",
		);
	});

	it("records original value once and appends subsequent saved states", () => {
		recordOpportunityFieldChange(scope, field, "Original offer", "First edit");
		recordOpportunityFieldChange(scope, field, "First edit", "Second edit");

		const history = getOpportunityFieldHistory(scope, field);

		expect(history?.originalValue).toBe("Original offer");
		expect(history?.changes).toHaveLength(2);
		expect(history?.changes.map((change) => change.nextValue)).toEqual([
			"First edit",
			"Second edit",
		]);
		expect(history?.changes.map((change) => change.action)).toEqual([
			"save",
			"save",
		]);
	});

	it("records rollback as another history step", () => {
		recordOpportunityFieldChange(scope, field, "Original offer", "First edit");
		recordOpportunityFieldChange(scope, field, "First edit", "Original offer", {
			action: "restore",
		});

		const history = getOpportunityFieldHistory(scope, field);

		expect(history?.originalValue).toBe("Original offer");
		expect(history?.changes).toHaveLength(2);
		expect(history?.changes[1]).toMatchObject({
			previousValue: "First edit",
			nextValue: "Original offer",
			action: "restore",
		});
	});

	it("ignores corrupted sessionStorage data", () => {
		window.sessionStorage.setItem(
			getOpportunityEditHistoryStorageKey(scope),
			"{",
		);

		expect(getOpportunityFieldHistory(scope, field)).toBeNull();
	});
});
