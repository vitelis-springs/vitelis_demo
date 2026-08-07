/**
 * Write a discovered-product list as the same workbook the importer reads.
 *
 * The headers and sheet name come from `products-import-xlsx` rather than being
 * repeated here, so an export always round-trips back through Import products.
 * That matters more than it looks: the review modal is where a human corrects a
 * run, and a spreadsheet they can hand to a colleague, edit, and feed back in is
 * the difference between a review step and a dead end.
 *
 * Provenance travels in its own sheet. `product-table` has to stay exactly the
 * 16-column contract for the parser to accept it, and the parser ignores every
 * other sheet — so confidence, evidence and the rejected list ride alongside
 * without touching the contract.
 */
import {
	EXPECTED_PRODUCTS_HEADERS,
	PRODUCTS_SHEET_NAME_PATTERN,
} from "./products-import-xlsx";

const NOTES_SHEET_NAME = "discovery-notes";
const REJECTED_SHEET_NAME = "rejected";

export const XLSX_MIME =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** The 16-column contract's fields, in the order the headers declare them. */
export interface ExportableProduct {
	orgUnit?: string | null;
	groupCategory?: string | null;
	subCategory?: string | null;
	productName: string;
	internalDescription?: string | null;
	valueProposition?: string | null;
	painPoint?: string | null;
	markets?: string | null;
	geographies?: string | null;
	price?: string | null;
	buyingTriggerSignals?: string | null;
	landAnchor?: string | null;
	expandAnchor?: string | null;
	scaleAnchor?: string | null;
	crossPortfolioConnection?: string | null;
	discovery?: {
		confidence?: number;
		evidence_urls?: string[];
		link_url?: string | null;
		strategies?: string[];
		variants?: string[];
		retrieved_at?: string | null;
		unfiled?: boolean;
	} | null;
}

export interface ExportableRejection {
	name: string;
	reason: string;
}

const NOTES_HEADERS = [
	"Product name",
	"Confidence",
	"Own page",
	"Other evidence",
	"Found by",
	"Also called",
	"Unfiled",
	"Retrieved at",
] as const;

const REJECTED_HEADERS = ["Excluded product", "Why it was excluded"] as const;

function text(value: unknown): string {
	if (value == null) return "";
	return typeof value === "string" ? value : String(value);
}

/** Strip the characters Windows refuses in a filename. */
export function safeFileName(name: string, fallback: string): string {
	const cleaned = name
		.trim()
		.replace(/[\\/:*?"<>|]+/g, "")
		.replace(/\s+/g, " ")
		.slice(0, 100);
	return cleaned || fallback;
}

export async function buildDiscoveredProductsWorkbook(options: {
	products: ExportableProduct[];
	rejected?: ExportableRejection[];
}): Promise<Blob> {
	const { products, rejected = [] } = options;

	const ExcelJSImport = await import("exceljs");
	const WorkbookCtor =
		ExcelJSImport.Workbook ?? ExcelJSImport.default?.Workbook;
	if (!WorkbookCtor) {
		throw new Error("exceljs Workbook constructor not available");
	}
	const workbook = new WorkbookCtor();

	// --- product-table: the importable contract, byte-for-byte -------------
	const sheet = workbook.addWorksheet(PRODUCTS_SHEET_NAME_PATTERN);
	sheet.getColumn(1).width = 6;
	for (let col = 2; col <= EXPECTED_PRODUCTS_HEADERS.length; col++) {
		sheet.getColumn(col).width = 28;
	}
	const header = sheet.getRow(1);
	EXPECTED_PRODUCTS_HEADERS.forEach((label, index) => {
		const cell = header.getCell(index + 1);
		cell.value = label;
		cell.font = { bold: true };
	});
	// The parser keys data rows off a numeric "#", so the counter is structural
	// rather than decorative — a row without it is skipped on the way back in.
	products.forEach((product, index) => {
		sheet.addRow([
			index + 1,
			text(product.orgUnit),
			text(product.groupCategory),
			text(product.subCategory),
			text(product.productName),
			text(product.internalDescription),
			text(product.valueProposition),
			text(product.painPoint),
			text(product.markets),
			text(product.geographies),
			text(product.price),
			text(product.buyingTriggerSignals),
			text(product.landAnchor),
			text(product.expandAnchor),
			text(product.scaleAnchor),
			text(product.crossPortfolioConnection),
		]);
	});

	// --- discovery-notes: how each row was arrived at ----------------------
	const notes = workbook.addWorksheet(NOTES_SHEET_NAME);
	notes.getColumn(1).width = 40;
	notes.getColumn(2).width = 12;
	notes.getColumn(3).width = 52;
	notes.getColumn(4).width = 52;
	notes.getColumn(5).width = 26;
	notes.getColumn(6).width = 40;
	notes.getColumn(7).width = 10;
	notes.getColumn(8).width = 22;
	const notesHeader = notes.getRow(1);
	NOTES_HEADERS.forEach((label, index) => {
		const cell = notesHeader.getCell(index + 1);
		cell.value = label;
		cell.font = { bold: true };
	});
	products.forEach((product) => {
		const d = product.discovery;
		const own = d?.link_url ?? "";
		// The own page is listed separately, so repeating it here would read as
		// corroboration that is not there.
		const others = (d?.evidence_urls ?? []).filter((url) => url && url !== own);
		notes.addRow([
			text(product.productName),
			d?.confidence ?? "",
			own,
			others.join("\n"),
			(d?.strategies ?? []).join(", "),
			(d?.variants ?? []).join("\n"),
			d?.unfiled ? "yes" : "",
			text(d?.retrieved_at),
		]);
	});

	// --- rejected: only when the run actually excluded something -----------
	if (rejected.length > 0) {
		const sheetRejected = workbook.addWorksheet(REJECTED_SHEET_NAME);
		sheetRejected.getColumn(1).width = 44;
		sheetRejected.getColumn(2).width = 80;
		const rejectedHeader = sheetRejected.getRow(1);
		REJECTED_HEADERS.forEach((label, index) => {
			const cell = rejectedHeader.getCell(index + 1);
			cell.value = label;
			cell.font = { bold: true };
		});
		rejected.forEach((row) => {
			sheetRejected.addRow([text(row.name), text(row.reason)]);
		});
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return new Blob([buffer], { type: XLSX_MIME });
}
