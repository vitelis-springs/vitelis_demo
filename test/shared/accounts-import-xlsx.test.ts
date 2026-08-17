/**
 * @jest-environment jsdom
 */
import JSZip from "jszip";
import {
	EXPECTED_ACCOUNTS_HEADERS,
	parseAccountsWorkbook,
} from "../../src/shared/accounts-import-xlsx";

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
<sheets><sheet name="target-accounts" sheetId="1" r:id="rId1"/></sheets>
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
	// jsdom's File doesn't implement arrayBuffer(); parseAccountsWorkbook only
	// calls that one method, so a minimal stand-in is enough here.
	return { arrayBuffer: async () => buffer } as unknown as File;
}

describe("parseAccountsWorkbook", () => {
	it("parses rows when headers match the expected template exactly", async () => {
		const file = await buildWorkbookFile(
			[...EXPECTED_ACCOUNTS_HEADERS],
			[
				[
					"1",
					"Acme Corp",
					"ACME",
					"1010",
					"Acme Sub A, Acme Sub B",
					"https://acme.example",
					"https://acme.example/careers",
					"https://acme.example/investors",
				],
			],
		);

		const result = await parseAccountsWorkbook(file);

		expect(result.rows).not.toBeNull();
		expect(result.rows).toHaveLength(1);
		const row = result.rows?.[0];
		expect(row?.companyName).toBe("Acme Corp");
		expect(row?.subsidiaries).toEqual(["Acme Sub A", "Acme Sub B"]);
	});

	it("throws a descriptive error when a column has been reordered", async () => {
		const reordered: string[] = [...EXPECTED_ACCOUNTS_HEADERS];
		// Swap "GICS Code" (index 3) and "Subsidiaries" (index 4) — the exact
		// failure mode reported: same headers present, wrong column order.
		[reordered[3], reordered[4]] = [reordered[4]!, reordered[3]!];

		const file = await buildWorkbookFile(reordered, [
			[
				"1",
				"Acme Corp",
				"ACME",
				"Acme Sub A",
				"1010",
				"https://acme.example",
				"https://acme.example/careers",
				"https://acme.example/investors",
			],
		]);

		await expect(parseAccountsWorkbook(file)).rejects.toThrow(
			/columns don't match the expected template/,
		);
	});

	it("throws when a header column is missing/blank", async () => {
		const blanked: string[] = [...EXPECTED_ACCOUNTS_HEADERS];
		blanked[1] = "";

		const file = await buildWorkbookFile(blanked, []);

		await expect(parseAccountsWorkbook(file)).rejects.toThrow(
			/column B: expected "Company Name", found "\(empty\)"/,
		);
	});
});
