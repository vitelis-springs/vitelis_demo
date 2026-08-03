/**
 * @jest-environment node
 */
import { deriveProgressSummary } from "../../../src/components/report-steps/steps-dashboard/progress";
import type { StepsMatrixResponse } from "../../../src/hooks/api/useReportStepsService";

type MatrixData = StepsMatrixResponse["data"];

const step = (id: number, order: number, name: string) => ({
	id,
	order,
	name,
	url: `/${name}`,
	dependency: null,
	settings: null,
});

function matrix(): MatrixData {
	return {
		companies: [
			{ id: 1, name: "Acme" },
			{ id: 2, name: "Globex" },
		],
		steps: [step(10, 1, "Collect"), step(20, 2, "Score")],
		matrix: [
			{
				companyId: 1,
				statuses: [
					{ stepId: 10, status: "DONE" },
					{ stepId: 20, status: "PROCESSING" },
				],
			},
			{
				companyId: 2,
				statuses: [
					{ stepId: 10, status: "DONE" },
					{ stepId: 20, status: "ERROR" },
				],
			},
		],
	};
}

describe("deriveProgressSummary", () => {
	it("rolls up global counts and completion from the matrix", () => {
		const s = deriveProgressSummary(matrix());
		expect(s.companyCount).toBe(2);
		expect(s.stepCount).toBe(2);
		expect(s.totalCells).toBe(4);
		expect(s.counts).toEqual({ DONE: 2, PROCESSING: 1, ERROR: 1, PENDING: 0 });
		expect(s.completionPercent).toBe(50); // 2 of 4 done
	});

	it("computes per-step completion independently", () => {
		const s = deriveProgressSummary(matrix());
		expect(s.perStep.find((p) => p.stepId === 10)?.completionPercent).toBe(100);
		expect(s.perStep.find((p) => p.stepId === 20)?.completionPercent).toBe(0);
	});

	it("returns an all-zero summary with no companies (no NaN)", () => {
		const s = deriveProgressSummary({
			companies: [],
			steps: [step(10, 1, "Collect")],
			matrix: [],
		});
		expect(s.totalCells).toBe(0);
		expect(s.completionPercent).toBe(0);
		expect(s.perStep[0]?.completionPercent).toBe(0);
	});
});
