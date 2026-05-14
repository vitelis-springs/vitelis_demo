import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

jest.mock("next/navigation", () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("../../../src/hooks/api/useDeepDiveService", () => ({
	useGetReportCostStats: jest.fn(() => ({
		isLoading: false,
		data: { data: { summary: { totalCost: 12.345 } } },
	})),
	useGetDeepDiveMetric: jest.fn((_reportId: number, metric: string) => ({
		isLoading: false,
		data: {
			data: {
				value: metric === "orchestrator-status" ? "DONE" : 2,
			},
		},
	})),
}));

import SummaryCards from "../../../src/components/deep-dive/summary-cards";
import type { DeepDiveCompanyRow } from "../../../src/types/deep-dive.types";

const SAMPLE_COMPANIES: DeepDiveCompanyRow[] = [
	{
		id: 100,
		name: "Acme",
		status: "DONE",
		sourcesCount: 3,
		validSourcesCount: 2,
		usedSourcesCount: 2,
		candidatesCount: 0,
		companyLevelReportFilesCount: 1,
		stepsDone: 5,
		stepsTotal: 5,
		staticValidation: {
			categoryMathOk: true,
			categoryMathMismatchCount: 0,
			categoryMathDetails: [],
			missingReportDataPointsCount: 0,
			missingReportDataPointIds: [],
			hasMissingReportDataPoints: false,
		},
	},
	{
		id: 200,
		name: "Beta",
		status: "PROCESSING",
		sourcesCount: 1,
		validSourcesCount: 1,
		usedSourcesCount: 1,
		candidatesCount: 0,
		companyLevelReportFilesCount: 0,
		stepsDone: 2,
		stepsTotal: 5,
		staticValidation: {
			categoryMathOk: false,
			categoryMathMismatchCount: 1,
			categoryMathDetails: [
				{
					category: "Execution",
					currentValue: 3.1,
					expectedCalculatedValue: 3.04,
					delta: 0.06,
				},
			],
			missingReportDataPointsCount: 2,
			missingReportDataPointIds: ["raw_data_point_1", "raw_data_point_2"],
			hasMissingReportDataPoints: true,
		},
	},
];

describe("SummaryCards", () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});

	it("renders the static validations card for biz miner reports", async () => {
		await act(async () => {
			root.render(
				<SummaryCards
					reportId={35}
					settingsName="Biz Miner Settings"
					reportType="biz_miner"
					companies={SAMPLE_COMPANIES}
				/>,
			);
		});

		expect(container.textContent).toContain("Static Validations");
		expect(container.textContent).toContain("1/2 companies ok");
		expect(container.textContent).toContain("Category mismatches: 1 companies");
		expect(container.textContent).toContain("Missing data points: 1 companies");

		const staticValidationCard = Array.from(
			container.querySelectorAll(".ant-card"),
		).find((card) => card.textContent?.includes("Static Validations"));

		await act(async () => {
			staticValidationCard?.dispatchEvent(
				new MouseEvent("click", { bubbles: true }),
			);
		});

		expect(document.body.textContent).toContain("Beta");
		expect(document.body.textContent).toContain("Category math mismatches:");
		expect(document.body.textContent).toContain(
			"Execution: current 3.1 vs expected 3.0",
		);
		expect(document.body.textContent).toContain("Missing data points:");
		expect(document.body.textContent).toContain(
			"dp_ids: raw_data_point_1, raw_data_point_2",
		);
	});

	it("does not render the static validations card for non-biz-miner reports", async () => {
		await act(async () => {
			root.render(
				<SummaryCards
					reportId={35}
					settingsName="Internal Settings"
					reportType="internal"
					companies={SAMPLE_COMPANIES}
				/>,
			);
		});

		expect(container.textContent).not.toContain("Static Validations");
	});
});
