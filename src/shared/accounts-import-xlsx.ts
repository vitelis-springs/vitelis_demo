export const ACCOUNTS_SHEET_NAME_PATTERN = "target-accounts";

export const EXPECTED_ACCOUNTS_HEADERS = [
	"#",
	"Company Name",
	"Exchange Ticker",
	"GICS Code",
	"Subsidiaries",
	"Corporate Website",
	"Career Site",
	"Investor Relations Site",
] as const;

export interface ParsedAccountRow {
	rowNumber: number;
	companyName: string;
	exchangeTicker: string | null;
	gicsCode: string | null;
	subsidiaries: string[];
	corporateWebsite: string | null;
	careerSite: string | null;
	investorRelationsSite: string | null;
}

export interface AccountsWorkbook {
	allSheetNames: string[];
	sheetName: string | null;
	rows: ParsedAccountRow[] | null;
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

// Treat common "empty" placeholders (n/a, none, -, etc.) as null rather than a literal value.
const NA_PLACEHOLDER_PATTERN = /^(n\/?a|none|null|-|–|—)$/i;

function getCell(cellMap: Map<number, string>, col: number): string | null {
	const v = cellMap.get(col);
	if (!v) return null;
	const trimmed = v.trim();
	if (!trimmed || NA_PLACEHOLDER_PATTERN.test(trimmed)) return null;
	return trimmed;
}

function normalizeHeader(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function columnLetter(index: number): string {
	return String.fromCharCode(65 + index);
}

/**
 * Column order is load-bearing: parseAccountsSheet reads cells by index, not
 * by header name. A user-supplied sheet with reordered/renamed/missing
 * columns would otherwise parse "successfully" while silently shuffling
 * data into the wrong fields.
 */
function validateHeaderRow(cellMap: Map<number, string>): void {
	const mismatches = EXPECTED_ACCOUNTS_HEADERS.map((expected, index) => {
		const actual = cellMap.get(index)?.trim() ?? "";
		return normalizeHeader(actual) === normalizeHeader(expected)
			? null
			: `column ${columnLetter(index)}: expected "${expected}", found "${actual || "(empty)"}"`;
	}).filter((m): m is string => m !== null);

	if (mismatches.length > 0) {
		throw new Error(
			`The "target-accounts" sheet's columns don't match the expected template. ${mismatches.join("; ")}`,
		);
	}
}

function parseAccountsSheet(
	worksheetXml: string,
	sharedStrings: string[],
): ParsedAccountRow[] {
	const doc = parseXmlDoc(worksheetXml);
	const rowNodes = Array.from(doc.getElementsByTagName("row"));
	const rows: ParsedAccountRow[] = [];

	const headerRowNode = rowNodes.find(
		(rowNode) => Number(rowNode.getAttribute("r") ?? "0") === 1,
	);
	if (!headerRowNode) {
		throw new Error(
			'Could not find the header row (row 1) in the "target-accounts" sheet.',
		);
	}
	validateHeaderRow(parseRowCells(headerRowNode, sharedStrings));

	for (const rowNode of rowNodes) {
		const rowNumber = Number(rowNode.getAttribute("r") ?? "0");
		if (rowNumber <= 1) continue; // skip header

		const cellMap = parseRowCells(rowNode, sharedStrings);
		const companyName = getCell(cellMap, 1);
		if (!companyName) continue;

		const subsidiariesRaw = getCell(cellMap, 4);
		const subsidiaries = subsidiariesRaw
			? subsidiariesRaw
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [];

		rows.push({
			rowNumber,
			companyName,
			exchangeTicker: getCell(cellMap, 2),
			gicsCode: getCell(cellMap, 3),
			subsidiaries,
			corporateWebsite: getCell(cellMap, 5),
			careerSite: getCell(cellMap, 6),
			investorRelationsSite: getCell(cellMap, 7),
		});
	}

	return rows;
}

export async function parseAccountsWorkbook(
	file: File,
): Promise<AccountsWorkbook> {
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
		norm(s.sheetName).includes(ACCOUNTS_SHEET_NAME_PATTERN),
	);

	if (!targetSheet) {
		return { allSheetNames, sheetName: null, rows: null };
	}

	const worksheetXml = await zip
		.file(targetSheet.worksheetPath)
		?.async("string");
	if (!worksheetXml) {
		return { allSheetNames, sheetName: null, rows: null };
	}

	const rows = parseAccountsSheet(worksheetXml, sharedStrings);
	return { allSheetNames, sheetName: targetSheet.sheetName, rows };
}
