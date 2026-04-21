export const KPI_SHEET_NAME_PATTERN = "kpi drivers";
export const RDP_SHEET_NAME_PATTERN = "raw data point";

export const KPI_FIELD_LABELS = {
	number: "#",
	name: "Metric (KPI Driver)",
	dependencies: "Dependencies",
	kpiCategory: "KPI Category",
	definition: "Definition (KPI)",
	keyQuestion: "Key question",
	qc1: "Quality Criteria (1 = Low)",
	qc2: "Quality Criteria (2 = Low-Medium)",
	qc3: "Quality Criteria (3 = Medium)",
	qc4: "Quality Criteria (4 = Medium-High)",
	qc5: "Quality Criteria (5 = High)",
} as const;

export const RDP_FIELD_LABELS = {
	number: "#",
	name: "Raw Data Point",
	rdpCategory: "RDP Category",
	definition: "Definition",
	outputVariable: "Output Variable",
} as const;

export type KpiFieldKey = keyof typeof KPI_FIELD_LABELS;
export type RdpFieldKey = keyof typeof RDP_FIELD_LABELS;

export interface ParsedSheet {
	sheetName: string;
	headers: string[];
	rows: Array<{
		rowNumber: number;
		values: (string | null)[];
	}>;
}

export interface KpiModelWorkbook {
	allSheets: ParsedSheet[];
	kpiSheet: ParsedSheet | null;
	rdpSheet: ParsedSheet | null;
}

// Normalized match helpers for field auto-detection
const KPI_NORM_MATCHES: Array<[string, KpiFieldKey]> = [
	["#", "number"],
	["metrickpidriver", "name"],
	["metric", "name"],
	["dependencies", "dependencies"],
	["kpicategory", "kpiCategory"],
	["definitionkpi", "definition"],
	["keyquestion", "keyQuestion"],
	["qualitycriteria1low", "qc1"],
	["qualitycriteria1", "qc1"],
	["qualitycriteria2lowmedium", "qc2"],
	["qualitycriteria2", "qc2"],
	["qualitycriteria3medium", "qc3"],
	["qualitycriteria3", "qc3"],
	["qualitycriteria4mediumhigh", "qc4"],
	["qualitycriteria4", "qc4"],
	["qualitycriteria5high", "qc5"],
	["qualitycriteria5", "qc5"],
];

const RDP_NORM_MATCHES: Array<[string, RdpFieldKey]> = [
	["#", "number"],
	["rawdatapoint", "name"],
	["rdpcategory", "rdpCategory"],
	["definition", "definition"],
	["outputvariable", "outputVariable"],
];

function normalizeForMatch(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9#]/g, "");
}

function matchKpiFieldKey(header: string): KpiFieldKey | null {
	const norm = normalizeForMatch(header);
	for (const [pattern, key] of KPI_NORM_MATCHES) {
		if (norm === normalizeForMatch(pattern)) return key;
	}
	return null;
}

function matchRdpFieldKey(header: string): RdpFieldKey | null {
	const norm = normalizeForMatch(header);
	for (const [pattern, key] of RDP_NORM_MATCHES) {
		if (norm === normalizeForMatch(pattern)) return key;
	}
	return null;
}

export function detectKpiFieldMapping(
	headers: string[],
): Map<KpiFieldKey, number> {
	const mapping = new Map<KpiFieldKey, number>();
	headers.forEach((header, index) => {
		const key = matchKpiFieldKey(header);
		if (key && !mapping.has(key)) mapping.set(key, index);
	});
	return mapping;
}

export function detectRdpFieldMapping(
	headers: string[],
): Map<RdpFieldKey, number> {
	const mapping = new Map<RdpFieldKey, number>();
	headers.forEach((header, index) => {
		const key = matchRdpFieldKey(header);
		if (key && !mapping.has(key)) mapping.set(key, index);
	});
	return mapping;
}

// ---- Low-level XLSX XML utilities ----

// includesYear = true  → format shows year (e.g. mm/dd/yyyy) → return M/D/YY
// includesYear = false → format hides year (e.g. m, d)       → return M/D
interface DateFmtInfo {
	includesYear: boolean;
}

const BUILT_IN_DATE_FMTS: Record<number, DateFmtInfo> = {
	14: { includesYear: true }, // m/d/yy
	15: { includesYear: true }, // d-mmm-yy
	16: { includesYear: false }, // d-mmm
	17: { includesYear: true }, // mmm-yy
	22: { includesYear: true }, // m/d/yy h:mm
};

function classifyDateFormatCode(code: string): DateFmtInfo | null {
	const clean = code
		.replace(/"[^"]*"/g, "")
		.replace(/\[[^\]]*\]/g, "")
		.toLowerCase();
	const hasYear = /y/.test(clean);
	const isDate = hasYear || (/d/.test(clean) && /m/.test(clean));
	if (!isDate) return null;
	return { includesYear: hasYear };
}

function parseDateStyleMap(stylesXml: string | null): Map<number, DateFmtInfo> {
	if (!stylesXml) return new Map();
	try {
		const doc = parseXml(stylesXml);
		const customFmts = new Map<number, string>();
		Array.from(doc.getElementsByTagName("numFmt")).forEach((el) => {
			const id = Number(el.getAttribute("numFmtId") ?? "-1");
			const code = el.getAttribute("formatCode") ?? "";
			if (id >= 0) customFmts.set(id, code);
		});

		const result = new Map<number, DateFmtInfo>();
		const cellXfsEl = doc.getElementsByTagName("cellXfs")[0];
		if (!cellXfsEl) return result;

		Array.from(cellXfsEl.getElementsByTagName("xf")).forEach((xf, index) => {
			const numFmtId = Number(xf.getAttribute("numFmtId") ?? "0");
			const builtIn = BUILT_IN_DATE_FMTS[numFmtId];
			if (builtIn) {
				result.set(index, builtIn);
			} else if (numFmtId >= 164) {
				const info = classifyDateFormatCode(customFmts.get(numFmtId) ?? "");
				if (info) result.set(index, info);
			}
		});
		return result;
	} catch {
		return new Map();
	}
}

