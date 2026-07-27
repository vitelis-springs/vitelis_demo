/**
 * @jest-environment node
 *
 * Unit tests for report-level bulk status update and preset create/apply.
 * The repository is spied so we assert validation, normalization, and
 * replace-only/inactive behavior without a database.
 */
jest.mock("../../../src/lib/prisma", () => ({ __esModule: true, default: {} }));

import { ReportStepsRepository } from "../../../src/app/server/modules/report-steps/report-steps.repository";
import { ReportStepsService } from "../../../src/app/server/modules/report-steps/report-steps.service";
import { report_status_enum } from "../../../src/generated/prisma";

function mockRepo<K extends keyof typeof ReportStepsRepository>(
	method: K,
	value: unknown,
) {
	return jest
		.spyOn(ReportStepsRepository, method as never)
		.mockResolvedValue(value as never);
}

beforeEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

describe("bulkUpdateReportStepStatuses", () => {
	function salesMiner() {
		mockRepo("getReportTypeById", { id: 5, report_type: "sales_miner" });
	}
	const cells = (pairs: Array<[number, number]>) =>
		pairs.map(([companyId, stepId]) => ({ companyId, stepId }));

	it("upserts the exact selected cells in one atomic call when valid", async () => {
		salesMiner();
		mockRepo("getReportCompanyIds", [1, 2, 3]);
		mockRepo("getConfiguredStepIds", [10, 20]);
		const upsert = mockRepo("bulkUpsertStatusCells", 3);
		const payload = cells([
			[1, 10],
			[2, 20],
			[3, 10],
		]);

		const result = await ReportStepsService.bulkUpdateReportStepStatuses(
			5,
			payload,
			report_status_enum.DONE,
		);

		expect(result).toMatchObject({ success: true, data: { updated: 3 } });
		expect(upsert).toHaveBeenCalledTimes(1);
		expect(upsert).toHaveBeenCalledWith(5, payload, "DONE");
	});

	it("rejects a non-sales_miner report", async () => {
		mockRepo("getReportTypeById", { id: 5, report_type: "biz_miner" });
		const result = await ReportStepsService.bulkUpdateReportStepStatuses(
			5,
			cells([[1, 10]]),
			report_status_enum.DONE,
		);
		expect(result).toMatchObject({ success: false, status: 400 });
	});

	it("returns 404 when the report does not exist", async () => {
		mockRepo("getReportTypeById", null);
		const result = await ReportStepsService.bulkUpdateReportStepStatuses(
			5,
			cells([[1, 10]]),
			report_status_enum.DONE,
		);
		expect(result).toMatchObject({ success: false, status: 404 });
	});

	it("rejects an empty selection", async () => {
		salesMiner();
		const result = await ReportStepsService.bulkUpdateReportStepStatuses(
			5,
			[],
			report_status_enum.DONE,
		);
		expect(result).toMatchObject({ success: false, status: 400 });
	});

	it("rejects a cell whose company is not in the report", async () => {
		salesMiner();
		mockRepo("getReportCompanyIds", [1, 2]);
		mockRepo("getConfiguredStepIds", [10]);
		const upsert = mockRepo("bulkUpsertStatusCells", 0);
		const result = await ReportStepsService.bulkUpdateReportStepStatuses(
			5,
			cells([
				[1, 10],
				[99, 10],
			]),
			report_status_enum.DONE,
		);
		expect(result).toMatchObject({ success: false, status: 400 });
		expect(upsert).not.toHaveBeenCalled();
	});

	it("rejects a cell whose step is not configured", async () => {
		salesMiner();
		mockRepo("getReportCompanyIds", [1]);
		mockRepo("getConfiguredStepIds", [10, 20]);
		const upsert = mockRepo("bulkUpsertStatusCells", 0);
		const result = await ReportStepsService.bulkUpdateReportStepStatuses(
			5,
			cells([
				[1, 10],
				[1, 77],
			]),
			report_status_enum.DONE,
		);
		expect(result).toMatchObject({ success: false, status: 400 });
		expect(upsert).not.toHaveBeenCalled();
	});
});

describe("createPresetFromReport", () => {
	it("snapshots all steps and normalizes duplicate orders", async () => {
		mockRepo("getReportTypeById", { id: 7, report_type: "sales_miner" });
		mockRepo("getStepsByReportId", [
			{ step_id: 30, step_order: 2 },
			{ step_id: 10, step_order: 2 },
			{ step_id: 20, step_order: 1 },
		]);
		const create = mockRepo("createStepTemplate", {
			id: 100,
			code: "report-7-abc",
			name: "Snapshot",
			report_step_template_steps: [{}, {}, {}],
		});

		const result = await ReportStepsService.createPresetFromReport(7, {
			name: "Snapshot",
		});

		expect(result.success).toBe(true);
		const passed = create.mock.calls[0]?.[0] as unknown as {
			steps: Array<{ step_id: number; step_order: number }>;
		};
		expect(passed.steps).toEqual([
			{ step_id: 20, step_order: 1 },
			{ step_id: 10, step_order: 2 },
			{ step_id: 30, step_order: 3 },
		]);
	});
});

describe("applyPreset", () => {
	function template(overrides: Record<string, unknown> = {}) {
		return {
			id: 100,
			is_active: true,
			report_step_template_steps: [
				{ step_id: 20, step_order: 2, is_active: true },
				{ step_id: 10, step_order: 1, is_active: true },
			],
			...overrides,
		};
	}

	it("replaces report steps from the preset's active steps, normalized", async () => {
		mockRepo("getReportTypeById", { id: 9, report_type: "sales_miner" });
		mockRepo("getStepTemplateById", template());
		const replace = mockRepo("replaceReportSteps", [
			{
				step_id: 10,
				step_order: 1,
				report_generation_steps: {
					name: "Collect",
					url: "/c",
					dependency: null,
					settings: null,
				},
			},
			{
				step_id: 20,
				step_order: 2,
				report_generation_steps: {
					name: "Score",
					url: "/s",
					dependency: null,
					settings: null,
				},
			},
		]);

		const result = await ReportStepsService.applyPreset("100", 9);

		expect(result.success).toBe(true);
		expect(replace).toHaveBeenCalledWith(9, [
			{ step_id: 10, step_order: 1 },
			{ step_id: 20, step_order: 2 },
		]);
	});

	it("blocks applying an inactive preset", async () => {
		mockRepo("getReportTypeById", { id: 9, report_type: "sales_miner" });
		mockRepo("getStepTemplateById", template({ is_active: false }));
		const replace = mockRepo("replaceReportSteps", []);

		const result = await ReportStepsService.applyPreset("100", 9);

		expect(result).toMatchObject({ success: false, status: 400 });
		expect(replace).not.toHaveBeenCalled();
	});

	it("returns 404 when the preset is missing", async () => {
		mockRepo("getReportTypeById", { id: 9, report_type: "sales_miner" });
		mockRepo("getStepTemplateById", null);
		const result = await ReportStepsService.applyPreset("100", 9);
		expect(result).toMatchObject({ success: false, status: 404 });
	});
});
