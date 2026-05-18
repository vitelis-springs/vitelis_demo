export const SIGNAL_MODEL_SHEET_NAME_PATTERN = "signal model";

export const EXPECTED_GICS_SECTORS = new Set([
	"Energy",
	"Materials",
	"Industrials",
	"Consumer Discretionary",
	"Consumer Staples",
	"Health Care",
	"Financials",
	"Information Technology",
	"Communication Services",
	"Utilities",
	"Real Estate",
]);

export const EXPECTED_GICS_INDUSTRY_GROUPS = new Set([
	"Energy",
	"Materials",
	"Capital Goods",
	"Commercial & Professional Services",
	"Transportation",
	"Automobiles & Components",
	"Consumer Durables & Apparel",
	"Consumer Services",
	"Consumer Discretionary Distribution & Retail",
	"Consumer Staples Distribution & Retail",
	"Food, Beverage & Tobacco",
	"Household & Personal Products",
	"Health Care Equipment & Services",
	"Pharmaceuticals, Biotechnology & Life Sciences",
	"Banks",
	"Financial Services",
	"Insurance",
	"Software & Services",
	"Technology Hardware & Equipment",
	"Semiconductors & Semiconductor Equipment",
	"Telecommunication Services",
	"Media & Entertainment",
	"Utilities",
	"Equity Real Estate Investment Trusts (REITs)",
	"Real Estate Management & Development",
]);

export const GICS_INDUSTRY_GROUP_CODE_MAP: Record<string, string> = {
	Energy: "1010",
	Materials: "1510",
	"Capital Goods": "2010",
	"Commercial & Professional Services": "2020",
	Transportation: "2030",
	"Automobiles & Components": "2510",
	"Consumer Durables & Apparel": "2520",
	"Consumer Services": "2530",
	"Consumer Discretionary Distribution & Retail": "2550",
	"Consumer Staples Distribution & Retail": "3010",
	"Food, Beverage & Tobacco": "3020",
	"Household & Personal Products": "3030",
	"Health Care Equipment & Services": "3510",
	"Pharmaceuticals, Biotechnology & Life Sciences": "3520",
	Banks: "4010",
	"Financial Services": "4020",
	Insurance: "4030",
	"Software & Services": "4510",
	"Technology Hardware & Equipment": "4520",
	"Semiconductors & Semiconductor Equipment": "4530",
	"Telecommunication Services": "5010",
	"Media & Entertainment": "5020",
	Utilities: "5510",
	"Equity Real Estate Investment Trusts (REITs)": "6010",
	"Real Estate Management & Development": "6020",
};

export const GICS_GROUP_TO_SECTOR: Record<string, string> = {
	Energy: "Energy",
	Materials: "Materials",
	"Capital Goods": "Industrials",
	"Commercial & Professional Services": "Industrials",
	Transportation: "Industrials",
	"Automobiles & Components": "Consumer Discretionary",
	"Consumer Durables & Apparel": "Consumer Discretionary",
	"Consumer Services": "Consumer Discretionary",
	"Consumer Discretionary Distribution & Retail": "Consumer Discretionary",
	"Consumer Staples Distribution & Retail": "Consumer Staples",
	"Food, Beverage & Tobacco": "Consumer Staples",
	"Household & Personal Products": "Consumer Staples",
	"Health Care Equipment & Services": "Health Care",
	"Pharmaceuticals, Biotechnology & Life Sciences": "Health Care",
	Banks: "Financials",
	"Financial Services": "Financials",
	Insurance: "Financials",
	"Software & Services": "Information Technology",
	"Technology Hardware & Equipment": "Information Technology",
	"Semiconductors & Semiconductor Equipment": "Information Technology",
	"Telecommunication Services": "Communication Services",
	"Media & Entertainment": "Communication Services",
	Utilities: "Utilities",
	"Equity Real Estate Investment Trusts (REITs)": "Real Estate",
	"Real Estate Management & Development": "Real Estate",
};

export const GICS_ORDERED_GROUPS = Object.keys(GICS_INDUSTRY_GROUP_CODE_MAP);

export const EXPECTED_FIXED_HEADERS = {
	0: "Cat #",
	1: "L1 Category",
	2: "Tier",
	3: "Sub #",
	4: "Signal Class",
	5: "Generalized Signal (L3)",
	6: "Universal Definition",
	7: "Backbone Prompt Instruction",
} satisfies Record<number, string>;

