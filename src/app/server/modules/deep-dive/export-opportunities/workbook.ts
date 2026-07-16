import type {
	Cell,
	ExcelJSModule,
	Fill,
	Row,
	Worksheet,
} from "./exceljs-types";
import type { CellValue, SheetColumnDef, SheetData } from "./types";

const HEADER_FILL: Fill = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "FF1F3864" },
};

const GREEN = "FFC6EFCE";
const YELLOW = "FFFFEB9C";
const RED = "FFFFC7CE";
const GREY = "FFD9D9D9";

const STATUS_GREEN =
	/\b(pass(ed)?|strong|confirm(ed)?|success|ok|good|valid)\b/i;
const STATUS_YELLOW =
	/\b(warn(ing)?|partial|review|acceptable|proxy|conditional|medium)\b/i;
const STATUS_RED =
	/\b(fail(ed)?|unsupported|reject(ed)?|invalid|weak|not[_ -]?bound|missing[_ -]?scoring)\b/i;
const STATUS_GREY =
	/\b(missing|not[_ -]?evaluated|n\/?a|null|unknown|not[_ -]?researched)\b/i;

export function normalizeStatusCategory(
	value: unknown,
): "green" | "yellow" | "red" | "grey" | null {
	if (value === null || value === undefined || value === "") return "grey";
	const s = String(value).trim();
	if (!s) return "grey";
	if (STATUS_GREEN.test(s)) return "green";
	if (STATUS_RED.test(s)) return "red";
	if (STATUS_YELLOW.test(s)) return "yellow";
	if (STATUS_GREY.test(s)) return "grey";
	return null;
}

function argbForCategory(cat: "green" | "yellow" | "red" | "grey"): string {
	switch (cat) {
		case "green":
			return GREEN;
		case "yellow":
			return YELLOW;
		case "red":
			return RED;
		default:
			return GREY;
	}
}

export function applyHeaderFormat(row: Row): void {
	row.font = { bold: true, color: { argb: "FFFFFFFF" } };
	row.fill = HEADER_FILL;
	row.alignment = { vertical: "middle", wrapText: true };
}

export function applyAutofilter(
	sheet: Worksheet,
	colCount: number,
	headerRow = 1,
): void {
	if (colCount < 1) return;
	sheet.autoFilter = {
		from: { row: headerRow, column: 1 },
		to: { row: headerRow, column: colCount },
	};
}

export function freezeHeaders(sheet: Worksheet, ySplit = 1): void {
	sheet.views = [{ state: "frozen", ySplit, xSplit: 0 }];
}

export function setColumnWidths(
	sheet: Worksheet,
	columns: SheetColumnDef[],
): void {
	columns.forEach((col, i) => {
		const width = Math.min(col.width ?? 18, col.wrap ? 60 : 40);
		sheet.getColumn(i + 1).width = width;
	});
}

export function applyWrapText(cell: Cell, wrap = true): void {
	cell.alignment = {
		...(cell.alignment ?? {}),
		wrapText: wrap,
		vertical: "top",
	};
}

function fillCell(cell: Cell, argb: string): void {
	cell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb },
	};
}

export function applyStatusFill(cell: Cell, value: unknown): void {
	const cat = normalizeStatusCategory(value);
	if (!cat) return;
	fillCell(cell, argbForCategory(cat));
}

export function applyBooleanFill(cell: Cell, value: unknown): void {
	if (value === true || value === "TRUE" || value === "Yes" || value === "X") {
		fillCell(cell, YELLOW);
	} else if (value === false || value === "FALSE" || value === "No") {
		fillCell(cell, GREY);
	}
}

export function applyCountWarningFill(cell: Cell, value: unknown): void {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return;
	if (n <= 0) fillCell(cell, GREEN);
	else if (n <= 2) fillCell(cell, YELLOW);
	else fillCell(cell, RED);
}

export function addExcelHyperlink(
	cell: Cell,
	url: string | null | undefined,
	display?: string,
): void {
	if (!url) return;
	const trimmed = url.trim();
	if (!trimmed) return;
	let href = trimmed;
	if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
		href = `mailto:${trimmed}`;
	} else if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) {
		if (/linkedin\.com/i.test(trimmed)) href = `https://${trimmed}`;
		else return;
	}
	cell.value = {
		text: display ?? trimmed,
		hyperlink: href,
	};
	cell.font = { color: { argb: "FF0563C1" }, underline: true };
}

function writeCellValue(
	cell: Cell,
	value: CellValue,
	format?: SheetColumnDef["format"],
): void {
	if (value === null || value === undefined) {
		cell.value = null;
		return;
	}

	if (format === "hyperlink" && typeof value === "string") {
		addExcelHyperlink(cell, value);
		return;
	}

	if (format === "id") {
		if (typeof value === "number") {
			cell.value = value;
			cell.numFmt = "0";
		} else {
			cell.value = String(value);
		}
		return;
	}

	if (format === "number" || format === "count") {
		const n = typeof value === "number" ? value : Number(value);
		if (Number.isFinite(n)) {
			cell.value = n;
			cell.numFmt = format === "count" ? "0" : "0.############";
		} else {
			cell.value = null;
		}
		return;
	}

	if (format === "boolean") {
		if (typeof value === "boolean") cell.value = value ? "Yes" : "No";
		else cell.value = value as string | number | boolean;
		return;
	}

	if (format === "date" && value instanceof Date) {
		cell.value = value;
		cell.numFmt = "yyyy-mm-dd";
		return;
	}

	cell.value = value as string | number | boolean | Date;
}

