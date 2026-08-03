import type {
	CategoryProductTagCell,
	SignalCategoryStatRow,
	SignalStatRow,
} from "../../types/deep-dive.types";

const UNIT_TYPE_LABELS: Record<string, string> = {
	subcategory: "Subcategory",
	product_signal: "Product Signal",
};

interface ColumnSpec<T> {
	header: string;
	width: number;
	value: (row: T) => string | number | null;
	numFmt?: string;
}

const COLUMNS: Array<ColumnSpec<SignalStatRow>> = [
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
	{
		header: "Trigger Opportunities",
		width: 18,
		value: (r) => r.triggerOpportunitiesCount,
	},
	{
		header: "Trigger Efficiency %",
		width: 16,
		value: (r) => r.triggerEfficiencyPct,
		numFmt: '0.0"%"',
	},
];

const CATEGORY_COLUMNS: Array<ColumnSpec<SignalCategoryStatRow>> = [
	{ header: "Category", width: 40, value: (r) => r.categoryName },
	{
		header: "Subcategories",
		width: 14,
		value: (r) => r.subcategoryCount,
	},
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
	{
		header: "Trigger Opportunities",
		width: 18,
		value: (r) => r.triggerOpportunitiesCount,
	},
	{
		header: "Trigger Efficiency %",
		width: 16,
		value: (r) => r.triggerEfficiencyPct,
		numFmt: '0.0"%"',
	},
];

type ExcelJSModule = {
	Workbook?: new () => ExcelWorkbook;
	default?: { Workbook: new () => ExcelWorkbook };
};

interface ExcelWorkbook {
	addWorksheet: (name: string) => ExcelWorksheet;
	xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
}

interface ExcelWorksheet {
	columns: Array<{ header: string; key: string; width: number }>;
	getRow: (n: number) => { font: Record<string, unknown> };
	addRow: (values: Record<string, string | number | null>) => {
		eachCell: (
			cb: (cell: { numFmt?: string }, colNumber: number) => void,
		) => void;
	};
}

async function writeRowsToWorkbook<T>(
	sheetName: string,
	columns: Array<ColumnSpec<T>>,
	rows: T[],
): Promise<ArrayBuffer> {
	const ExcelJSImport = await import("exceljs");
	const ExcelJS = ExcelJSImport as ExcelJSModule;
	const WorkbookCtor = ExcelJS.Workbook ?? ExcelJS.default?.Workbook;
	if (!WorkbookCtor) {
		throw new Error("exceljs Workbook constructor not available");
	}

	const workbook = new WorkbookCtor();
	const sheet = workbook.addWorksheet(sheetName);

	sheet.columns = columns.map((c, i) => ({
		header: c.header,
		key: `col${i}`,
		width: c.width,
	}));
	sheet.getRow(1).font = { bold: true };

	for (const row of rows) {
		const values: Record<string, string | number | null> = {};
		columns.forEach((c, i) => {
			values[`col${i}`] = c.value(row);
		});
		const excelRow = sheet.addRow(values);
		excelRow.eachCell((cell, colNumber) => {
			const numFmt = columns[colNumber - 1]?.numFmt;
			if (numFmt) cell.numFmt = numFmt;
		});
	}

	return workbook.xlsx.writeBuffer();
}

export async function buildSignalStatsWorkbook(
	rows: SignalStatRow[],
): Promise<ArrayBuffer> {
	return writeRowsToWorkbook("Signal Statistics", COLUMNS, rows);
}

export async function buildSignalCategoryStatsWorkbook(
	rows: SignalCategoryStatRow[],
): Promise<ArrayBuffer> {
	return writeRowsToWorkbook(
		"Signal Category Statistics",
		CATEGORY_COLUMNS,
		rows,
	);
}

const CATEGORY_PRODUCT_TAG_COLUMNS: Array<ColumnSpec<CategoryProductTagCell>> =
	[
		{ header: "Category", width: 36, value: (r) => r.categoryName },
		{ header: "Product Tag", width: 28, value: (r) => r.tagName },
		{ header: "Opportunities", width: 14, value: (r) => r.opportunitiesCount },
		{
			header: "Completed Searches (category)",
			width: 20,
			value: (r) => r.completedSearchCount,
		},
		{
			header: "Signal Efficiency %",
			width: 16,
			value: (r) => r.signalEfficiencyPct,
			numFmt: '0.00"%"',
		},
	];

/**
 * Long format (one row per non-empty category×tag cell), not the pivoted
 * matrix shown on screen — easier to re-pivot in Excel than to reproduce a
 * dynamic-column table in a static workbook.
 */
export async function buildCategoryProductTagMatrixWorkbook(
	rows: CategoryProductTagCell[],
): Promise<ArrayBuffer> {
	return writeRowsToWorkbook(
		"Category x Product Tag",
		CATEGORY_PRODUCT_TAG_COLUMNS,
		rows,
	);
}