export interface ColumnMismatch {
	colIndex: number;
	expected: string;
	actual: string | null;
}

export interface CellError {
	rowNumber: number;
	colIndex: number;
	colName: string;
}

export interface GicsColumnDef {
	colIndex: number;
	label: string;
	type: "status" | "instruction";
}

export interface GicsRowData {
	gicsCode: string;
	instruction: string | null;
	status: boolean;
}

export interface ParsedSignalModelRow {
	rowNumber: number;
	catCode: string;
	catName: string;
	tier: number;
	subCode: string;
	signalClass: string;
	signalName: string;
	description: string;
	backbonePrompt: string | null;
	allValues: (string | null)[];
	gicsData: GicsRowData[];
}

export interface SignalModelWorkbook {
	allSheetNames: string[];
	rows: ParsedSignalModelRow[] | null;
	sheetName: string | null;
	gicsColumns: GicsColumnDef[];
	columnMismatches: ColumnMismatch[];
	cellErrors: CellError[];
}

const HEADER_ROW_COUNT = 2;
const FIRST_GICS_COL = 8; // col I (0-indexed)

const COL_CAT_CODE = 0; // col A
const COL_CAT_NAME = 1; // col B
const COL_TIER = 2; // col C
const COL_SUB_CODE = 3; // col D
const COL_SIGNAL_CLASS = 4; // col E
const COL_SIGNAL_NAME = 5; // col F
const COL_DESCRIPTION = 6; // col G
const COL_BACKBONE = 7; // col H

function parseTier(raw: string | null): number {
	if (!raw) return 1;
	const match = raw.match(/\d+/);
	return match ? Number(match[0]) : 1;
}

function parseXmlDoc(xmlText: string): Document {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlText, "application/xml");
	if (doc.getElementsByTagName("parsererror").length > 0) {
		throw new Error("Failed to parse XLSX XML");
	}
	return doc;
}

function columnRefToIndex(cellRef: string): number {
	const letters = cellRef.replace(/\d+/g, "").toUpperCase();
	let value = 0;
	for (const letter of letters) {
		value = value * 26 + (letter.charCodeAt(0) - 64);
	}
	return value - 1;
}

function readSharedStrings(xml: string | null): string[] {
	if (!xml) return [];
	const doc = parseXmlDoc(xml);
	return Array.from(doc.getElementsByTagName("si")).map((item) =>
		Array.from(item.getElementsByTagName("t"))
			.map((node) => node.textContent ?? "")
			.join(""),
	);
}

function readCellValue(cell: Element, sharedStrings: string[]): string {
	const type = cell.getAttribute("t");
	if (type === "inlineStr") {
		return Array.from(cell.getElementsByTagName("t"))
			.map((node) => node.textContent ?? "")
			.join("");
	}
	const rawValue = cell.getElementsByTagName("v")[0]?.textContent ?? "";
	if (type === "s") {
		const index = Number(rawValue);
		return Number.isFinite(index) ? (sharedStrings[index] ?? "") : "";
	}
	return rawValue;
}

function resolveWorksheetPaths(
	workbookXml: string,
	workbookRelsXml: string,
): Array<{ sheetName: string; worksheetPath: string }> {
	const workbookDoc = parseXmlDoc(workbookXml);
	const relsDoc = parseXmlDoc(workbookRelsXml);

	const relsMap = new Map<string, string>();
	Array.from(relsDoc.getElementsByTagName("Relationship")).forEach((rel) => {
		const id = rel.getAttribute("Id");
		const target = rel.getAttribute("Target");
		if (!id || !target) return;
		const path = target.startsWith("/")
			? target.replace(/^\/+/, "")
			: `xl/${target.replace(/^\/+/, "")}`;
		relsMap.set(id, path);
	});

	return Array.from(workbookDoc.getElementsByTagName("sheet"))
		.map((sheet) => {
			const sheetName = sheet.getAttribute("name") ?? "Sheet";
			const rId =
				sheet.getAttribute("r:id") ??
				sheet.getAttributeNS(
					"http://schemas.openxmlformats.org/officeDocument/2006/relationships",
					"id",
				);
			const worksheetPath = rId ? relsMap.get(rId) : undefined;
			return worksheetPath ? { sheetName, worksheetPath } : null;
		})
		.filter(
			(item): item is { sheetName: string; worksheetPath: string } =>
				item !== null,
		);
}