export async function writeWorkbook(
	ExcelJSMod: ExcelJSModule,
	sheets: SheetData[],
): Promise<ArrayBuffer> {
	const workbook = new ExcelJSMod.Workbook();
	workbook.creator = "Vitelis Sales Miner";
	workbook.created = new Date();

	for (const sheetData of sheets) {
		const ws = workbook.addWorksheet(sheetData.name, {
			state: sheetData.hidden ? "hidden" : "visible",
		});

		const headerRowIndex = 1;

		if (sheetData.name === "00 Overview") {
			let r = 1;
			ws.getCell(r, 1).value = "Opportunity Portfolio Export";
			ws.getCell(r, 1).font = { bold: true, size: 14 };
			r += 2;

			if (sheetData.navLinks?.length) {
				ws.getCell(r, 1).value = "Navigation";
				ws.getCell(r, 1).font = { bold: true };
				r += 1;
				for (const name of sheetData.navLinks) {
					const cell = ws.getCell(r, 1);
					cell.value = {
						text: name,
						hyperlink: `#'${name.replace(/'/g, "''")}'!A1`,
					};
					cell.font = { color: { argb: "FF0563C1" }, underline: true };
					r += 1;
				}
				r += 1;
			}

			if (sheetData.metricBlocks?.length) {
				for (const block of sheetData.metricBlocks) {
					ws.getCell(r, 1).value = block.title;
					ws.getCell(r, 1).font = { bold: true };
					r += 1;
					for (const [label, value] of block.rows) {
						ws.getCell(r, 1).value = label;
						ws.getCell(r, 2).value = value as
							| string
							| number
							| boolean
							| Date
							| null;
						r += 1;
					}
					r += 1;
				}
			}

			ws.getColumn(1).width = 36;
			ws.getColumn(2).width = 18;
			ws.getColumn(3).width = 28;
			ws.getColumn(4).width = 40;
			ws.getColumn(5).width = 12;
			ws.getColumn(6).width = 14;
			ws.getColumn(7).width = 14;
			ws.getColumn(8).width = 16;
			ws.getColumn(9).width = 14;

			const sections = sheetData.overviewTables;
			if (sections?.length) {
				for (const section of sections) {
					ws.getCell(r, 1).value = section.title;
					ws.getCell(r, 1).font = { bold: true };
					r += 1;
					section.columns.forEach((col, i) => {
						const cell = ws.getCell(r, i + 1);
						cell.value = col.title;
					});
					applyHeaderFormat(ws.getRow(r));
					r += 1;
					for (const row of section.rows) {
						section.columns.forEach((col, i) => {
							const cell = ws.getCell(r, i + 1);
							writeCellValue(cell, row[col.field] ?? null, col.format);
							applyWrapText(cell, col.wrap ?? false);
							if (col.format === "status")
								applyStatusFill(cell, row[col.field]);
							if (col.format === "boolean")
								applyBooleanFill(cell, row[col.field]);
							if (col.format === "count")
								applyCountWarningFill(cell, row[col.field]);
						});
						r += 1;
					}
					r += 1;
				}
			}

			continue;
		}

		sheetData.columns.forEach((col, i) => {
			const cell = ws.getCell(headerRowIndex, i + 1);
			cell.value = col.title;
		});
		applyHeaderFormat(ws.getRow(headerRowIndex));
		setColumnWidths(ws, sheetData.columns);

		let rowIndex = headerRowIndex + 1;
		for (const row of sheetData.rows) {
			sheetData.columns.forEach((col, i) => {
				const cell = ws.getCell(rowIndex, i + 1);
				const value = row[col.field] ?? null;

				if (
					col.format === "hyperlink" &&
					typeof value === "string" &&
					value.startsWith("#")
				) {
					cell.value = {
						text: "View",
						hyperlink: value,
					};
					cell.font = { color: { argb: "FF0563C1" }, underline: true };
				} else {
					writeCellValue(cell, value, col.format);
				}

				applyWrapText(cell, Boolean(col.wrap));

				if (col.format === "status") applyStatusFill(cell, value);
				if (col.format === "boolean") applyBooleanFill(cell, value);
				if (col.format === "count") applyCountWarningFill(cell, value);
			});
			rowIndex += 1;
		}

		applyAutofilter(ws, sheetData.columns.length, headerRowIndex);
		freezeHeaders(ws, headerRowIndex);
	}

	return workbook.xlsx.writeBuffer();
}
