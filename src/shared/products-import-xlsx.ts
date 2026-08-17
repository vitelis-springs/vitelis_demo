export const PRODUCTS_SHEET_NAME_PATTERN = "product-table";

export const EXPECTED_PRODUCTS_HEADERS = [
	"#",
	"Org Unit",
	"(Product) Group/Category",
	"Sub-Category",
	"Product name",
	"Internal Description",
	"Product Value proposition",
	"Customer Pain point - resolved by the product/service",
	"Markets",
	"Geographies",
	"Price",
	"Buying Trigger Signals",
	"Land Anchor",
	"Expand Anchor",
	"Scale Anchor",
	"Cross-Portfolio Connection (Land → Expand → Scale)",
] as const;

/**
 * Columns are matched by header text, not position — a user's sheet can put
 * them in any order. Only these three are actually required to import a row;
 * everything else in EXPECTED_PRODUCTS_HEADERS is optional (null if absent).
 */
export const REQUIRED_PRODUCTS_HEADERS = [
	"(Product) Group/Category",
	"Product name",
	"Internal Description",
] as const;

export interface ParsedProductRow {
	rowNumber: number;
	orgUnit: string | null;
	groupCategory: string | null;
	subCategory: string | null;
	productName: string;
	internalDescription: string | null;
	valueProposition: string | null;
	painPoint: string | null;
	markets: string | null;
	geographies: string | null;
	price: string | null;
	buyingTriggerSignals: string | null;
	landAnchor: string | null;
	expandAnchor: string | null;
	scaleAnchor: string | null;
	crossPortfolioConnection: string | null;
	/** Every column in the row, keyed by its header text — including any
	 * columns beyond the known template fields above, so nothing the user
	 * imported is silently dropped. */
	rawColumns: Record<string, string | null>;
}

export interface ProductsWorkbook {
	allSheetNames: string[];
	sheetName: string | null;
	rows: ParsedProductRow[] | null;
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
	return v && v.trim() ? v.trim() : null;
}