function parseRowCells(
	rowNode: Element,
	sharedStrings: string[],
): Map<number, string> {
	const cellMap = new Map<number, string>();
	Array.from(rowNode.getElementsByTagName("c")).forEach((cell) => {
		const ref = cell.getAttribute("r");
		if (!ref) return;
		cellMap.set(columnRefToIndex(ref), readCellValue(cell, sharedStrings));
	});
	return cellMap;
}

function getCell(cellMap: Map<number, string>, col: number): string | null {
	const v = cellMap.get(col);
	return v !== undefined && v.trim() !== "" ? v.trim() : null;
}

function buildGicsColumns(
	h1: Map<number, string>, // row 1: sector names
	h2: Map<number, string>, // row 2: group names
	maxCol: number,
): { gicsColumns: GicsColumnDef[]; gicsMismatches: ColumnMismatch[] } {
	const gicsColumns: GicsColumnDef[] = [];
	const gicsMismatches: ColumnMismatch[] = [];

	for (let col = FIRST_GICS_COL; col <= maxCol; col++) {
		const h1Val = getCell(h1, col);
		const h2Val = getCell(h2, col);

		if (h1Val && !EXPECTED_GICS_SECTORS.has(h1Val)) {
			gicsMismatches.push({
				colIndex: col,
				expected: "GICS sector",
				actual: h1Val,
			});
		}
		if (!h2Val) {
			gicsMismatches.push({
				colIndex: col,
				expected: "GICS industry group",
				actual: null,
			});
			continue;
		}
		if (!EXPECTED_GICS_INDUSTRY_GROUPS.has(h2Val)) {
			gicsMismatches.push({
				colIndex: col,
				expected: "GICS industry group",
				actual: h2Val,
			});
		}

		gicsColumns.push({ colIndex: col, label: h2Val, type: "instruction" });
	}

	return { gicsColumns, gicsMismatches };
}

function buildIndustryColMap(
	gicsColumns: GicsColumnDef[],
): Map<string, { instructionCol: number | null; statusCol: number | null }> {
	const map = new Map<
		string,
		{ instructionCol: number | null; statusCol: number | null }
	>();

	for (const gicsCode of Object.values(GICS_INDUSTRY_GROUP_CODE_MAP)) {
		map.set(gicsCode, { instructionCol: null, statusCol: null });
	}

	for (const col of gicsColumns) {
		const gicsCode = GICS_INDUSTRY_GROUP_CODE_MAP[col.label];
		if (!gicsCode) continue;
		const entry = map.get(gicsCode);
		if (!entry) continue;
		entry.instructionCol = col.colIndex;
	}

	return map;
}

