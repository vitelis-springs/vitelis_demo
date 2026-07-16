/**
 * Minimal ExcelJS surface used by the opportunities workbook writer.
 * Full typings come from the exceljs package when installed.
 */
export type Fill = {
	type: "pattern";
	pattern: "solid";
	fgColor: { argb: string };
};

export type CellValue =
	| string
	| number
	| boolean
	| Date
	| null
	| { text: string; hyperlink: string };

export type Cell = {
	value: CellValue | undefined;
	font?: Record<string, unknown>;
	fill?: Fill;
	alignment?: Record<string, unknown>;
	numFmt?: string;
};

export type Row = {
	font?: Record<string, unknown>;
	fill?: Fill;
	alignment?: Record<string, unknown>;
};

export type Column = {
	width?: number;
};

export type Worksheet = {
	getCell: (row: number, col: number) => Cell;
	getRow: (row: number) => Row;
	getColumn: (col: number) => Column;
	autoFilter?: unknown;
	views?: unknown[];
};

export type Workbook = {
	creator?: string;
	created?: Date;
	addWorksheet: (
		name: string,
		opts?: { state?: "visible" | "hidden" },
	) => Worksheet;
	xlsx: {
		writeBuffer: () => Promise<ArrayBuffer>;
	};
};

export type ExcelJSModule = {
	Workbook: new () => Workbook;
};

declare const ExcelJS: ExcelJSModule;
export default ExcelJS;
