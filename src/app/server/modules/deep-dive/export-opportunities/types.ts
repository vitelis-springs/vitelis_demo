export type CellValue = string | number | boolean | Date | null;

export type RawRow = Record<string, unknown>;

export type SheetColumnDef = {
	/** Canonical field key on normalized row / sheet row */
	field: string;
	/** Excel header title */
	title: string;
	width?: number;
	wrap?: boolean;
	/** hyperlink | status | boolean | count | id | text | number | date */
	format?:
		| "hyperlink"
		| "status"
		| "boolean"
		| "count"
		| "id"
		| "text"
		| "number"
		| "date";
};

export type OverviewTable = {
	title: string;
	columns: SheetColumnDef[];
	rows: Record<string, CellValue>[];
};

export type SheetData = {
	name: string;
	/** Always include even when empty */
	required?: boolean;
	/** Hide sheet by default (raw export) */
	hidden?: boolean;
	columns: SheetColumnDef[];
	rows: Record<string, CellValue>[];
	/** Optional note rendered above the table (Overview only) */
	preamble?: Array<{ label: string; value: CellValue }>;
	metricBlocks?: Array<{ title: string; rows: Array<[string, CellValue]> }>;
	navLinks?: string[];
	overviewTables?: OverviewTable[];
};

export type ParseWarningBucket = Record<string, number>;

export type ExportDiagnostics = {
	rawRowCount: number;
	sheets: Array<{ name: string; rowCount: number }>;
	parseWarnings: ParseWarningBucket;
	missingColumns: string[];
	rankingVersion: string | null;
};
