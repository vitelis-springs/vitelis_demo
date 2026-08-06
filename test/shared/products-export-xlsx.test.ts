/**
 * @jest-environment node
 *
 * The export exists to be read back. These tests pin the round trip rather than
 * the formatting: if the workbook stops parsing through the importer's own
 * rules, a reviewer's corrected spreadsheet becomes a dead end.
 *
 * Node rather than the project's default jsdom: under jsdom, module resolution
 * picks exceljs's browser dependency chain, which reaches an ESM-only build of
 * `uuid` that jest will not transform. The code under test is environment
 * agnostic — it builds a Blob either way.
 */
import ExcelJS from "exceljs";
import {
	buildDiscoveredProductsWorkbook,
	safeFileName,
} from "../../src/shared/products-export-xlsx";
import {
	EXPECTED_PRODUCTS_HEADERS,
	PRODUCTS_SHEET_NAME_PATTERN,
} from "../../src/shared/products-import-xlsx";

async function readBack(blob: Blob): Promise<ExcelJS.Workbook> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(await blob.arrayBuffer());
	return workbook;
}

/** The importer's own row rule: a numeric "#" in column A and a name in E. */
function parseProductRows(sheet: ExcelJS.Worksheet) {
	const rows: Array<{ rowNumber: number; productName: string }> = [];
	sheet.eachRow((row, index) => {
		if (index === 1) return;
		const counter = String(row.getCell(1).value ?? "");
		if (!/^\d+$/.test(counter)) return;
		const name = row.getCell(5).value;
		if (!name) return;
		rows.push({ rowNumber: Number(counter), productName: String(name) });
	});
	return rows;
}

const PRODUCTS = [
	{
		productName: "Cloud FinOps",
		groupCategory: "Cloud Solutions",
		subCategory: "Advisory",
		internalDescription: "Cost governance for public cloud",
		discovery: {
			confidence: 0.91,
			link_url: "https://www.trace3.com/cloud-solutions/finops",
			evidence_urls: [
				"https://www.trace3.com/cloud-solutions/finops",
				"https://www.trace3.com/how-we-help",
			],
			strategies: ["site_structure", "deep_research"],
			variants: ["Cloud FinOps Consulting"],
		},
	},
	{ productName: "Managed Network", groupCategory: "Managed Services" },
];

describe("buildDiscoveredProductsWorkbook", () => {
	it("writes a product-table sheet the importer can find", async () => {
		const workbook = await readBack(
			await buildDiscoveredProductsWorkbook({ products: PRODUCTS }),
		);

		const sheet = workbook.worksheets.find((w) =>
			w.name.trim().toLowerCase().includes(PRODUCTS_SHEET_NAME_PATTERN),
		);
		expect(sheet).toBeDefined();
	});

	it("uses exactly the headers the importer expects", async () => {
		const workbook = await readBack(
			await buildDiscoveredProductsWorkbook({ products: PRODUCTS }),
		);
		const sheet = workbook.getWorksheet(PRODUCTS_SHEET_NAME_PATTERN);

		const headers = (sheet?.getRow(1).values as unknown[])
			.slice(1)
			.map((v) => String(v));
		expect(headers).toEqual([...EXPECTED_PRODUCTS_HEADERS]);
	});

	it("numbers rows so the importer does not skip them", async () => {
		const workbook = await readBack(
			await buildDiscoveredProductsWorkbook({ products: PRODUCTS }),
		);
		const sheet = workbook.getWorksheet(PRODUCTS_SHEET_NAME_PATTERN);

		expect(parseProductRows(sheet as ExcelJS.Worksheet)).toEqual([
			{ rowNumber: 1, productName: "Cloud FinOps" },
			{ rowNumber: 2, productName: "Managed Network" },
		]);
	});

	it("keeps provenance out of the contract sheet", async () => {
		const workbook = await readBack(
			await buildDiscoveredProductsWorkbook({ products: PRODUCTS }),
		);

		const notes = workbook.getWorksheet("discovery-notes");
		expect(notes).toBeDefined();
		expect(notes?.getRow(2).getCell(2).value).toBe(0.91);
		expect(notes?.getRow(2).getCell(3).value).toBe(
			"https://www.trace3.com/cloud-solutions/finops",
		);
		// The own page is its own column; repeating it under "other evidence"
		// would read as corroboration that is not there.
		expect(notes?.getRow(2).getCell(4).value).toBe(
			"https://www.trace3.com/how-we-help",
		);
	});

	it("adds a rejected sheet only when the run excluded something", async () => {
		const without = await readBack(
			await buildDiscoveredProductsWorkbook({ products: PRODUCTS }),
		);
		expect(without.getWorksheet("rejected")).toBeUndefined();

		const withRejections = await readBack(
			await buildDiscoveredProductsWorkbook({
				products: PRODUCTS,
				rejected: [
					{ name: "2013 The Battleplan", reason: "links to a datasheet" },
				],
			}),
		);
		const sheet = withRejections.getWorksheet("rejected");
		expect(sheet?.getRow(2).getCell(1).value).toBe("2013 The Battleplan");
		expect(sheet?.getRow(2).getCell(2).value).toBe("links to a datasheet");
	});

	it("writes blanks, not the string 'null', for unfilled columns", async () => {
		const workbook = await readBack(
			await buildDiscoveredProductsWorkbook({
				products: [{ productName: "Managed Network", price: null }],
			}),
		);
		const sheet = workbook.getWorksheet(PRODUCTS_SHEET_NAME_PATTERN);

		// Column K is Price; an empty cell reads back as null or "", never "null".
		const price = sheet?.getRow(2).getCell(11).value;
		expect(price === null || price === "").toBe(true);
	});
});

describe("safeFileName", () => {
	it("strips characters Windows refuses and falls back when empty", () => {
		expect(safeFileName('Trace3 / "Gov"', "x")).toBe("Trace3 Gov");
		expect(safeFileName("   ", "discovered-products")).toBe(
			"discovered-products",
		);
	});
});
