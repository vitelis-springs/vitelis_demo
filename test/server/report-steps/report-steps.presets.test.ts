/**
 * @jest-environment node
 */
import { normalizePresetSteps } from "../../../src/app/server/modules/report-steps/report-steps.presets";

describe("normalizePresetSteps", () => {
	it("renumbers to a clean 1..N sequence while keeping every step", () => {
		const result = normalizePresetSteps([
			{ step_id: 30, step_order: 5 },
			{ step_id: 10, step_order: 1 },
			{ step_id: 20, step_order: 3 },
		]);
		expect(result).toEqual([
			{ step_id: 10, step_order: 1 },
			{ step_id: 20, step_order: 2 },
			{ step_id: 30, step_order: 3 },
		]);
	});

	it("breaks duplicate orders by step_id and normalizes to unique 1..N", () => {
		// report_steps has no unique (report_id, step_order), so dupes are legal.
		const source = [
			{ step_id: 40, step_order: 2 },
			{ step_id: 15, step_order: 2 },
			{ step_id: 99, step_order: 2 },
		];
		const result = normalizePresetSteps(source);
		expect(result).toEqual([
			{ step_id: 15, step_order: 1 },
			{ step_id: 40, step_order: 2 },
			{ step_id: 99, step_order: 3 },
		]);
		expect(result).toHaveLength(source.length);
		expect(new Set(result.map((s) => s.step_order)).size).toBe(source.length);
	});

	it("does not mutate the input array", () => {
		const source = [
			{ step_id: 2, step_order: 2 },
			{ step_id: 1, step_order: 1 },
		];
		const copy = [...source];
		normalizePresetSteps(source);
		expect(source).toEqual(copy);
	});
});
