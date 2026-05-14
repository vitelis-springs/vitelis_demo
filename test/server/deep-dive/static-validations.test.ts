/**
 * @jest-environment node
 */
jest.mock("../../../src/lib/prisma", () => ({
	__esModule: true,
	default: {},
}));

import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";
import { DeepDiveService } from "../../../src/app/server/modules/deep-dive/deep-dive.service";

const SAMPLE_REPORT = { id: 35 };

const SAMPLE_COMPANIES = [
	{
		company_id: 100,
		companies: {
			id: 100,
			name: "Acme",
			country_code: "US",
			url: "https://acme.com",
		},
	},
	{
		company_id: 200,
		companies: {
			id: 200,
			name: "Beta",
			country_code: "DE",
			url: "https://beta.de",
		},
	},
	{
		company_id: 300,
		companies: {
			id: 300,
			name: "Gamma",
			country_code: "FR",
			url: "https://gamma.fr",
		},
	},
];

const SAMPLE_KPI_RESULTS = [
	{
		company_id: 100,
		data_point_id: "kpi_category_execution",
		value: "3.0",
		data: { "KPI Category": "Execution", "KPI Score": "3.0" },
		data_points: {
			type: "kpi_category",
			name: "Execution",
			settings: { "KPI Category": "Execution" },
		},
	},
	{
		company_id: 100,
		data_point_id: "kpi_driver_a",
		value: "3 Medium",
		data: { "KPI Category": "Execution", Score: "3 Medium" },
		data_points: {
			type: "kpi_driver",
			name: "Driver A",
			settings: { "KPI Category": "Execution" },
		},
	},
	{
		company_id: 100,
		data_point_id: "kpi_driver_b",
		value: "3 Medium",
		data: { "KPI Category": "Execution", Score: "3 Medium" },
		data_points: {
			type: "kpi_driver",
			name: "Driver B",
			settings: { "KPI Category": "Execution" },
		},
	},
	{
		company_id: 200,
		data_point_id: "kpi_category_execution",
		value: "2.0",
		data: { "KPI Category": "Execution", "KPI Score": "2.0" },
		data_points: {
			type: "kpi_category",
			name: "Execution",
			settings: { "KPI Category": "Execution" },
		},
	},
	{
		company_id: 200,
		data_point_id: "kpi_driver_a",
		value: "4 Medium-High",
		data: { "KPI Category": "Execution", Score: "4 Medium-High" },
		data_points: {
			type: "kpi_driver",
			name: "Driver A",
			settings: { "KPI Category": "Execution" },
		},
	},
	{
		company_id: 300,
		data_point_id: "kpi_category_execution",
		value: "3.1",
		data: { "KPI Category": "Execution", "KPI Score": "3.1" },
		data_points: {
			type: "kpi_category",
			name: "Execution",
			settings: { "KPI Category": "Execution" },
		},
	},
	{
		company_id: 300,
		data_point_id: "kpi_driver_a",
		value: "3.05 Medium",
		data: { "KPI Category": "Execution", Score: "3.05 Medium" },
		data_points: {
			type: "kpi_driver",
			name: "Driver A",
			settings: { "KPI Category": "Execution" },
		},
	},
	{
		company_id: 300,
		data_point_id: "kpi_driver_b",
		value: "3.04 Medium",
		data: { "KPI Category": "Execution", Score: "3.04 Medium" },
		data_points: {
			type: "kpi_driver",
			name: "Driver B",
			settings: { "KPI Category": "Execution" },
		},
	},
] as const;

describe("DeepDiveService.getDeepDiveCompaniesTable static validations", () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it("merges category math and missing data point aggregates into company rows", async () => {
		jest
			.spyOn(DeepDiveRepository, "getReportById")
			.mockResolvedValueOnce(SAMPLE_REPORT as never);
		jest
			.spyOn(DeepDiveRepository, "getReportCompanies")
			.mockResolvedValueOnce(SAMPLE_COMPANIES as never);
		jest
			.spyOn(DeepDiveRepository, "getCompanyStepStatusSummary")
			.mockResolvedValueOnce([
				{ company_id: 100, status: "DONE", _count: { _all: 5 } },
				{ company_id: 200, status: "DONE", _count: { _all: 3 } },
				{ company_id: 300, status: "DONE", _count: { _all: 5 } },
			] as never);
		jest
			.spyOn(DeepDiveRepository, "getReportDataPointSources")
			.mockResolvedValueOnce([] as never);
		jest
			.spyOn(DeepDiveRepository, "getReportStepsCount")
			.mockResolvedValueOnce(5 as never);
		jest
			.spyOn(DeepDiveRepository, "getCompanyLevelReportFileCounts")
			.mockResolvedValueOnce([] as never);
		jest
			.spyOn(DeepDiveRepository, "getCompaniesKpiResults")
			.mockResolvedValueOnce([...SAMPLE_KPI_RESULTS] as never);
		jest
			.spyOn(DeepDiveRepository, "getMissingReportDataPointsByCompany")
			.mockResolvedValueOnce([
				{
					company_id: 200,
					missing_count: 3,
					missing_data_point_ids: [
						"raw_data_point_1",
						"raw_data_point_2",
						"raw_data_point_3",
					],
				},
			] as never);

		const result = await DeepDiveService.getDeepDiveCompaniesTable(35);

		expect(result?.success).toBe(true);
		expect(result?.data.companies).toHaveLength(3);

		const acme = result?.data.companies.find((company) => company.id === 100);
		expect(acme?.staticValidation).toEqual({
			categoryMathOk: true,
			categoryMathMismatchCount: 0,
			categoryMathDetails: [],
			missingReportDataPointsCount: 0,
			missingReportDataPointIds: [],
			hasMissingReportDataPoints: false,
		});

		const beta = result?.data.companies.find((company) => company.id === 200);
		expect(beta?.staticValidation).toEqual({
			categoryMathOk: false,
			categoryMathMismatchCount: 1,
			categoryMathDetails: [
				{
					category: "Execution",
					currentValue: 2,
					expectedCalculatedValue: 4,
					delta: -2,
				},
			],
			missingReportDataPointsCount: 3,
			missingReportDataPointIds: [
				"raw_data_point_1",
				"raw_data_point_2",
				"raw_data_point_3",
			],
			hasMissingReportDataPoints: true,
		});

		const gamma = result?.data.companies.find((company) => company.id === 300);
		expect(gamma?.staticValidation).toEqual({
			categoryMathOk: false,
			categoryMathMismatchCount: 1,
			categoryMathDetails: [
				{
					category: "Execution",
					currentValue: 3.1,
					expectedCalculatedValue: 3.045,
					delta: 0.05500000000000016,
				},
			],
			missingReportDataPointsCount: 0,
			missingReportDataPointIds: [],
			hasMissingReportDataPoints: false,
		});
	});
});
