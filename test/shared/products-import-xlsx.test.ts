/**
 * @jest-environment jsdom
 */
import JSZip from "jszip";
import {
	EXPECTED_PRODUCTS_HEADERS,
	parseProductsWorkbook,
} from "../../src/shared/products-import-xlsx";

function cellXml(colIndex: number, rowNumber: number, value: string): string {
	const colLetter = String.fromCharCode(65 + colIndex);
	const escaped = value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
	return `<c r="${colLetter}${rowNumber}" t="inlineStr"><is><t>${escaped}</t></is></c>`;
}

function rowXml(rowNumber: number, values: string[]): string {
	const cells = values.map((v, i) => cellXml(i, rowNumber, v)).join("");
	return `<row r="${rowNumber}">${cells}</row>`;
}

async function buildWorkbookFile(
	headerRow: string[],
	dataRows: string[][],
): Promise<File> {
	const zip = new JSZip();
	zip.file(
		"xl/workbook.xml",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="product-table" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
	);
	zip.file(
		"xl/_rels/workbook.xml.rels",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
	);

	const rows = [
		rowXml(1, headerRow),
		...dataRows.map((row, i) => rowXml(i + 2, row)),
	].join("");
	zip.file(
		"xl/worksheets/sheet1.xml",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows}</sheetData>
</worksheet>`,
	);

	const buffer = await zip.generateAsync({ type: "arraybuffer" });
	// jsdom's File doesn't implement arrayBuffer(); parseProductsWorkbook only
	// calls that one method, so a minimal stand-in is enough here.
	return { arrayBuffer: async () => buffer } as unknown as File;
}

/** Like buildWorkbookFile, but lets the caller place the header row anywhere
 * — e.g. after a preamble/instructions row — instead of always at row 1. */
async function buildWorkbookFileWithRows(allRows: string[][]): Promise<File> {
	const zip = new JSZip();
	zip.file(
		"xl/workbook.xml",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="product-table" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
	);
	zip.file(
		"xl/_rels/workbook.xml.rels",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
	);

	const rows = allRows.map((row, i) => rowXml(i + 1, row)).join("");
	zip.file(
		"xl/worksheets/sheet1.xml",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows}</sheetData>
</worksheet>`,
	);

	const buffer = await zip.generateAsync({ type: "arraybuffer" });
	return { arrayBuffer: async () => buffer } as unknown as File;
}

describe("parseProductsWorkbook", () => {
	it("parses rows when headers match the full expected template", async () => {
		const file = await buildWorkbookFile(
			[...EXPECTED_PRODUCTS_HEADERS],
			[
				[
					"1",
					"Org A",
					"Group A",
					"Sub A",
					"Widget",
					"desc",
					"prop",
					"pain",
					"markets",
					"geo",
					"100",
					"signal",
					"land",
					"expand",
					"scale",
					"cross",
				],
			],
		);

		const result = await parseProductsWorkbook(file);

		expect(result.rows).not.toBeNull();
		expect(result.rows).toHaveLength(1);
		const row = result.rows?.[0];
		expect(row?.productName).toBe("Widget");
		expect(row?.groupCategory).toBe("Group A");
		expect(row?.rawColumns).toEqual({
			"#": "1",
			"Org Unit": "Org A",
			"(Product) Group/Category": "Group A",
			"Sub-Category": "Sub A",
			"Product name": "Widget",
			"Internal Description": "desc",
			"Product Value proposition": "prop",
			"Customer Pain point - resolved by the product/service": "pain",
			Markets: "markets",
			Geographies: "geo",
			Price: "100",
			"Buying Trigger Signals": "signal",
			"Land Anchor": "land",
			"Expand Anchor": "expand",
			"Scale Anchor": "scale",
			"Cross-Portfolio Connection (Land → Expand → Scale)": "cross",
		});
	});

	it("parses correctly when the three required columns are reordered", async () => {
		// "Product name" and "Sub-Category" swapped relative to the template —
		// the exact scenario the header-name lookup is meant to tolerate.
		const reordered: string[] = [...EXPECTED_PRODUCTS_HEADERS];
		[reordered[3], reordered[4]] = [reordered[4]!, reordered[3]!];

		const file = await buildWorkbookFile(reordered, [
			[
				"1",
				"Org A",
				"Group A",
				"Widget",
				"Sub A",
				"desc",
				"prop",
				"pain",
				"markets",
				"geo",
				"100",
				"signal",
				"land",
				"expand",
				"scale",
				"cross",
			],
		]);

		const result = await parseProductsWorkbook(file);

		expect(result.rows).toHaveLength(1);
		const row = result.rows?.[0];
		expect(row?.productName).toBe("Widget");
		expect(row?.subCategory).toBe("Sub A");
	});

	it("imports rows when only the required columns are present", async () => {
		const file = await buildWorkbookFile(
			["(Product) Group/Category", "Product name", "Internal Description"],
			[["Group A", "Widget", "desc"]],
		);

		const result = await parseProductsWorkbook(file);

		expect(result.rows).toHaveLength(1);
		const row = result.rows?.[0];
		expect(row?.productName).toBe("Widget");
		expect(row?.groupCategory).toBe("Group A");
		expect(row?.internalDescription).toBe("desc");
		expect(row?.subCategory).toBeNull();
		expect(row?.price).toBeNull();
		expect(row?.orgUnit).toBeNull();
	});

	it("throws naming exactly the one missing required column", async () => {
		const file = await buildWorkbookFile(
			["(Product) Group/Category", "Product name"],
			[["Group A", "Widget"]],
		);

		await expect(parseProductsWorkbook(file)).rejects.toThrow(
			'missing required column(s): "Internal Description".',
		);
	});

	it("throws naming only the missing columns, not ones already present", async () => {
		const file = await buildWorkbookFile(
			["(Product) Group/Category", "Internal Description"],
			[["Group A", "desc"]],
		);

		await expect(parseProductsWorkbook(file)).rejects.toThrow(
			'missing required column(s): "Product name".',
		);
	});

	it("ignores a preamble row above the header even if it has text in the Product name column", async () => {
		// Row 1: instructions/preamble — happens to have non-blank text in the
		// same column position "Product name" ends up at in row 2's header.
		// Row 2: the real header. Row 3: the real data.
		const file = await buildWorkbookFileWithRows([
			["Instructions", "Fill in your products below", ""],
			["(Product) Group/Category", "Product name", "Internal Description"],
			["Group A", "Widget", "desc"],
		]);

		const result = await parseProductsWorkbook(file);

		expect(result.rows).toHaveLength(1);
		expect(result.rows?.[0]?.productName).toBe("Widget");
	});

	it("captures columns beyond the known template fields in rawColumns", async () => {
		const headerRow = [...EXPECTED_PRODUCTS_HEADERS, "Owner Team"];
		const file = await buildWorkbookFile(headerRow, [
			[
				"1",
				"Org A",
				"Group A",
				"Sub A",
				"Widget",
				"desc",
				"prop",
				"pain",
				"markets",
				"geo",
				"100",
				"signal",
				"land",
				"expand",
				"scale",
				"cross",
				"Growth Team",
			],
		]);

		const result = await parseProductsWorkbook(file);

		expect(result.rows?.[0]?.rawColumns["Owner Team"]).toBe("Growth Team");
	});
});
