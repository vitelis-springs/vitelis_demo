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
}

export interface ProductsWorkbook {
	sheetName: string;
	rows: ParsedProductRow[];
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

function parseProductsSheet(
	worksheetXml: string,
	sharedStrings: string[],
): ParsedProductRow[] {
	const doc = parseXmlDoc(worksheetXml);
	const rowNodes = Array.from(doc.getElementsByTagName("row"));
	const rows: ParsedProductRow[] = [];

	for (const rowNode of rowNodes) {
		const cellMap = parseRowCells(rowNode, sharedStrings);

		// The template has a numeric "#" column for every real data row;
		// header and description rows leave it blank or non-numeric.
		const rowIndexRaw = getCell(cellMap, 0);
		if (!rowIndexRaw || !/^\d+$/.test(rowIndexRaw)) continue;

		const productName = getCell(cellMap, 4);
		if (!productName) continue;

		rows.push({
			rowNumber: Number(rowIndexRaw),
			orgUnit: getCell(cellMap, 1),
			groupCategory: getCell(cellMap, 2),
			subCategory: getCell(cellMap, 3),
			productName,
			internalDescription: getCell(cellMap, 5),
			valueProposition: getCell(cellMap, 6),
			painPoint: getCell(cellMap, 7),
			markets: getCell(cellMap, 8),
			geographies: getCell(cellMap, 9),
			price: getCell(cellMap, 10),
			buyingTriggerSignals: getCell(cellMap, 11),
			landAnchor: getCell(cellMap, 12),
			expandAnchor: getCell(cellMap, 13),
			scaleAnchor: getCell(cellMap, 14),
			crossPortfolioConnection: getCell(cellMap, 15),
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
	const firstSheet = sheetPaths[0];
	if (!firstSheet) throw new Error("No sheets found in workbook");

	const sharedStrings = readSharedStrings(
		(await zip.file("xl/sharedStrings.xml")?.async("string")) ?? null,
	);

	const worksheetXml = await zip
		.file(firstSheet.worksheetPath)
		?.async("string");
	if (!worksheetXml) throw new Error("Could not read worksheet");

	const rows = parseProductsSheet(worksheetXml, sharedStrings);
	return { sheetName: firstSheet.sheetName, rows };
}
