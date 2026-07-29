import type { SignalStatRow } from "../../types/deep-dive.types";

const UNIT_TYPE_LABELS: Record<string, string> = {
	subcategory: "Subcategory",
	product_signal: "Product Signal",
};

const COLUMNS: Array<{
	header: string;
	width: number;
	value: (row: SignalStatRow) => string | number | null;
	numFmt?: string;
}> = [
	{
		header: "Unit Type",
		width: 16,
		value: (r) => UNIT_TYPE_LABELS[r.unitType] ?? r.unitType,
	},
	{ header: "Signal Name", width: 42, value: (r) => r.unitName },
	{ header: "External ID", width: 14, value: (r) => r.externalId },
	{ header: "Signal Class", width: 16, value: (r) => r.signalClass },
	{ header: "Opportunities", width: 14, value: (r) => r.opportunitiesCount },
	{
		header: "Signal Definitions",
		width: 16,
		value: (r) => r.distinctSignalDefinitionCount,
	},
	{
		header: "Completed Searches",
		width: 16,
		value: (r) => r.completedSearchCount,
	},
	{
		header: "Signal Efficiency %",
		width: 16,
		value: (r) => r.signalEfficiencyPct,
		numFmt: '0.0"%"',
	},
	{
		header: "Companies Researched",
		width: 18,
		value: (r) => r.companiesResearchedCount,
	},
	{
		header: "Companies w/ Opportunity",
		width: 20,
		value: (r) => r.companiesWithOpportunityCount,
	},
	{
		header: "Company Hit Rate %",
		width: 16,
		value: (r) => r.companyHitRatePct,
		numFmt: '0.0"%"',
	},
];

export async function buildSignalStatsWorkbook(
	rows: SignalStatRow[],
): Promise<ArrayBuffer> {
	const ExcelJSImport = await import("exceljs");
	const ExcelJS = ExcelJSImport as {
		Workbook?: new () => {
			addWorksheet: (name: string) => {
				columns: Array<{ header: string; key: string; width: number }>;
				getRow: (n: number) => { font: Record<string, unknown> };
				addRow: (values: Record<string, string | number | null>) => {
					eachCell: (
						cb: (cell: { numFmt?: string }, colNumber: number) => void,
					) => void;
				};
			};
			xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
		};
		default?: {
			Workbook: new () => {
				addWorksheet: (name: string) => {
					columns: Array<{ header: string; key: string; width: number }>;
					getRow: (n: number) => { font: Record<string, unknown> };
					addRow: (values: Record<string, string | number | null>) => {
						eachCell: (
							cb: (cell: { numFmt?: string }, colNumber: number) => void,
						) => void;
					};
				};
				xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
			};
		};
	};
	const WorkbookCtor = ExcelJS.Workbook ?? ExcelJS.default?.Workbook;
	if (!WorkbookCtor) {
		throw new Error("exceljs Workbook constructor not available");
	}

	const workbook = new WorkbookCtor();
	const sheet = workbook.addWorksheet("Signal Statistics");

	sheet.columns = COLUMNS.map((c, i) => ({
		header: c.header,
		key: `col${i}`,
		width: c.width,
	}));
	sheet.getRow(1).font = { bold: true };

	for (const row of rows) {
		const values: Record<string, string | number | null> = {};
		COLUMNS.forEach((c, i) => {
			values[`col${i}`] = c.value(row);
		});
		const excelRow = sheet.addRow(values);
		excelRow.eachCell((cell, colNumber) => {
			const numFmt = COLUMNS[colNumber - 1]?.numFmt;
			if (numFmt) cell.numFmt = numFmt;
		});
	}

	return workbook.xlsx.writeBuffer();
}