function normalizeHeader(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

interface HeaderRef {
	index: number;
	text: string;
}

/** Maps normalized header text -> the column index and original header text it was found at. */
function buildHeaderIndex(
	cellMap: Map<number, string>,
): Map<string, HeaderRef> {
	const byNormalized = new Map<string, HeaderRef>();
	cellMap.forEach((value, index) => {
		const text = value.trim();
		if (!text) return;
		const key = normalizeHeader(text);
		// First occurrence wins if a header is duplicated.
		if (!byNormalized.has(key)) byNormalized.set(key, { index, text });
	});
	return byNormalized;
}

function missingRequiredHeaders(headerIndex: Map<string, HeaderRef>): string[] {
	return REQUIRED_PRODUCTS_HEADERS.filter(
		(h) => !headerIndex.has(normalizeHeader(h)),
	);
}

/** How header-row-like a row looks, so a "missing column" error can point at
 * the row most likely to be the real header row rather than an arbitrary one. */
function countKnownHeaderMatches(headerIndex: Map<string, HeaderRef>): number {
	return EXPECTED_PRODUCTS_HEADERS.filter((h) =>
		headerIndex.has(normalizeHeader(h)),
	).length;
}

/**
 * Columns are matched by header text, so position doesn't matter — a
 * user-supplied sheet can reorder, drop, or add columns freely as long as
 * the required headers are present somewhere with the exact expected text.
 */
function parseProductsSheet(
	worksheetXml: string,
	sharedStrings: string[],
): ParsedProductRow[] {
	const doc = parseXmlDoc(worksheetXml);
	const rowNodes = Array.from(doc.getElementsByTagName("row"));
	const rows: ParsedProductRow[] = [];

	const rowsWithHeaderIndex = rowNodes.map((rowNode) => ({
		rowNode,
		headerIndex: buildHeaderIndex(parseRowCells(rowNode, sharedStrings)),
	}));
	if (rowsWithHeaderIndex.length === 0) {
		throw new Error('The "product-table" sheet has no rows.');
	}

	const headerRowEntry =
		rowsWithHeaderIndex.find(
			({ headerIndex }) => missingRequiredHeaders(headerIndex).length === 0,
		) ??
		rowsWithHeaderIndex.reduce((best, candidate) =>
			countKnownHeaderMatches(candidate.headerIndex) >
			countKnownHeaderMatches(best.headerIndex)
				? candidate
				: best,
		);

	const missing = missingRequiredHeaders(headerRowEntry.headerIndex);
	if (missing.length > 0) {
		throw new Error(
			`The "product-table" sheet is missing required column(s): ${missing.map((h) => `"${h}"`).join(", ")}.`,
		);
	}

	const headerIndex = headerRowEntry.headerIndex;

	const colOf = (headerName: string): number =>
		headerIndex.get(normalizeHeader(headerName))?.index ?? -1;
	const optional = (
		cellMap: Map<number, string>,
		headerName: string,
	): string | null => {
		const col = colOf(headerName);
		return col === -1 ? null : getCell(cellMap, col);
	};

	const productNameCol = colOf("Product name");
	const groupCategoryCol = colOf("(Product) Group/Category");

	// Only rows below the header can be data — a preamble/instructions row
	// above it could otherwise land in the same "Product name" column by
	// coincidence and get misread as a product.
	const headerRowPosition = rowNodes.indexOf(headerRowEntry.rowNode);
	const dataRowNodes = rowNodes.slice(headerRowPosition + 1);

	let rowCounter = 0;
	for (const rowNode of dataRowNodes) {
		const cellMap = parseRowCells(rowNode, sharedStrings);

		const productName = getCell(cellMap, productNameCol);
		if (!productName) continue;

		rowCounter += 1;

		const rawColumns: Record<string, string | null> = {};
		headerIndex.forEach(({ index, text }) => {
			rawColumns[text] = getCell(cellMap, index);
		});

		rows.push({
			rowNumber: rowCounter,
			orgUnit: optional(cellMap, "Org Unit"),
			groupCategory: getCell(cellMap, groupCategoryCol) ?? "",
			subCategory: optional(cellMap, "Sub-Category"),
			productName,
			internalDescription: optional(cellMap, "Internal Description"),
			valueProposition: optional(cellMap, "Product Value proposition"),
			painPoint: optional(
				cellMap,
				"Customer Pain point - resolved by the product/service",
			),
			markets: optional(cellMap, "Markets"),
			geographies: optional(cellMap, "Geographies"),
			price: optional(cellMap, "Price"),
			buyingTriggerSignals: optional(cellMap, "Buying Trigger Signals"),
			landAnchor: optional(cellMap, "Land Anchor"),
			expandAnchor: optional(cellMap, "Expand Anchor"),
			scaleAnchor: optional(cellMap, "Scale Anchor"),
			crossPortfolioConnection: optional(
				cellMap,
				"Cross-Portfolio Connection (Land → Expand → Scale)",
			),
			rawColumns,
		});
	}

	return rows;
}

export async function parseProductsWorkbook(
	file: File,
): Promise<ProductsWorkbook> {
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

	const norm = (s: string) => s.trim().toLowerCase();
	const targetSheet = sheetPaths.find((s) =>
		norm(s.sheetName).includes(PRODUCTS_SHEET_NAME_PATTERN),
	);

	if (!targetSheet) {
		return { allSheetNames, sheetName: null, rows: null };
	}

	const sharedStrings = readSharedStrings(
		(await zip.file("xl/sharedStrings.xml")?.async("string")) ?? null,
	);

	const worksheetXml = await zip
		.file(targetSheet.worksheetPath)
		?.async("string");
	if (!worksheetXml) {
		return { allSheetNames, sheetName: null, rows: null };
	}

	const rows = parseProductsSheet(worksheetXml, sharedStrings);
	return { allSheetNames, sheetName: targetSheet.sheetName, rows };
}