// Excel serials below this threshold are dates before year 2000 —
// in practice these are small RDP numbers accidentally formatted as dates, not real dates.
const MIN_DATE_SERIAL = 36526; // Jan 1, 2000

function excelSerialToDepString(serial: number, includesYear: boolean): string {
	if (serial < MIN_DATE_SERIAL) {
		// Treat as a plain number (e.g. RDP #5 in a date-formatted cell)
		return String(serial);
	}
	const ms = (serial - 25569) * 86400000;
	const d = new Date(ms);
	const month = d.getUTCMonth() + 1;
	const day = d.getUTCDate();
	if (includesYear) {
		return `${month}/${day}/${d.getUTCFullYear() % 100}`;
	}
	return `${month}/${day}`;
}

function parseXml(xmlText: string): Document {
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
	const doc = parseXml(xml);
	return Array.from(doc.getElementsByTagName("si")).map((item) =>
		Array.from(item.getElementsByTagName("t"))
			.map((node) => node.textContent ?? "")
			.join(""),
	);
}

function readCellValue(
	cell: Element,
	sharedStrings: string[],
	dateStyleMap: Map<number, DateFmtInfo>,
): string {
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
	// Numeric cell — check if it has a date format applied
	if (!type && rawValue && dateStyleMap.size > 0) {
		const styleIndex = Number(cell.getAttribute("s") ?? "-1");
		const dateFmt = dateStyleMap.get(styleIndex);
		if (dateFmt) {
			const serial = Number(rawValue);
			if (Number.isFinite(serial) && serial > 0) {
				return excelSerialToDepString(serial, dateFmt.includesYear);
			}
		}
	}
	return rawValue;
}

function resolveAllWorksheetPaths(
	workbookXml: string,
	workbookRelsXml: string,
): Array<{ sheetName: string; worksheetPath: string }> {
	const workbookDoc = parseXml(workbookXml);
	const relsDoc = parseXml(workbookRelsXml);

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

function parseWorksheet(
	sheetName: string,
	worksheetXml: string,
	sharedStrings: string[],
	dateStyleMap: Map<number, DateFmtInfo>,
): ParsedSheet | null {
	const doc = parseXml(worksheetXml);
	const rowNodes = Array.from(doc.getElementsByTagName("row"));
	if (!rowNodes.length) return null;

	const rowMaps = rowNodes.map((rowNode) => {
		const cells = Array.from(rowNode.getElementsByTagName("c"));
		const cellMap = new Map<number, string>();
		cells.forEach((cell) => {
			const ref = cell.getAttribute("r");
			if (!ref) return;
			cellMap.set(
				columnRefToIndex(ref),
				readCellValue(cell, sharedStrings, dateStyleMap),
			);
		});
		return {
			rowNumber: Number(rowNode.getAttribute("r") ?? "0") || 0,
			cellMap,
		};
	});

	const headerRow = rowMaps[0];
	if (!headerRow) return null;

	const maxColIndex = Math.max(
		...rowMaps.flatMap((r) => Array.from(r.cellMap.keys())),
		0,
	);

	const headers: string[] = [];
	for (let i = 0; i <= maxColIndex; i++) {
		headers.push(headerRow.cellMap.get(i)?.trim() ?? "");
	}

	const rows = rowMaps
		.slice(1)
		.map(({ rowNumber, cellMap }) => {
			const values: (string | null)[] = headers.map((_, i) => {
				const v = cellMap.get(i);
				return v !== undefined && v.trim() !== "" ? v.trim() : null;
			});
			return { rowNumber, values };
		})
		.filter((row) => row.values.some((value) => value !== null));

	return { sheetName, headers, rows };
}

export async function parseKpiModelWorkbook(
	file: File,
): Promise<KpiModelWorkbook> {
	const JSZip = (await import("jszip")).default;
	const zip = await JSZip.loadAsync(await file.arrayBuffer());

	const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
	const workbookRelsXml = await zip
		.file("xl/_rels/workbook.xml.rels")
		?.async("string");

	if (!workbookXml || !workbookRelsXml) {
		throw new Error("Invalid XLSX file");
	}

	const sheetPaths = resolveAllWorksheetPaths(workbookXml, workbookRelsXml);
	const sharedStrings = readSharedStrings(
		(await zip.file("xl/sharedStrings.xml")?.async("string")) ?? null,
	);

	const dateStyleMap = parseDateStyleMap(
		(await zip.file("xl/styles.xml")?.async("string")) ?? null,
	);

	const allSheets: ParsedSheet[] = [];
	for (const { sheetName, worksheetPath } of sheetPaths) {
		const worksheetXml = await zip.file(worksheetPath)?.async("string");
		if (!worksheetXml) continue;
		const sheet = parseWorksheet(
			sheetName,
			worksheetXml,
			sharedStrings,
			dateStyleMap,
		);
		if (sheet) allSheets.push(sheet);
	}

	const norm = (s: string) => s.trim().toLowerCase();
	const kpiSheet =
		allSheets.find((s) => norm(s.sheetName).includes(KPI_SHEET_NAME_PATTERN)) ??
		null;
	const rdpSheet =
		allSheets.find((s) => norm(s.sheetName).includes(RDP_SHEET_NAME_PATTERN)) ??
		null;

	return { allSheets, kpiSheet, rdpSheet };
}