function parseSignalModelSheet(
	worksheetXml: string,
	sharedStrings: string[],
): {
	rows: ParsedSignalModelRow[];
	gicsColumns: GicsColumnDef[];
	columnMismatches: ColumnMismatch[];
	cellErrors: CellError[];
} {
	const doc = parseXmlDoc(worksheetXml);
	const rowNodes = Array.from(doc.getElementsByTagName("row"));
	if (rowNodes.length <= HEADER_ROW_COUNT) {
		return { rows: [], gicsColumns: [], columnMismatches: [], cellErrors: [] };
	}

	const h1 = parseRowCells(rowNodes[0]!, sharedStrings); // row 1: sector names
	const h2 = parseRowCells(rowNodes[1]!, sharedStrings); // row 2: fixed headers + group names

	const fixedMismatches: ColumnMismatch[] = Object.entries(
		EXPECTED_FIXED_HEADERS,
	)
		.map(([colStr, expected]) => {
			const colIndex = Number(colStr);
			const actual = getCell(h2, colIndex); // fixed headers are in row 2
			if (actual === expected) return null;
			return { colIndex, expected, actual };
		})
		.filter((m): m is ColumnMismatch => m !== null);

	const allCellMaps = rowNodes.map((rn) => parseRowCells(rn, sharedStrings));
	const maxCol = Math.max(
		...allCellMaps.flatMap((m) => Array.from(m.keys())),
		COL_BACKBONE,
	);

	const { gicsColumns, gicsMismatches } = buildGicsColumns(h1, h2, maxCol);
	const columnMismatches = [...fixedMismatches, ...gicsMismatches];
	const industryColMap = buildIndustryColMap(gicsColumns);
	const rows: ParsedSignalModelRow[] = [];
	const cellErrors: CellError[] = [];

	for (const rowNode of rowNodes.slice(HEADER_ROW_COUNT)) {
		const cellMap = parseRowCells(rowNode, sharedStrings);

		const catCode = getCell(cellMap, COL_CAT_CODE);
		const catName = getCell(cellMap, COL_CAT_NAME);
		const subCode = getCell(cellMap, COL_SUB_CODE);
		const signalName = getCell(cellMap, COL_SIGNAL_NAME);
		const description = getCell(cellMap, COL_DESCRIPTION);

		// Skip truly blank rows silently
		if (!catCode && !catName && !subCode && !signalName && !description)
			continue;

		const rowNum = Number(rowNode.getAttribute("r") ?? "0");

		if (!catCode)
			cellErrors.push({
				rowNumber: rowNum,
				colIndex: COL_CAT_CODE,
				colName: "Cat #",
			});
		if (!subCode)
			cellErrors.push({
				rowNumber: rowNum,
				colIndex: COL_SUB_CODE,
				colName: "Sub #",
			});

		if (!catCode || !catName || !signalName || !description || !subCode)
			continue;

		const allValues: (string | null)[] = [];
		for (let i = 0; i <= maxCol; i++) {
			allValues.push(getCell(cellMap, i));
		}

		const gicsData: GicsRowData[] = Array.from(industryColMap.entries()).map(
			([gicsCode, { instructionCol }]) => {
				const instruction =
					instructionCol !== null ? (allValues[instructionCol] ?? null) : null;
				return {
					gicsCode,
					instruction,
					status: instruction !== null, // status = instruction present
				};
			},
		);

		rows.push({
			rowNumber: rowNum,
			catCode,
			catName,
			tier: parseTier(getCell(cellMap, COL_TIER)),
			subCode,
			signalClass: getCell(cellMap, COL_SIGNAL_CLASS) ?? "",
			signalName,
			description,
			backbonePrompt: getCell(cellMap, COL_BACKBONE),
			allValues,
			gicsData,
		});
	}

	return { rows, gicsColumns, columnMismatches, cellErrors };
}

export async function parseSignalModelWorkbook(
	file: File,
): Promise<SignalModelWorkbook> {
	const JSZip = (await import("jszip")).default;
	const zip = await JSZip.loadAsync(await file.arrayBuffer());

	const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
	const workbookRelsXml = await zip
		.file("xl/_rels/workbook.xml.rels")
		?.async("string");

	if (!workbookXml || !workbookRelsXml) {
		throw new Error("Invalid XLSX file");
	}

	const sheetPaths = resolveWorksheetPaths(workbookXml, workbookRelsXml);
	const allSheetNames = sheetPaths.map((s) => s.sheetName);

	const sharedStrings = readSharedStrings(
		(await zip.file("xl/sharedStrings.xml")?.async("string")) ?? null,
	);

	const norm = (s: string) => s.trim().toLowerCase();
	const targetSheet = sheetPaths.find((s) =>
		norm(s.sheetName).includes(SIGNAL_MODEL_SHEET_NAME_PATTERN),
	);

	if (!targetSheet) {
		return {
			allSheetNames,
			rows: null,
			sheetName: null,
			gicsColumns: [],
			columnMismatches: [],
			cellErrors: [],
		};
	}

	const worksheetXml = await zip
		.file(targetSheet.worksheetPath)
		?.async("string");
	if (!worksheetXml) {
		return {
			allSheetNames,
			rows: null,
			sheetName: null,
			gicsColumns: [],
			columnMismatches: [],
			cellErrors: [],
		};
	}

	const { rows, gicsColumns, columnMismatches, cellErrors } =
		parseSignalModelSheet(worksheetXml, sharedStrings);
	return {
		allSheetNames,
		rows,
		sheetName: targetSheet.sheetName,
		gicsColumns,
		columnMismatches,
		cellErrors,
	};
}
