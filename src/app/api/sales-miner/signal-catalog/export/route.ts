import { type NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import {
	GICS_INDUSTRY_GROUP_CODE_MAP,
	GICS_ORDERED_GROUPS,
	GICS_GROUP_TO_SECTOR,
} from "../../../../../shared/signal-model-xlsx";

const ORDERED_GICS_CODES = GICS_ORDERED_GROUPS.map(
	(g) => GICS_INDUSTRY_GROUP_CODE_MAP[g]!,
);

// ExcelJS columns (1-based): A=1..H=8 (fixed), I=9..AG=33 (GICS)
const FIRST_FIXED_COL = 1; // A
const LAST_FIXED_COL = 8; // H
const FIRST_GICS_COL = 9; // I

// ARGB colors
const BG_FIXED = "FF1F3864"; // dark navy — fixed header cols
const BG_SECTOR = "FF2E75B6"; // medium blue — GICS sector row
const BG_GROUP = "FFD6E4F7"; // light blue — GICS group row
const FG_WHITE = "FFFFFFFF";
const FG_DARK = "FF1F1F1F";

interface SectorSpan {
	sector: string;
	startCol: number;
	endCol: number;
}

function buildSectorSpans(): SectorSpan[] {
	const spans: SectorSpan[] = [];
	let current = "";
	let startCol = FIRST_GICS_COL;

	for (let i = 0; i < GICS_ORDERED_GROUPS.length; i++) {
		const group = GICS_ORDERED_GROUPS[i]!;
		const sector = GICS_GROUP_TO_SECTOR[group] ?? group;
		const col = FIRST_GICS_COL + i;

		if (sector !== current) {
			if (current) spans.push({ sector: current, startCol, endCol: col - 1 });
			current = sector;
			startCol = col;
		}
	}
	if (current) {
		spans.push({
			sector: current,
			startCol,
			endCol: FIRST_GICS_COL + GICS_ORDERED_GROUPS.length - 1,
		});
	}
	return spans;
}

function styleHeader(
	cell: ExcelJS.Cell,
	bgArgb: string,
	fgArgb: string,
	bold: boolean,
	hAlign: ExcelJS.Alignment["horizontal"] = "center",
	wrap = false,
) {
	cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
	cell.font = { color: { argb: fgArgb }, bold, size: 10, name: "Calibri" };
	cell.alignment = { horizontal: hAlign, vertical: "middle", wrapText: wrap };
	cell.border = {
		top: { style: "thin" },
		left: { style: "thin" },
		bottom: { style: "thin" },
		right: { style: "thin" },
	};
}

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const [categories, subcategories] = await Promise.all([
		prisma.smSignalCategory.findMany({ where: { is_active: true } }),
		prisma.smSignalSubcategory.findMany({
			where: { is_active: true },
			include: {
				current_version: true,
				industries: { include: { current_instruction: true } },
			},
		}),
	]);

	const catMap = new Map(categories.map((c) => [c.id, c]));
	const sectorSpans = buildSectorSpans();

	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("Signal Model");

	// --- Column widths ---
	const fixedWidths = [10, 22, 7, 10, 16, 28, 50, 50];
	fixedWidths.forEach((w, i) => {
		ws.getColumn(FIRST_FIXED_COL + i).width = w;
	});
	for (let i = 0; i < GICS_ORDERED_GROUPS.length; i++) {
		ws.getColumn(FIRST_GICS_COL + i).width = 80;
	}

	// --- Row heights ---
	ws.getRow(1).height = 40;
	ws.getRow(2).height = 40;

	// ---------------------------------------------------------------
	// Write header cell values
	// ---------------------------------------------------------------
	const FIXED_LABELS = [
		"Cat #",
		"L1 Category",
		"Tier",
		"Sub #",
		"Signal Class",
		"Generalized Signal (L3)",
		"Universal Definition",
		"Backbone Prompt Instruction",
	];

	// Row 2: fixed labels (parser reads h2 for fixed headers)
	for (let i = 0; i < FIXED_LABELS.length; i++) {
		ws.getCell(2, FIRST_FIXED_COL + i).value = FIXED_LABELS[i]!;
	}

	// Row 1: sector names at startCol of each sector span
	for (const span of sectorSpans) {
		ws.getCell(1, span.startCol).value = span.sector;
	}

	// Row 2: group names (one col per group)
	for (let i = 0; i < GICS_ORDERED_GROUPS.length; i++) {
		ws.getCell(2, FIRST_GICS_COL + i).value = GICS_ORDERED_GROUPS[i]!;
	}

	// ---------------------------------------------------------------
	// Merges — fixed cols A-H are NOT merged vertically so row 2 values stay accessible
	// ---------------------------------------------------------------

	// GICS sectors (row 1): merge horizontally across groups
	for (const span of sectorSpans) {
		if (span.endCol > span.startCol) {
			ws.mergeCells(1, span.startCol, 1, span.endCol);
		}
	}

	// ---------------------------------------------------------------
	// Style header cells
	// ---------------------------------------------------------------

	// Fixed cols row 1 (empty background, no merge)
	for (let col = FIRST_FIXED_COL; col <= LAST_FIXED_COL; col++) {
		styleHeader(ws.getCell(1, col), BG_FIXED, FG_WHITE, false, "center");
	}

	// Fixed cols row 2 (labels)
	for (let col = FIRST_FIXED_COL; col <= LAST_FIXED_COL; col++) {
		styleHeader(
			ws.getCell(2, col),
			BG_FIXED,
			FG_WHITE,
			true,
			"center",
			col >= LAST_FIXED_COL - 1,
		);
	}

	// Sector cells (row 1, GICS area)
	for (const span of sectorSpans) {
		styleHeader(
			ws.getCell(1, span.startCol),
			BG_SECTOR,
			FG_WHITE,
			true,
			"center",
		);
	}

	// Group cells (row 2, GICS area)
	for (let i = 0; i < GICS_ORDERED_GROUPS.length; i++) {
		styleHeader(
			ws.getCell(2, FIRST_GICS_COL + i),
			BG_GROUP,
			FG_DARK,
			true,
			"center",
			true,
		);
	}

	// ---------------------------------------------------------------
	// Data rows (start at row 3)
	// ---------------------------------------------------------------
	const sorted = [...subcategories].sort((a, b) => {
		const catA = catMap.get(a.sm_signal_category_id ?? BigInt(0));
		const catB = catMap.get(b.sm_signal_category_id ?? BigInt(0));
		const codeA = catA?.external_id ?? "";
		const codeB = catB?.external_id ?? "";
		if (codeA !== codeB) return codeA.localeCompare(codeB);
		return a.external_id.localeCompare(b.external_id);
	});

	const TOTAL_COLS = LAST_FIXED_COL + GICS_ORDERED_GROUPS.length;

	for (let ri = 0; ri < sorted.length; ri++) {
		const sub = sorted[ri]!;
		const cat = catMap.get(sub.sm_signal_category_id ?? BigInt(0));
		const industryByCode = new Map(
			sub.industries.map((ind) => [ind.gics_code, ind]),
		);
		const rowBg = ri % 2 === 0 ? "FFFFFFFF" : "FFF5F9FF";

		const values: (string | number | null)[] = [
			cat?.external_id ?? "",
			cat?.name ?? "",
			cat?.tier ?? 1,
			sub.external_id,
			sub.signal_class,
			sub.name,
			sub.current_version?.definition ?? "",
			sub.current_version?.prompt ?? null,
		];
		for (const gicsCode of ORDERED_GICS_CODES) {
			const ind = industryByCode.get(gicsCode);
			values.push(ind?.current_instruction?.instruction ?? null);
		}

		const exRow = ws.addRow(values);

		for (let c = 1; c <= TOTAL_COLS; c++) {
			const cell = exRow.getCell(c);
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: rowBg },
			};
			cell.font = { size: 10, name: "Calibri", color: { argb: FG_DARK } };
			const isGics = c >= FIRST_GICS_COL;
			const isLong = c === LAST_FIXED_COL - 1 || c === LAST_FIXED_COL || isGics;
			cell.alignment = {
				horizontal: isGics ? "left" : "left",
				vertical: "top",
				wrapText: isLong,
			};
		}
	}

	// Freeze header rows + first fixed cols (B–E)
	ws.views = [{ state: "frozen", xSplit: FIRST_FIXED_COL + 3, ySplit: 2 }];

	const buffer = await wb.xlsx.writeBuffer();

	return new NextResponse(buffer, {
		status: 200,
		headers: {
			"Content-Type":
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition": `attachment; filename="signal-model-export.xlsx"`,
		},
	});
}
